import * as React from 'react';
import { useState, useEffect } from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom'

import axios from 'axios'



// Default MUI theme
const defaultTheme = createTheme();

const SigninPage = ({ setIsAuthenticated }) => {
  // State for form inputs and validation
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [errorMessage, setErrorMessage] = useState("")
  const navigate = useNavigate()

  // Validation Functions
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = (password) => password.length >= 6;

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true); // Sync auth state with storage
      navigate('/dashboard'); // Redirect if already signed in
    }
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // reset error message
    setEmailError(false)
    setPasswordError(false)
    setErrorMessage('')

    // input validation
    if (!email.trim() || !isValidEmail(email)) {
      setEmailError(true);
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password.trim() || !isValidPassword(password)) {
      setPasswordError(true);
      setErrorMessage(
        'Password must be at least 6 characters long, contain one uppercase letter, and one number.'
      );
      return;
    }

    try {
      const result = await axios.post(`${import.meta.env.VITE_NODE_API}/signin`, { email, password });

      console.log(result);
      
      if (result.data && result.data.token) {
        const token = result.data.token;

        console.log(result.data.user.email);
        console.log(result.data.user.hospital);
        console.log(result.data.user.name);
        // **Store Token Based on "Remember Me"**
        if (isChecked) {
          localStorage.setItem('token', result.data.token); // Persistent Storage
          localStorage.setItem('userEmail', result.data.user.email);
          localStorage.setItem('userName', result.data.user.name);
          localStorage.setItem('userHospital', result.data.user.hospital);
        } else {
          sessionStorage.setItem('token', result.data.token); // Temporary Storage
          sessionStorage.setItem('userEmail', result.data.user.email);
          sessionStorage.setItem('userName', result.data.user.name);
          sessionStorage.setItem('userHospital', result.data.user.hospital);
        }

        setIsAuthenticated(true); 
        navigate('/dashboard');
      } else {
        setErrorMessage(result.data.message || 'Login failed.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Login failed.');
    }
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Avatar Icon */}
          <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
            <LockOutlinedIcon />
          </Avatar>

          {/* Title */}
          <Typography component="h1" variant="h5">
            Sign In
          </Typography>

          {/* Display error message if any */}
          {errorMessage && (
            <Typography color="error" sx={{ mt: 1 }}>
              {errorMessage}
            </Typography>
          )}

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
            {/* Email Field */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
              helperText={emailError ? 'Please enter a valid email address.' : ''}
            />

            {/* Password Field */}
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={passwordError}
              helperText={passwordError ? 'Password must be at least 6 characters long, one uppercase, one number.' : ''}
            />

            {/* Remember Me Checkbox */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                  color="primary"
                />
              }
              label="Remember me"
            />

            {/* Login Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign In
            </Button>

            {/* Sign Up Link */}
            <Grid container>
              <Grid item xs>
                <Link href="#" variant="body2">
                  Forgot password?
                </Link>
              </Grid>
              <Grid item>
                <Link href="/signup" variant="body2">
                  Don't have an account? Sign Up
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
}


export default SigninPage