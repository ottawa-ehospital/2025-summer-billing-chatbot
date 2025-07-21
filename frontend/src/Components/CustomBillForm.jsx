import React, { useState } from 'react';
import {
  Box,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
} from '@mui/material';

const CustomBillForm = ({ onAdd }) => {
  const [formData, setFormData] = useState({
    department: '',
    serviceType: '',
    serviceDate: '',
    description: '',
    baseAmount: '',
    equipmentFees: '',
    additionalFees: '',
    notes: '',
    isUrgent: false,
    requiresSpecialHandling: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({
      type: 'custom',
      ...formData
    });
    // Reset form
    setFormData({
      department: '',
      serviceType: '',
      serviceDate: '',
      description: '',
      baseAmount: '',
      equipmentFees: '',
      additionalFees: '',
      notes: '',
      isUrgent: false,
      requiresSpecialHandling: false,
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Hospital Custom Billing Information
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>Department</InputLabel>
            <Select
              name="department"
              value={formData.department}
              onChange={handleChange}
              label="Department"
            >
              <MenuItem value="emergency">Emergency</MenuItem>
              <MenuItem value="surgery">Surgery</MenuItem>
              <MenuItem value="radiology">Radiology</MenuItem>
              <MenuItem value="laboratory">Laboratory</MenuItem>
              <MenuItem value="pharmacy">Pharmacy</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>Service Type</InputLabel>
            <Select
              name="serviceType"
              value={formData.serviceType}
              onChange={handleChange}
              label="Service Type"
            >
              <MenuItem value="consultation">Consultation</MenuItem>
              <MenuItem value="procedure">Procedure</MenuItem>
              <MenuItem value="equipment">Equipment Usage</MenuItem>
              <MenuItem value="medication">Medication</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            type="date"
            label="Service Date"
            name="serviceDate"
            value={formData.serviceDate}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter service description"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            required
            fullWidth
            type="number"
            label="Base Amount"
            name="baseAmount"
            value={formData.baseAmount}
            onChange={handleChange}
            placeholder="Enter base amount"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            type="number"
            label="Equipment Fees"
            name="equipmentFees"
            value={formData.equipmentFees}
            onChange={handleChange}
            placeholder="Enter equipment fees"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            type="number"
            label="Additional Fees"
            name="additionalFees"
            value={formData.additionalFees}
            onChange={handleChange}
            placeholder="Enter additional fees"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Enter any additional notes"
            multiline
            rows={2}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Checkbox
                name="isUrgent"
                checked={formData.isUrgent}
                onChange={handleChange}
              />
            }
            label="Urgent Service"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Checkbox
                name="requiresSpecialHandling"
                checked={formData.requiresSpecialHandling}
                onChange={handleChange}
              />
            }
            label="Requires Special Handling"
          />
        </Grid>
      </Grid>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={!formData.department || !formData.serviceType || !formData.baseAmount}
        >
          Add Custom Item
        </Button>
      </Box>
    </Box>
  );
};

export default CustomBillForm; 