import React, { useState, useEffect } from 'react'
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { Link } from 'react-router-dom';


const NavBar = () => {

  const [token, setToken] = useState(localStorage.getItem('token') || sessionStorage.getItem('token'));
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail'));
  const [userName, setUserName] = useState(localStorage.getItem('userName') || sessionStorage.getItem('userName'));
  const [userHospital, setUserHospital] = useState(localStorage.getItem('userHospital') || sessionStorage.getItem('userHospital'));


  // Update token state when storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem('token') || sessionStorage.getItem('token'));
      setUserEmail(localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail'));
      setUserName(localStorage.getItem('userName') || sessionStorage.getItem('userName'));
      setUserHospital(localStorage.getItem('userHospital') || sessionStorage.getItem('userHospital'));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

    window.addEventListener('userHospitalUpdated', (event) => {
      setUserHospital(event.detail);
    });


  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    sessionStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    sessionStorage.removeItem('userName');
    localStorage.removeItem('userHospital');
    sessionStorage.removeItem('userHospital');
    setToken(null);
    setUserEmail(null);
    setUserName(null);
    setUserHospital(null);
    window.location.reload()
  }

  return (
    <Box sx={{ flexGrow: 1, height: '64px', minHeight: '64px', maxHeight: '64px', overflow: 'hidden' }}>
      <AppBar position="static" sx={{ height: '64px' }}>
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mx: 0 }}
          >
            <SmartToyIcon />
          </IconButton>
          <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
            <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>Medical AI Assistant</Link>
          </Typography>
          {token ? (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {/* <Typography variant="body1" sx={{ marginRight: 2 }}>
                {userEmail}
              </Typography>
              <Typography variant="body1" sx={{ marginRight: 2 }}>
                {userName}
              </Typography> */}
              <div style={{ display: 'flex', flexDirection: 'column', marginRight: '16px', textAlign: 'right' }}>
              {/* <Typography variant="body1" color="">{userName}</Typography>
              <Typography variant="body2">{userEmail}</Typography>
              <Typography variant="body2" color="textSecondary">{userHospital}</Typography> */}
              <Typography sx={{ fontSize: '16px' }}>{userName}</Typography>
              {/* <Typography sx={{ fontSize: '12px' }}>{userEmail}</Typography> */}
              <Typography sx={{ fontSize: '10px' }}>{userHospital?userHospital:""}</Typography>
              
    </div>
              <Button color="inherit" onClick={handleLogout}>Sign Out</Button>
            </div>
          ) : (
            <div className="d-flex">
              <Link to="/signin" style={{ color: 'white', textDecoration: 'none' }}>
                <Button color="inherit" >Sign In</Button>
              </Link>
              <Link to="/signup" style={{ color: 'white', textDecoration: 'none' }}>
                <Button color="inherit" >Sign Up</Button>
              </Link>
            </div>
          )}
        </Toolbar>
      </AppBar>
    </Box>
  )
}

export default NavBar



