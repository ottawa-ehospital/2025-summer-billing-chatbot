import React, { useState } from 'react';
import {
  Box,
  TextField,
  Grid,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';

const PrivateBillForm = ({ onAdd }) => {
  const [formData, setFormData] = useState({
    hasInsurance: 'no',
    insuranceCompany: '',
    insuranceNumber: '',
    serviceDate: '',
    service: '',
    amount: '',
    note: '',
  });

  const [hospitalPolicy, setHospitalPolicy] = useState({
    overtimeMultiplier: 1.5,
    weekendMultiplier: 2.0,
    afterHoursMultiplier: 1.8,
  });

  const [openPolicyDialog, setOpenPolicyDialog] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePolicyChange = (e) => {
    const { name, value } = e.target;
    setHospitalPolicy(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({
      type: 'private',
      ...formData,
      hospitalPolicy,
    });
    setFormData({
      hasInsurance: 'no',
      insuranceCompany: '',
      insuranceNumber: '',
      serviceDate: '',
      service: '',
      amount: '',
      note: '',
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Private Billing Information
        </Typography>
        <IconButton onClick={() => setOpenPolicyDialog(true)} color="primary">
          <SettingsIcon />
        </IconButton>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Has Private Insurance?</FormLabel>
            <RadioGroup
              row
              name="hasInsurance"
              value={formData.hasInsurance}
              onChange={handleChange}
            >
              <FormControlLabel value="yes" control={<Radio />} label="Yes" />
              <FormControlLabel value="no" control={<Radio />} label="No" />
            </RadioGroup>
          </FormControl>
        </Grid>
        {formData.hasInsurance === 'yes' && (
          <>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Insurance Company"
                name="insuranceCompany"
                value={formData.insuranceCompany}
                onChange={handleChange}
                placeholder="Enter insurance company"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Insurance Number"
                name="insuranceNumber"
                value={formData.insuranceNumber}
                onChange={handleChange}
                placeholder="Enter insurance number"
              />
            </Grid>
          </>
        )}
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            label="Service"
            name="service"
            value={formData.service}
            onChange={handleChange}
            placeholder="Enter service name"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            type="number"
            label="Amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="Enter amount"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Note"
            name="note"
            value={formData.note}
            onChange={handleChange}
            placeholder="Enter note (optional)"
            multiline
            rows={2}
          />
        </Grid>
      </Grid>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={!formData.serviceDate || !formData.service || !formData.amount || (formData.hasInsurance === 'yes' && (!formData.insuranceCompany || !formData.insuranceNumber))}
        >
          Add Private Bill Item
        </Button>
      </Box>
      <Dialog open={openPolicyDialog} onClose={() => setOpenPolicyDialog(false)}>
        <DialogTitle>Hospital Policy Settings</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Overtime Multiplier"
                name="overtimeMultiplier"
                value={hospitalPolicy.overtimeMultiplier}
                onChange={handlePolicyChange}
                inputProps={{ step: 0.1, min: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Weekend Multiplier"
                name="weekendMultiplier"
                value={hospitalPolicy.weekendMultiplier}
                onChange={handlePolicyChange}
                inputProps={{ step: 0.1, min: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="After Hours Multiplier"
                name="afterHoursMultiplier"
                value={hospitalPolicy.afterHoursMultiplier}
                onChange={handlePolicyChange}
                inputProps={{ step: 0.1, min: 1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPolicyDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PrivateBillForm; 