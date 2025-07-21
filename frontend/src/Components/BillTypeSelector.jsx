import React from 'react';
import { FormControl, FormLabel, RadioGroup, FormControlLabel, Radio } from '@mui/material';

const BillTypeSelector = ({ value, onChange }) => {
  return (
    <FormControl component="fieldset" sx={{ my: 2 }}>
      <FormLabel component="legend">Bill Type</FormLabel>
      <RadioGroup
        row
        value={value}
        onChange={e => onChange(e.target.value)}
        name="bill-type"
      >
        <FormControlLabel value="ohip" control={<Radio />} label="OHIP" />
        <FormControlLabel value="private" control={<Radio />} label="Private" />
      </RadioGroup>
    </FormControl>
  );
};

export default BillTypeSelector; 