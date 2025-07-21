import React, { useEffect, useState } from 'react';
import {
    Box,
    Container,
    Typography,
    TextField,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Breadcrumbs,
    Grid,
    Button,
} from '@mui/material';
import { NavigateNext } from '@mui/icons-material';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';


const BillDetails = () => {
    const { id } = useParams(); // Get bill ID from URL params
    const [billData, setBillData] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');

    useEffect(() => {
        const fetchBillData = async () => {
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const response = await axios.get(`${import.meta.env.VITE_NODE_API}/billdetails/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const bill = response.data;
                console.log(bill)
                setBillData(bill);
                setSelectedDate(bill.date);
                setSelectedTime(bill.time);
            } catch (error) {
                console.error('Error fetching bill data:', error);
            }
        };
        fetchBillData();
    }, [id]);

    const calculateTotal = () => {
        if (!billData?.items) return 0;
    
        return billData.items.reduce((total, item) => {
            if (!item.codes) return total; // Ensure codes exist
    
            return total + item.codes.reduce((sum, code) => {
                return sum + (code.adjustedSubtotal ?? code.unitPrice * code.unit);
            }, 0);
        }, 0);
    };    

    if (!billData) return <Typography>Loading...</Typography>;

    return (
        <Container maxWidth={false} disableGutters sx={{ width: '100%', padding: '20px', mt: 2 }}>
            <Breadcrumbs separator={<NavigateNext fontSize="large" />} aria-label="breadcrumb" sx={{ mb: 2 }} variant="h4">
                <Link color="inherit" to='/dashboard?tab=Bills' style={{ color: 'inherit', textDecoration: 'none' }}>
                    Bills
                </Link>
                <Typography color="inherit" variant="h4">
                    {billData._id}
                </Typography>
            </Breadcrumbs>

            <Grid container spacing={2} sx={{ alignItems: 'end', mt: 3 }}>
                <Grid item xs={12} sm={6}>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        disabled
                        style={{ width: '100%', padding: '8px', fontSize: '16px', marginBottom: '8px' }}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <input
                        type="time"
                        value={selectedTime}
                        onChange={e => setSelectedTime(e.target.value)}
                        disabled
                        style={{ width: '100%', padding: '8px', fontSize: '16px', marginBottom: '8px' }}
                    />
                </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ my: 2, flexDirection: 'column' }}>
                <Grid item xs={12}>
                    <TextField label="Doctor Hospital" variant="outlined" fullWidth value={billData.doctorHospital} disabled sx={{ backgroundColor: '#f5f5f5' }} />
                </Grid>
                <Grid item xs={12}>
                    <TextField label="Doctor Name" variant="outlined" fullWidth value={billData.doctorName} disabled sx={{ backgroundColor: '#f5f5f5' }} />
                </Grid>
                <Grid item xs={12}>
                    <TextField label="Patient Name" variant="outlined" fullWidth value={billData.patient} disabled />
                </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
                Bill Items
            </Typography>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Item #</TableCell>
                            <TableCell>Note</TableCell>
                            <TableCell>Codes</TableCell>
                            <TableCell>Subtotal ($)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {billData.items.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{item.note}</TableCell>
                                <TableCell>
                                    {item.codes.map((code) => (
                                        <div key={code.code}>
                                            <Typography variant="body2">Code: {code.code}</Typography>
                                            <Typography variant="body2">Description: {code.description}</Typography>
                                            <Typography variant="body2">Unit Price: ${code.unitPrice.toFixed(2)}</Typography>
                                            <Typography variant="body2">Units: {code.unit}</Typography>
                                        </div>
                                    ))}
                                </TableCell>
                                <TableCell>
                                    ${item.codes.reduce((sum, code) => sum + code.unitPrice * code.unit, 0).toFixed(2)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Total Field */}
            <TextField
                label="Total ($)"
                variant="outlined"
                fullWidth
                value={calculateTotal().toFixed(2)} 
                disabled 
                InputProps={{
                readOnly: true,
                }}
                sx={{ mt: 3 }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, my: 3 }}>
                <Link to={`/printbill/${id}`}>
                    <Button variant="contained" color="primary">
                        Print Bill
                    </Button>
                </Link>
                <Link to='/dashboard?tab=Bills'>
                    <Button variant="outlined" color="primary">
                        Back to List
                    </Button>
                </Link>
            </Box>
        </Container>
    );
};

export default BillDetails;
