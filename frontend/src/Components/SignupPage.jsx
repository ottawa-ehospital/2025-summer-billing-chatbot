import * as React from 'react';
import { useState } from 'react';
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

const SignupPage = () => {
  // State for form inputs and validation
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nameError, setNameError] = useState(false)
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [errorMessage, setErrorMessage] = useState("")
  const navigate = useNavigate()

  // Validation functions
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = (password) =>
    password.length >= 6 && /[A-Z]/.test(password) && /\d/.test(password);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // reset error message
    setNameError(false)
    setEmailError(false)
    setPasswordError(false)
    setErrorMessage('')

    // input validation
    if (!name.trim()) {
      setNameError(true)
      setErrorMessage('Name is required.');
      return;
    }
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
    if (!isChecked) {
      setErrorMessage('You must agree to the terms and conditions.');
      return;
    }

    try {
      const result = await axios.post(`${import.meta.env.VITE_NODE_API}/signup`, {
        name,
        email,
        password,
      });

      console.log(result);
      navigate('/signin');
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Registration failed.');
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
            Sign Up
          </Typography>

          {/* Display error message if any */}
          {errorMessage && (
            <Typography color="error" sx={{ mt: 1 }}>
              {errorMessage}
            </Typography>
          )}

          {/* Sign Up Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
            {/* Name Field */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Name"
              name="name"
              autoComplete="given-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)} 
              error={nameError} 
              helperText={nameError ? 'Name should not be empty.' : ''}
            />            

            {/* Email Field */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={passwordError}
              helperText={passwordError ? 'Password must be at least 6 characters long, one uppercase, one number.' : ''}
            />

            {/* Terms and Conditions Checkbox */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                  color="primary"
                />
              }
              label="I agree to the terms and conditions."
            />

            {/* Sign Up Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign Up
            </Button>

            {/* Sign In Link */}
            <Grid container justifyContent="flex-end">
              <Grid item>
                <Link href="/signin" variant="body2">
                  Already have an account? Sign In
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default SignupPage
