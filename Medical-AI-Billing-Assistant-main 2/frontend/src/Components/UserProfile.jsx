import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Avatar,
  Button,
  Container,
  Chip,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Grid,
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';

import axios from 'axios'



const UserProfile = () => {
  const [user, setUser] = useState({
    name: '',
    email: '',
    hospital: '',
    specialties: [], // Ensure specialties is always an array
  });
  const [editableUser, setEditableUser] = useState({
    name: '',
    email: '',
    hospital: '',
    specialties: [], // Ensure specialties is always an array
  });
  const [editableUserHospitalBack, setEditableUserHospitalBack] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_NODE_API}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log(res.data);
        setUser(res.data);
        setEditableUser(res.data);
        setEditableUserHospitalBack(res.data.hospital);
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchUserProfile();
  }, [token]);

  // List of all available specialties
  const allSpecialties = [
    'Anatomical pathology',
    'Anesthesiology',
    'Cardiology',
    'Cardiovascular and thoracic surgery',
    'Clinical immunology/allergy',
    'Critical care medicine',
    'Dermatology',
    'Diagnostic radiology',
    'Emergency medicine',
    'Endocrinology/metabolism',
    'Family medicine',
    'Gastroenterology',
    'General internal medicine',
    'General surgery',
    'General/clinical pathology',
    'Geriatric medicine',
    'Hematology',
    'Medical biochemistry',
    'Medical genetics',
    'Medical microbiology and infectious diseases',
    'Medical oncology',
    'Nephrology',
    'Neurology',
    'Neurosurgery',
    'Nuclear medicine',
    'Obstetrics/gynecology',
    'Occupational medicine',
    'Ophthalmology',
    'Orthopedic surgery',
    'Otolaryngology',
    'Pediatrics',
    'Physical medicine and rehabilitation',
    'Plastic surgery',
    'Psychiatry',
    'Public health and preventive medicine',
    'Radiation oncology',
    'Respiratory medicine/respirology',
    'Rheumatology',
    'Urology',
  ];

  // Function to generate unique colors for chips
  const generateChipColors = (count) => {
    const colors = [
      '#f44336', // Red
      '#2196f3', // Blue
      '#4caf50', // Green
      '#ff9800', // Orange
      '#9c27b0', // Purple
      '#00bcd4', // Cyan
      '#e91e63', // Pink
      '#8bc34a', // Light Green
      '#ff5722', // Deep Orange
      '#673ab7', // Deep Purple
    ];
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
  };

  // Generate colors for specialties chips
  const chipColors = generateChipColors(allSpecialties.length);

  // Handle Edit button click
  // const handleEdit = () => {
  //   setIsEditMode(true);
  //   setEditableUser({ ...user });
  // };
  const handleEdit = () => {
    setIsEditMode(true);
    setEditableUser({
      ...user,
      specialties: user.specialties || [], // Ensure it's always an array
    });
  };

  // Handle Save button click
  const handleSave = async () => {
    try {
      console.log(editableUser)
      const { name, hospital, specialties } = editableUser;
      const res = await axios.put(`${import.meta.env.VITE_NODE_API}/profile`, 
        { name, hospital, specialties }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(res)
      setUser(res.data.user);
      setIsEditMode(false);

      if (hospital != editableUserHospitalBack) {
          localStorage.setItem('userHospital', hospital);
          sessionStorage.setItem('userHospital', hospital);
          setEditableUserHospitalBack(hospital);
          // window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new CustomEvent('userHospitalUpdated', { detail: hospital }));

      }

    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleCancel = () => {
    setEditableUser(user);
    setIsEditMode(false);
  };

  // Handle changes in editable fields
  const handleFieldChange = (field, value) => {
    setEditableUser({ ...editableUser, [field]: value });
  };

  // Handle changes in specialties checkboxes
  const handleSpecialtyChange = (specialty) => {
    const updatedSpecialties = editableUser.specialties.includes(specialty)
      ? editableUser.specialties.filter((s) => s !== specialty) // Remove if already selected
      : [...editableUser.specialties, specialty]; // Add if not selected
    console.log(updatedSpecialties)
    setEditableUser({ ...editableUser, specialties: updatedSpecialties });
  };

  if (!user) return <Typography>Loading profile...</Typography>;

  return (
    // <Container sx={{mx: 0}}>
    <Container maxWidth={false} disableGutters={true} sx={{width: '100%', paddingLeft: 0, paddingRight: 0}}>
      {/* Page Title */}
      <Typography variant="h4" gutterBottom>
        User Profile
      </Typography>

      {/* Two-Column Layout */}
      <Grid container spacing={3} >
        {/* Left Column */}
        <Grid item xs={4}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            {/* Profile Picture */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
              <Avatar
                alt={user.name}
                src="https://via.placeholder.com/150" // Placeholder image URL
                sx={{ width: 150, height: 150 }}
              >
                <PersonIcon sx={{ fontSize: 80 }} /> {/* Fallback icon */}
              </Avatar>
            </Box>

            {/* User Information */}
            <TextField
              label="Name"
              variant="outlined"
              fullWidth
              value={isEditMode ? editableUser.name : user.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              disabled={!isEditMode} // Disabled when not in edit mode
            />

            <TextField label="Email" variant="outlined" fullWidth 
              value={user.email} disabled />

            <TextField
              label="Hospital"
              variant="outlined"
              fullWidth
              value={isEditMode ? (editableUser.hospital?editableUser.hospital:'') : (user.hospital?user.hospital:'Not configured')}
              onChange={(e) => handleFieldChange('hospital', e.target.value)}
              disabled={!isEditMode} // Disabled when not in edit mode
            />

            {/* Edit and Save Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
              {isEditMode ? (
                <>
                <Button variant="outlined" onClick={handleCancel} sx={{ mr: 2 }}>Cancel</Button>
                <Button variant="contained" onClick={handleSave}>Save</Button>
              </>
              ) : (
                <Button variant="contained" onClick={handleEdit}>
                  Edit
                </Button>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Right Column: Specialties */}
        <Grid item xs={8}>
          <Box sx={{ mt: 8 }}>
            <Typography variant="h6" gutterBottom>
              Specialties
            </Typography>

            {/* Specialties Checkboxes (Edit Mode) */}
            {isEditMode && (
              <FormControl component="fieldset">
                {/* <FormLabel component="legend">Specialties</FormLabel> */}
                <Grid container spacing={2}>
                  {allSpecialties.map((specialty) => (
                    <Grid item xs={3} key={specialty}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={editableUser.specialties?.includes(specialty) || false}
                            onChange={() => handleSpecialtyChange(specialty)}
                          />
                        }
                        label={
                            <Typography variant="body2" sx={{ wordWrap: 'break-word', whiteSpace: 'normal', paddingTop: '10px'}}>
                              {specialty}
                            </Typography>
                          }
                          sx={{ alignItems: 'flex-start' }} // Align checkbox and label properly
                      />
                    </Grid>
                  ))}
                </Grid>
              </FormControl>
            )}

            {/* Specialties Chips (View Mode) */}
            {!isEditMode && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {user.specialties? (user.specialties?.map((specialty, index) => (
                  <Chip
                    key={specialty}
                    label={specialty}
                    sx={{
                      backgroundColor: chipColors[index % chipColors.length], // Use color from chipColors
                      color: '#fff', // White text for better contrast
                    }}
                  />
                ))):(<Typography variant="body3" sx={{color: 'gray'}}>Not configured</Typography>)}
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>
    </Container>
  );

};

export default UserProfile;