import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Button,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import jsPDF from 'jspdf';

const BillPreview = ({ billItems, onDelete, onEdit, multipliers }) => {
  const totalAmount = billItems.reduce((sum, item) => {
    const codeObj = Array.isArray(item.codes) && item.codes.length > 0 ? item.codes[0] : {};
    const unitPrice = typeof codeObj.unitPrice === 'number' ? codeObj.unitPrice : 0;
    const unit = typeof codeObj.unit === 'number' ? codeObj.unit : 1;
    return sum + unitPrice * unit;
  }, 0);
  const multiplier = multipliers ? multipliers.overtime * multipliers.weekend * multipliers.afterHours : 1;
  const totalWithMultiplier = totalAmount * multiplier;
  const showMultiplier = multipliers && (multipliers.overtime !== 1 || multipliers.weekend !== 1 || multipliers.afterHours !== 1);

  // Dummy basic info for now (in real use, pass as props)
  const patientName = billItems[0]?.patientName || '';
  const date = billItems[0]?.date || '';
  const billType = billItems[0]?.billType || '';

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Invoice', 20, 30);
    doc.setFontSize(12);
    doc.text(`Patient Name: ${patientName}`, 20, 50);
    doc.text(`Date: ${date}`, 20, 65);
    doc.text(`Bill Type: ${billType}`, 20, 80);
    doc.text('Bill Items:', 20, 100);
    doc.setFont('courier', 'normal');
    doc.setFontSize(10);
    const jsonStr = JSON.stringify(billItems, null, 2);
    const lines = doc.splitTextToSize(jsonStr, 170);
    doc.text(lines, 20, 115);
    doc.save('invoice.pdf');
  };

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Bill Preview
      </Typography>
      <Button 
        onClick={handleDownloadPDF} 
        variant="contained" 
        color="primary" 
        sx={{ mb: 2 }}
        disabled={billItems.length === 0}
      >
        Download Invoice PDF
      </Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Unit Price</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {billItems.map((item) => {
              const codeObj = Array.isArray(item.codes) && item.codes.length > 0 ? item.codes[0] : {};
              const code = codeObj.code || '-';
              const description = codeObj.description || item.note || '-';
              const unitPrice = typeof codeObj.unitPrice === 'number' ? codeObj.unitPrice : 0;
              const unit = typeof codeObj.unit === 'number' ? codeObj.unit : 1;

              return (
                <TableRow key={item.id}>
                  <TableCell>{code}</TableCell>
                  <TableCell>{description}</TableCell>
                  <TableCell>${unitPrice}</TableCell>
                  <TableCell>{unit}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => onEdit(item)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => onDelete(item.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {/* Total amount row */}
            <TableRow>
              <TableCell colSpan={4} align="right"><b>Total Amount:</b></TableCell>
              <TableCell>
                <b>${totalAmount.toFixed(2)}</b>
              </TableCell>
            </TableRow>
            {showMultiplier && (
              <TableRow>
                <TableCell colSpan={4} align="right"><b>Total with Multiplier:</b></TableCell>
                <TableCell>
                  <b>${totalWithMultiplier.toFixed(2)}</b>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default BillPreview; 