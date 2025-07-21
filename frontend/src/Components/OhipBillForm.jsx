import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Grid,
  Typography,
  Button,
  Autocomplete,
} from '@mui/material';
import dayjs from 'dayjs';

const OhipBillForm = ({ value, onChange, onAdd }) => {
  const [services, setServices] = useState([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_NODE_API}/api/services`);
        const data = await response.json();
        setServices(data);
      } catch (error) {
        console.error('Error fetching services:', error);
      }
    };
    fetchServices();
  }, []);

  const handleChange = (e) => {
    const { name, value: val } = e.target;
    onChange({ ...value, [name]: val });
  };

  const handleServiceSelect = (event, newValue) => {
    if (newValue) {
      onChange({
        ...value,
        serviceCode: newValue.code,
        serviceName: newValue.name,
        amount: newValue.amount,
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({
      type: 'ohip',
      note: value.note || '',
      ...value,
      settlementInfo: {
        status: 'pending',
        submittedAt: new Date().toISOString(),
      },
    });
    onChange({
      ohipNumber: '',
      serviceCode: '',
      serviceName: '',
      amount: '',
      note: '',
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, p: 3, border: '1px solid #ccc', borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        OHIP Billing Information
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            label="OHIP Number"
            name="ohipNumber"
            value={value.ohipNumber}
            onChange={handleChange}
            placeholder="Enter OHIP number"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Autocomplete
            options={services}
            getOptionLabel={(option) => option.name || ''}
            isOptionEqualToValue={(option, value) => option.code === value.code}
            onChange={handleServiceSelect}
            renderOption={(props, option) => (
              <li {...props} key={option.code}>
                {option.name}
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                required
                fullWidth
                label="Service"
                placeholder="Search or select service"
              />
            )}
            value={services.find(s => s.code === value.serviceCode) || null}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Service Code"
            name="serviceCode"
            value={value.serviceCode || ''}
            InputProps={{ readOnly: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Amount"
            name="amount"
            value={value.amount || ''}
            InputProps={{ readOnly: true, style: { fontWeight: 'bold', fontSize: 20, color: '#1976d2' } }}
            helperText="Amount is automatically set based on service"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Note"
            name="note"
            value={value.note || ''}
            onChange={handleChange}
            placeholder="Enter note (optional)"
            multiline
            rows={2}
          />
        </Grid>
      </Grid>
      <Button type="submit" variant="contained" sx={{ mt: 3 }}>
        Add OHIP Item
      </Button>
    </Box>
  );
};

export default OhipBillForm; 