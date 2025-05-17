import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Container,
  Grid,
} from '@mui/material';

import axios from 'axios';



const ChangePassword = () => {
  // State for password fields
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // State for validation errors
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');


  // Handle input changes
  const handleInputChange = (field, value) => {
    setPasswords({ ...passwords, [field]: value });
    setErrors({ ...errors, [field]: '' });
    setSuccessMessage('');
  };

  // Validation functions
  const isValidPassword = (password) =>
    password.length >= 6 && /[A-Z]/.test(password) && /\d/.test(password);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    let hasErrors = false;
    // const newErrors = { ...errors };
    const newErrors = {};

    if (!passwords.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
      hasErrors = true;
    }

    if (!passwords.newPassword) {
      newErrors.newPassword = 'New password is required';
      hasErrors = true;
    } else if (!isValidPassword(passwords.newPassword)) {
      newErrors.newPassword = 'Password must be at least 6 characters long, contain one uppercase letter, and one number.';
      hasErrors = true;
    }

    if (!passwords.confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required';
      hasErrors = true;
    } else if (passwords.confirmPassword !== passwords.newPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      hasErrors = true;
    }

    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setMessage("User not authenticated.");
        return;
      }

      const response = await axios.put(
        `${import.meta.env.VITE_NODE_API}/change-password`,
        {
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccessMessage(response.data.message);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setErrors({ server: error.response?.data?.message || 'Failed to change password' });
    }
  }

  return (
    <Container maxWidth={false} disableGutters={true} sx={{ width: '100%', paddingLeft: 0, paddingRight: 0 }}>
      {/* Page Title */}
      <Typography variant="h4" gutterBottom>
        Change Password
      </Typography>

      {successMessage && (
        <Typography color="success.main" sx={{ mb: 2 }}>
          {successMessage}
        </Typography>
      )}

      {errors.server && (
        <Typography color="error.main" sx={{ mb: 2 }}>
          {errors.server}
        </Typography>
      )}

      {/* Form */}
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Left Column */}
          <Grid item xs={6}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              {/* Current Password */}
              <TextField
                label="Current Password"
                type="password"
                variant="outlined"
                fullWidth
                value={passwords.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                error={!!errors.currentPassword}
                helperText={errors.currentPassword}
              />

              {/* New Password */}
              <TextField
                label="New Password"
                type="password"
                variant="outlined"
                fullWidth
                value={passwords.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                error={!!errors.newPassword}
                helperText={errors.newPassword}
              />

              {/* Confirm Password */}
              <TextField
                label="Confirm Password"
                type="password"
                variant="outlined"
                fullWidth
                value={passwords.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
              />

              {/* Submit Button */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                <Button type="submit" variant="contained">
                  Change Password
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default ChangePassword;