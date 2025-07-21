import React, { useEffect, useState } from 'react';
import {
    Box,
    Breadcrumbs,
    Button,
    Container,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import { NavigateNext } from '@mui/icons-material';
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Link, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs'



const PrintBill = () => {
    const { id } = useParams();
    const location = useLocation();
    const auto = new URLSearchParams(location.search).get('auto');
    const [billData, setBillData] = useState(null);
    const printRef = React.useRef(null);

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
                console.log(billData)
            } catch (error) {
                console.error('Error fetching bill data:', error);
            }
        };

        fetchBillData();
    }, [id]);

    useEffect(() => {
        if (auto === '1' && billData) {
            // Slight delay to ensure DOM has rendered
            setTimeout(() => {
                handleDownloadPdf();
            }, 300);
        }
    }, [auto, billData]);

    const handleDownloadPdf = async () => {
        const element = printRef.current;
        if (!element) {
            return;
        }

        const canvas = await html2canvas(element, {
            scale: 2,
        });
        const data = canvas.toDataURL("image/png");

        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "px",
            format: "a4",
        });

        const imgProperties = pdf.getImageProperties(data);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProperties.height * pdfWidth) / imgProperties.width;

        pdf.addImage(data, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save("bill.pdf");
    };

    const calculateTotal = () => {
        if (!billData?.items) return 0;

        return billData.items.reduce((total, item) => {
            if (!item.codes) return total; // Ensure codes exist

            return total + item.codes.reduce((sum, code) => {
                return sum + (code.adjustedSubtotal ?? code.unitPrice * code.unit);
            }, 0);
        }, 0);
    };

    if (!billData) {
        return <Typography>Loading...</Typography>;
    }

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Breadcrumbs separator={<NavigateNext fontSize="large" />} aria-label="breadcrumb" sx={{ mb: 2 }} variant="h4">
                <Link color="inherit" to='/dashboard?tab=Bills' style={{ color: 'inherit', textDecoration: 'none' }}>Bills</Link>
                <Link color="inherit" to={`/billdetails/${id}/view`} style={{ color: 'inherit', textDecoration: 'none' }}>{id}</Link>
                <Typography color="inherit" variant="h4">Print</Typography>
            </Breadcrumbs>
            <Paper elevation={3} sx={{ p: 3 }}>
                <Box ref={printRef} sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
                        <Box>
                            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>MEDICAL BILL</Typography>
                            <Typography variant="body1">Bill #: {billData._id}</Typography>
                            <Typography variant="body1">Date: {dayjs(billData.date).format('YYYY-MM-DD HH:mm')}</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h6" gutterBottom>{billData.doctorHospital}</Typography>
                            <Typography variant="body1" gutterBottom sx={{ fontWeight: 'bold' }}>Dr. {billData.doctorName}</Typography>
                            <Typography variant="body2">123 Medical Street</Typography>
                            <Typography variant="body2">City, State 12345</Typography>
                            <Typography variant="body2">Phone: (123) 456-7890</Typography>
                        </Box>
                    </Box>
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>PATIENT INFORMATION</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            <Typography variant="body1" sx={{ minWidth: 200 }}><strong>Name:</strong> {billData.patient}</Typography>
                            <Typography variant="body1"><strong>Date of Service:</strong> {billData.date.split('T')[0]}</Typography>
                        </Box>
                    </Box>
                    <TableContainer component={Paper} sx={{ mb: 4 }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Item #</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Unit Price ($)</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Qty</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Subtotal ($)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {billData?.items?.map((item, itemIndex) => (
                                    item.codes.map((code, codeIndex) => (
                                        <TableRow key={`${item.id}-${code.id}`}>
                                            <TableCell>{itemIndex + 1}</TableCell>
                                            <TableCell sx={{ display: 'flex' }}>
                                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{code.code}</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: '' }}>&nbsp;- {code.description}</Typography>
                                            </TableCell>
                                            <TableCell align="right">{code.unitPrice.toFixed(2)}</TableCell>
                                            <TableCell align="right">{code.unit}</TableCell>
                                            <TableCell>
                                                ${item.codes.reduce((sum, code) => sum + code.unitPrice * code.unit, 0).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Box sx={{ width: 300 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body1"><strong>Subtotal:</strong></Typography>
                                <Typography variant="body1">${calculateTotal()?.toFixed(2)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e0e0e0', pt: 1, mt: 1 }}>
                                <Typography variant="h6"><strong>Total:</strong></Typography>
                                <Typography variant="h6"><strong>${calculateTotal()?.toFixed(2)}</strong></Typography>
                            </Box>
                        </Box>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 3 }}>
                    <Link to='/dashboard?tab=Bills' style={{ textDecoration: 'none' }}>
                        <Button variant="outlined" color="primary" sx={{ px: 4, py: 2 }}>Back to List</Button>
                    </Link>
                    <Link to={`/billdetails/${id}/view`} style={{ textDecoration: 'none' }}>
                        <Button variant="outlined" color="primary" sx={{ px: 4, py: 2 }}>Back to Bill</Button>
                    </Link>
                    <Button variant="contained" onClick={handleDownloadPdf} sx={{ px: 4, py: 2 }}>Download PDF</Button>
            </Box>
        </Paper>
        </Container >
    );
};

export default PrintBill;
