import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Input,
  Grid
} from '@mui/material';
import {
  Mic as MicIcon,
  Stop as StopIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
} from '@mui/icons-material';

import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

// MUI Date & Time Picker
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import axios from 'axios'



const NewBill = () => {

  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState('');

  // **Doctor Name & Email** (Fetched from Local Storage)
  const [doctorName, setDoctorName] = useState(localStorage.getItem("userName") || sessionStorage.getItem('userName'));
  const [doctorEmail, setDoctorEmail] = useState(localStorage.getItem("userEmail") || sessionStorage.getItem('userEmail'));
  const [doctorHospital, setDoctorHospital] = useState(localStorage.getItem("userHospital") || sessionStorage.getItem('userHospital'));

  // State for Patient Name
  const [patientName, setPatientName] = useState('');
  const [patientNameError, setPatientNameError] = useState(false);

  // **Date & Time Pickers**
  const [selectedDate, setSelectedDate] = useState(dayjs()); // Default to today
  const [selectedTime, setSelectedTime] = useState(dayjs()); // Default to current time

  // State for Speech Recognition
  const [isSpeechRecognition, setIsSpeechRecognition] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const [manualText, setManualText] = useState('');
  const [micDisabled, setMicDisabled] = useState(false);

  const startListening = () => SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
  // const { transcript, browserSupportsSpeechRecognition } = useSpeechRecognition();
  const { transcript, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  useEffect(() => {
    if (isRecording) {
      setSpeechText(transcript); // Update speech text when recording is on
    }
  }, [transcript, isRecording]);


  if (!browserSupportsSpeechRecognition) {
    return "This brower does not support speech recognition. Try anothre browser."
  }

  // State for Bill Items

  const [billItems, setBillItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  // Toggle between Speech Recognition and Manual Entry
  const toggleFunctionality = () => {
    setIsSpeechRecognition(!isSpeechRecognition);
    setSpeechText('');
    setManualText('');
  };

  const handleRecord = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      if (speechText) {
        setMicDisabled(true);
      }
      SpeechRecognition.stopListening()
    } else {
      // Start recording
      setSpeechText('');
      resetTranscript();
      setMicDisabled(false);
      setIsRecording(true);
      startListening();
    }
  };

  // Handle Save for Speech Recognition or Manual Entry
  const handleSave = async () => {
    const note = isSpeechRecognition ? speechText : manualText;
    if (note) {
      console.log(note);
      const newItem = {
        id: billItems.length + 1,
        note,
        // codes to be retrieved from RAG API, below is a dummy sample
        codes: [],
      };

      // retrieve the codes from RAG
      try {
        const response = await axios.post(`${import.meta.env.VITE_PYTHON_API}/bill`, {
          text: note, // Assuming `note` is a state variable containing the text
          chat_history: [],
        });

        console.log(response)
    
        if (response.data.codes) {
          newItem.codes = response.data.codes;
        }
      } catch (error) {
        console.error('Error getting the codes:', error);
      }

      setBillItems([...billItems, newItem]);

      setIsRecording(false);
      SpeechRecognition.stopListening();
      resetTranscript();
      setSpeechText('');
      setManualText('');
      setMicDisabled(false);
    }
  };

  const handleDiscard = () => {
    setIsRecording(false);
    SpeechRecognition.stopListening();
    resetTranscript();
    setSpeechText('');
    setManualText('');
    setMicDisabled(false);
  }

  // Handle Delete Selected Rows
  const handleDeleteSelected = () => {
    setBillItems((prevItems) => {
      // Filter out selected items using their IDs
      const filteredItems = prevItems.filter((item) => !selectedItems.includes(item.id));

      // Re-index the remaining bill items
      const reindexedItems = filteredItems.map((item, index) => ({
        ...item,
        id: index + 1, // Ensure IDs remain sequential
      }));

      setSelectedItems([]); // Clear selected items
      return reindexedItems;
    });
  };


  // Handle Delete Code (and delete the row if no codes are left)
  const handleDeleteCode = (itemId, codeId) => {
    setBillItems((prevItems) => {
      const updatedItems = prevItems
        .map((item) => {
          if (item.id === itemId) {
            const updatedCodes = item.codes.filter((code) => code.code !== codeId);
            return updatedCodes.length > 0 ? { ...item, codes: updatedCodes } : null;
          }
          return item;
        })
        .filter(Boolean);

      // Re-index the remaining bill items
      return updatedItems.map((item, index) => ({ ...item, id: index + 1 }));
    });
  };


  // Handle Checkbox Selection
  const handleSelectItem = (itemId) => {
    setSelectedItems((prevSelected) =>
      prevSelected.includes(itemId)
        ? prevSelected.filter((id) => id !== itemId)
        : [...prevSelected, itemId]
    );
  };


  const [editingUnit, setEditingUnit] = useState(null); // Store item & code being edited
  const [tempUnit, setTempUnit] = useState(1); // Temporary storage for unit change

  // Handle unit edit click
  const handleEditUnit = (itemId, codeId, currentUnit) => {
    setEditingUnit({ itemId, codeId });
    setTempUnit(currentUnit);
  };

  // Handle unit confirm
  const handleConfirmUnit = () => {
    if (tempUnit < 1) return; // Ensure it's at least 1

    setBillItems((prevItems) =>
      prevItems.map((item) =>
        item.id === editingUnit.itemId
          ? {
            ...item,
            codes: item.codes.map((code) =>
              code.code === editingUnit.codeId ? { ...code, unit: tempUnit } : code
            ),
          }
          : item
      )
    );

    setEditingUnit(null); // Hide input field
  };


  // Calculate Subtotal for a Bill Item
  const calculateSubtotal = (codes) => {
    return codes.reduce((sum, code) => sum + code.unitPrice * code.unit, 0);
  };

  // Calculate Total for the Bill
  const calculateTotal = () => {
    return billItems.reduce((sum, item) => sum + calculateSubtotal(item.codes), 0);
  };

  // Validate Patient Name
  const validatePatientName = () => {
    if (!patientName.trim()) {
      setPatientNameError(true);
      return false;
    }
    setPatientNameError(false);
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrorMessage('')

    if (!selectedDate || !selectedTime) {
      setErrorMessage('Please select a valid date and time.');
      return;
    }

    if (!doctorName || !doctorEmail || !doctorHospital) {
      setErrorMessage('Doctor name, email, or hospital not found. Please sign in again.');
      return;
    }

    if (!patientName) {
      setErrorMessage('Patient name is required');
      return;
    }

    const formattedDate = selectedDate.toISOString(); // Convert to ISO format
    const formattedTime = dayjs(selectedTime).format("HH:mm"); // Store as "HH:mm"

    // Prepare bill data
    const newBill = {
      date: formattedDate,
      time: formattedTime,
      doctorName: doctorName, // Ensure doctor name is captured correctly
      doctorEmail: doctorEmail,
      doctorHospital: doctorHospital,
      patient: patientName,
      items: billItems.map(item => ({
        note: item.note,
        codes: item.codes.map(code => ({
          code: code.code,
          description: code.description,
          unitPrice: code.unitPrice,
          unit: code.unit
        }))
      }))
    };

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await axios.post(`${import.meta.env.VITE_NODE_API}/create-bill`, newBill, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(response.data);
      // alert('Bill saved successfully!');
      setSuccessMessage('Bill saved successfully!');
      setPatientName('');
      setSelectedDate(dayjs()); // Reset to today
      setSelectedTime(dayjs()); // Reset to current time
      setBillItems([]); // Clear all bill items
      setIsSpeechRecognition(true);
      setSpeechText('');
      setManualText('');
      setSelectedItems([]);
      setEditingUnit(null);
      setTempUnit(1);

      setTimeout(() => {
        setSuccessMessage('')
      }, 3000);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Error saving bill');
    }
    
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      {/* Page Title */}
      <Typography variant="h4" gutterBottom>
        New Bill
      </Typography>
      {successMessage && (
        <Typography color="success" sx={{ mt: 0, fontSize: "20px"}}>
          {successMessage}
        </Typography>
      )}
      {!successMessage && (
        <Container component="form" onSubmit={handleSubmit} maxWidth={false} disableGutters={true} sx={{ width: '100%', paddingLeft: 0, paddingRight: 0 }}>


          {/* Patient Name Field */}
          {/* <TextField
          label="Patient Name"
          variant="outlined"
          fullWidth
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          error={patientNameError}
          helperText={patientNameError ? 'Patient Name is required' : ''}
          onBlur={validatePatientName}
          sx={{ mb: 3 }}
        /> */}

          {/* Display error message if any */}
          {errorMessage && (
            <Typography color="error" sx={{ mt: 0, fontSize: "20px"}}>
              {errorMessage}
            </Typography>
          )}




          {/* Date & Time Picker - Responsive */}
          <Grid container spacing={2} sx={{ alignItems: "end" }}>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Select Date"
                value={selectedDate}
                onChange={(newDate) => setSelectedDate(newDate)}
                sx={{ width: '100%', marginTop: "10px" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TimePicker
                label="Select Time"
                value={selectedTime}
                onChange={(newTime) => setSelectedTime(newTime)}
                sx={{ width: '100%' }}
              />
            </Grid>
          </Grid>

          {/* Doctor & Patient Name - Responsive */}
          {/* <Grid container spacing={2} sx={{ my: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Doctor Name"
                variant="outlined"
                fullWidth
                value={doctorName}
                disabled
                sx={{ backgroundColor: '#f5f5f5' }} // Gray out the text field
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Patient Name"
                variant="outlined"
                fullWidth
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                error={patientNameError}
                helperText={patientNameError ? 'Patient Name is required' : ''}
                onBlur={validatePatientName}
              />
            </Grid>
          </Grid> */}
          <Grid container spacing={2} sx={{ my: 2, flexDirection: 'column' }}>
          <Grid item xs={12}>
    <TextField
      label="Doctor Hospital"
      variant="outlined"
      fullWidth
      value={doctorHospital}
      disabled
      sx={{ backgroundColor: '#f5f5f5' }} // Gray out the text field
    />
  </Grid>
  <Grid item xs={12}>
    <TextField
      label="Doctor Name"
      variant="outlined"
      fullWidth
      value={doctorName}
      disabled
      sx={{ backgroundColor: '#f5f5f5' }} // Gray out the text field
    />
  </Grid>
  <Grid item xs={12}>
    <TextField
      label="Patient Name"
      variant="outlined"
      fullWidth
      value={patientName}
      onChange={(e) => setPatientName(e.target.value)}
      error={patientNameError}
      helperText={patientNameError ? 'Patient Name is required' : ''}
      onBlur={validatePatientName}
    />
  </Grid>
</Grid>


          {/* Enter Notes Section */}
          {/* <Paper sx={{ p: 2, mb: 3 }}> */}
          <Paper elevation={0} sx={{ p: 0, mb: 3, border: 'none' }}>
            <Typography variant="h6" gutterBottom>
              Enter Notes
            </Typography>

            {/* Toggle Button */}
            <Button variant="outlined" onClick={toggleFunctionality} fullWidth sx={{ mb: 2 }}>
              Switch to {isSpeechRecognition ? 'Manual Entry' : 'Speech Recognition'}
            </Button>

            {/* Speech Recognition Section */}
            {isSpeechRecognition && (
              <Box>
                {speechText && (
                  <Typography variant="body1" gutterBottom>
                    {speechText}
                  </Typography>
                )}

                {/* Recording Icon */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  {!isRecording ? (
                    <IconButton onClick={handleRecord} color="primary" disabled={micDisabled}>
                      <MicIcon />
                    </IconButton>
                  ) : (
                    <IconButton onClick={handleRecord} color="secondary">
                      <StopIcon />
                    </IconButton>
                  )}
                </Box>

                {speechText && !isRecording && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                    <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
                      Save
                    </Button>
                    <Button variant="outlined" onClick={handleDiscard}>
                      Discard
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {/* Manual Entry Section */}
            {!isSpeechRecognition && (
              <Box>
                <TextField
                  label="Enter Text"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={4}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                />
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  sx={{ mt: 2 }}
                  fullWidth
                  disabled={!manualText}
                >
                  Save
                </Button>
              </Box>
            )}
          </Paper>

          {/* Bill Preview Table */}
          <Typography variant="h6" gutterBottom>
            Bill Preview
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={
                        selectedItems.length > 0 && selectedItems.length < billItems.length
                      }
                      checked={selectedItems.length === billItems.length && billItems.length > 0}
                      onChange={() => {
                        if (selectedItems.length === billItems.length) {
                          setSelectedItems([]);
                        } else {
                          setSelectedItems(billItems.map((item) => item.id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>Item #</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell>Codes</TableCell>
                  <TableCell>Subtotal ($)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {billItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                      />
                    </TableCell>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>{item.note}</TableCell>
                    <TableCell>
                      <List>
                        {item.codes.map((code) => (
                          <ListItem key={code.code} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                              <Typography variant="body2">Code: {code.code}</Typography>
                              <IconButton onClick={() => handleDeleteCode(item.id, code.code)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                            <Typography variant="body2">Description: {code.description}</Typography>
                            <Typography variant="body2">Unit Price: ${code.unitPrice.toFixed(2)}</Typography>
                            {/* <Typography variant="body2">Unit: {code.unit}</Typography> */}
                            {/* Editable Unit Section */}
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body2">Unit: </Typography>

                              {editingUnit?.itemId === item.id && editingUnit?.codeId === code.code ? (
                                <>
                                  <Input
                                    type="number"
                                    value={tempUnit}
                                    onChange={(e) => setTempUnit(Math.max(1, parseInt(e.target.value) || 1))}
                                    sx={{ width: 50, ml: 1 }}
                                  />
                                  <IconButton onClick={handleConfirmUnit}>
                                    <CheckIcon fontSize="small" color="success" />
                                  </IconButton>
                                </>
                              ) : (
                                <>
                                  <Typography variant="body2" sx={{ ml: 1 }}>{code.unit}</Typography>
                                  <IconButton onClick={() => handleEditUnit(item.id, code.code, code.unit)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </>
                              )}
                            </Box>



                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              Item Subtotal ($): ${(code.unitPrice * code.unit).toFixed(2)}
                            </Typography>
                          </ListItem>
                        ))}
                      </List>
                    </TableCell>


                    <TableCell>
                      ${calculateSubtotal(item.codes).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Delete Selected Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteSelected}
              disabled={selectedItems.length === 0}
            >
              Delete Selected
            </Button>
          </Box>

          {/* Total Field */}
          <TextField
            label="Total ($)"
            variant="outlined"
            fullWidth
            value={calculateTotal().toFixed(2)}
            InputProps={{
              readOnly: true,
            }}
            sx={{ mt: 3 }}
          />

          {/* Submit Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<SaveIcon />}
              onClick={handleSubmit}
              disabled={!patientName || billItems.length == 0 || editingUnit}
              sx={{ mt: 2 }}
              fullWidth
            >
              Submit
            </Button>
          </Box>

        </Container>
      )}

    </LocalizationProvider>
  );
};

export default NewBill;