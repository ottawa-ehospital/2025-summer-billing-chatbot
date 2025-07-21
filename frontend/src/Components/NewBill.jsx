import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
} from '@mui/material';
import axios from 'axios';
import { AIBillContext, useAIBill } from './AIBillContext';
import { useNavigate } from 'react-router-dom';
// VoiceInput component removed - using new WebRTC voice chat instead
import BillPreview from './BillPreview';
import BillTypeSelector from './BillTypeSelector';
import OhipBillForm from './OhipBillForm';
import PrivateBillForm from './PrivateBillForm';
import CustomBillForm from './CustomBillForm';

const NewBill = () => {
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState('');
  const [openSuccessSnackbar, setOpenSuccessSnackbar] = useState(false);

  const navigate = useNavigate();

  // Doctor Information
  const [doctorName] = useState(
    localStorage.getItem("userName") ||
    sessionStorage.getItem('userName') ||
    "Test Doctor"
  );
  const [doctorEmail] = useState(
    localStorage.getItem("userEmail") ||
    sessionStorage.getItem('userEmail') ||
    "test@doctor.com"
  );
  const [doctorHospital] = useState(
    localStorage.getItem("userHospital") ||
    sessionStorage.getItem('userHospital') ||
    "Test Hospital"
  );

  // Patient Information
  const [patientName, setPatientName] = useState('');
  const [patientNameError, setPatientNameError] = useState(false);

  // Date & Time (use string for native input)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Bill Items
  const [billItems, setBillItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [editingUnit, setEditingUnit] = useState(null);
  const [tempUnit, setTempUnit] = useState(1);

  // Bill Type
  const [billType, setBillType] = useState('ohip');

  // OHIP form state for controlled component
  const [ohipForm, setOhipForm] = useState({
    ohipNumber: '',
    serviceDate: '',
    serviceType: '',
    diagnosisCode: '',
    serviceCode: '',
    serviceName: '',
    amount: '',
    note: '',
  });

  // Hospital Policy
  const [hospitalPolicy, setHospitalPolicy] = useState({
    overtimeMultiplier: 1,
    weekendMultiplier: 1,
    afterHoursMultiplier: 1,
  });
  const [openPolicyDialog, setOpenPolicyDialog] = useState(false);

  const { extractedInfo } = useAIBill();

  const lastServiceListRef = useRef(null);

  // Helper function to get the highest price service item from a list
  function getHighestPriceService(items) {
    if (!Array.isArray(items) || items.length === 0) return [];
    let maxItem = items[0];
    let maxPrice = (maxItem.codes && maxItem.codes[0]) ? maxItem.codes[0].unitPrice : 0;
    for (const item of items) {
      const price = (item.codes && item.codes[0]) ? item.codes[0].unitPrice : 0;
      if (price > maxPrice) {
        maxItem = item;
        maxPrice = price;
      }
    }
    return [maxItem];
  }

  useEffect(() => {
    if (extractedInfo) {
      if (extractedInfo.patientName) setPatientName(extractedInfo.patientName);
      // Only add when serviceList content changes
      if (
        extractedInfo.serviceList &&
        Array.isArray(extractedInfo.serviceList) &&
        extractedInfo.serviceList.length > 0 &&
        JSON.stringify(extractedInfo.serviceList) !== JSON.stringify(lastServiceListRef.current)
      ) {
        const newItems = extractedInfo.serviceList.map((svc, idx) => ({
          id: billItems.length + idx + 1,
          note: svc.note || '',
          codes: [{
            code: svc.serviceCode || '-',
            description: svc.serviceName || '-',
            unitPrice: Number(svc.amount) || 0,
            unit: 1
          }]
        }));
        if (billType === 'ohip') {
          const highest = getHighestPriceService(newItems);
          setBillItems(highest);
          if (highest.length > 0) {
            const svc = highest[0].codes[0];
            showSuccessMessage(`Your optimal billing is ${svc.description} (${svc.code}), $${svc.unitPrice}`);
          }
        } else {
          setBillItems(prev => [...prev, ...newItems]);
          showSuccessMessage('Services added to bill preview successfully');
        }
        lastServiceListRef.current = extractedInfo.serviceList;
      }
    }
  }, [extractedInfo]);

  // Function to display success messages
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setOpenSuccessSnackbar(true);
    // Auto-clear message after 3 seconds
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  // Close success message handler
  const handleCloseSuccessSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSuccessSnackbar(false);
  };

  // Voice input handler for auto-filling OHIP form
  const handleVoiceSave = async (text) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_PYTHON_API}/bill`, {
        text,
        chat_history: [],
      });
      const aiData = response.data;
      if (aiData.billType === 'ohip' && aiData.ohipInfo) {
        setBillType('ohip');
        setOhipForm(aiData.ohipInfo);
      }
    } catch (error) {
      // handle error
    }
  };

  const handleSave = async (text) => {
    if (text) {
      const newItem = {
        id: billItems.length + 1,
        note: text,
        codes: [],
      };

      try {
        const response = await axios.post(`${import.meta.env.VITE_PYTHON_API}/bill`, {
          text: text,
          chat_history: [],
        });

        if (response.data.codes) {
          newItem.codes = response.data.codes;
        }
      } catch (error) {
        console.error('Error getting the codes:', error);
      }

      setBillItems([...billItems, newItem]);
    }
  };

  const handleDelete = (id) => {
    setBillItems(billItems.filter(item => item.id !== id));
  };

  const handleEdit = (item) => {
    setEditingUnit(item.id);
    setTempUnit(item.codes[0]?.unit || 1);
  };

  const handleUnitChange = (id, newUnit) => {
    setBillItems(billItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          codes: [{
            ...item.codes[0],
            unit: newUnit
          }]
        };
      }
      return item;
    }));
  };

  const handleSubmit = async () => {
    if (!patientName) {
      setPatientNameError(true);
      return;
    }

    const newBill = {
      patient: patientName,
      doctorName,
      doctorEmail,
      doctorHospital,
      date: selectedDate, // string in YYYY-MM-DD
      billType,
      items: billItems.map(item => ({
        note: item.note !== undefined ? item.note : '',
        codes: item.codes
      }))
    };
    console.log('newBill', JSON.stringify(newBill, null, 2));

    try {
      const response = await axios.post(`${import.meta.env.VITE_NODE_API}/api/create-bill`, newBill, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const { billId } = response.data || {};
      if (billId) {
        navigate(`/printbill/${billId}?auto=1`);
      } else {
        showSuccessMessage('Bill saved successfully!');
        resetForm();
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(error.response?.data?.message || 'Error saving bill');
    }
  };

  const resetForm = () => {
    setPatientName('');
    // Reset to today and now
    const today = new Date();
    setSelectedDate(today.toISOString().split('T')[0]);
    setBillItems([]);
    setSelectedItems([]);
    setEditingUnit(null);
    setTempUnit(1);
  };

  const handleAIAutoFill = (aiData) => {
    // Auto-fill patient name only
    if (aiData.patientName) setPatientName(aiData.patientName);
    // Batch add serviceList to billItems
    if (aiData.serviceList && Array.isArray(aiData.serviceList) && aiData.serviceList.length > 0) {
      const newItems = aiData.serviceList.map((svc, idx) => ({
        id: billItems.length + idx + 1,
        note: svc.note || '',
        codes: [{
          code: svc.serviceCode || '-',
          description: svc.serviceName || '-',
          unitPrice: Number(svc.amount) || 0,
          unit: 1
        }]
      }));
      if (billType === 'ohip') {
        const highest = getHighestPriceService(newItems);
        setBillItems(highest);
        if (highest.length > 0) {
          const svc = highest[0].codes[0];
          showSuccessMessage(`Your optimal billing is ${svc.description} (${svc.code}), $${svc.unitPrice}`);
        }
      } else {
        setBillItems(prev => [...prev, ...newItems]);
        showSuccessMessage('Services added to bill preview successfully');
      }
    }
  };

  return (
    <AIBillContext.Provider value={{ handleAIAutoFill }}>
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Create New Bill
          </Typography>

          {/* Bill Type Selection */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <BillTypeSelector
              value={billType}
              onChange={setBillType}
            />
          </Paper>

          {/* Patient Name Input */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <TextField
              label="Patient Name"
              variant="outlined"
              fullWidth
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              error={patientNameError}
              helperText={patientNameError ? "Patient name is required" : ""}
            />
          </Paper>

          {/* Native Date Input */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Paper>

          {/* Dynamic Bill Form */}
          {billType === 'ohip' && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <OhipBillForm
                value={ohipForm}
                onChange={setOhipForm}
                onAdd={(item) => {
                  const newItem = {
                    id: billItems.length + 1,
                    ...item,
                    note: item.note !== undefined ? item.note : '',
                    codes: [{
                      code: item.serviceCode,
                      description: item.serviceName,
                      unitPrice: Number(item.amount) || 0,
                      unit: 1
                    }]
                  };
                  if (billType === 'ohip') {
                    setBillItems(getHighestPriceService([...(billItems || []), newItem]));
                    showSuccessMessage(`Your optimal billing is ${item.serviceName} (${item.serviceCode}), $${item.amount}`);
                  } else {
                    setBillItems([...(billItems || []), newItem]);
                  }
                  setOhipForm({
                    ohipNumber: '',
                    serviceCode: '',
                    serviceName: '',
                    amount: '',
                    note: '',
                  });
                }}
              />
            </Paper>
          )}
          {billType === 'private' && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <PrivateBillForm onAdd={(item) => {
                setBillItems([
                  ...billItems,
                  {
                    id: billItems.length + 1,
                    note: item.note || '',
                    codes: [
                      {
                        code: item.service || '-',
                        description: item.service || '-',
                        unitPrice: Number(item.amount) || 0,
                        unit: 1
                      }
                    ],
                    hospitalPolicy: item.hospitalPolicy || undefined,
                    hasInsurance: item.hasInsurance,
                    insuranceCompany: item.insuranceCompany,
                    insuranceNumber: item.insuranceNumber,
                    serviceDate: item.serviceDate
                  }
                ]);
              }} />
            </Paper>
          )}
          {/* Edit Hospital Policy Button for OHIP/Private */}
          {(billType === 'ohip' || billType === 'private') && (
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setOpenPolicyDialog(true)}
              >
                Edit Hospital Policy
              </Button>
            </Box>
          )}
          {/* Hospital Policy Dialog */}
          <Dialog open={openPolicyDialog} onClose={() => setOpenPolicyDialog(false)}>
            <DialogTitle>Hospital Policy Settings</DialogTitle>
            <DialogContent>
              <TextField
                label="Overtime Multiplier"
                type="number"
                value={hospitalPolicy.overtimeMultiplier}
                onChange={e => setHospitalPolicy({ ...hospitalPolicy, overtimeMultiplier: parseFloat(e.target.value) })}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Weekend Multiplier"
                type="number"
                value={hospitalPolicy.weekendMultiplier}
                onChange={e => setHospitalPolicy({ ...hospitalPolicy, weekendMultiplier: parseFloat(e.target.value) })}
                fullWidth
                margin="normal"
              />
              <TextField
                label="After Hours Multiplier"
                type="number"
                value={hospitalPolicy.afterHoursMultiplier}
                onChange={e => setHospitalPolicy({ ...hospitalPolicy, afterHoursMultiplier: parseFloat(e.target.value) })}
                fullWidth
                margin="normal"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenPolicyDialog(false)}>Close</Button>
            </DialogActions>
          </Dialog>
          {/* Bill Preview */}
          <BillPreview
            billItems={billItems}
            onDelete={handleDelete}
            onEdit={handleEdit}
            multipliers={{
              overtime: hospitalPolicy.overtimeMultiplier,
              weekend: hospitalPolicy.weekendMultiplier,
              afterHours: hospitalPolicy.afterHoursMultiplier,
            }}
          />

          {/* Submit Button */}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={!patientName || billItems.length === 0}
            >
              Submit Bill
            </Button>
          </Box>

          {/* Error Message */}
          {errorMessage && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setErrorMessage('')}>
              {errorMessage}
            </Alert>
          )}

          {/* Success Message - Snackbar */}
          <Snackbar
            open={openSuccessSnackbar}
            autoHideDuration={3000}
            onClose={handleCloseSuccessSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert
              onClose={handleCloseSuccessSnackbar}
              severity="success"
              variant="filled"
              sx={{ width: '100%' }}
            >
              {successMessage}
            </Alert>
          </Snackbar>
        </Box>
      </Container>
    </AIBillContext.Provider>
  );
};

export default NewBill;