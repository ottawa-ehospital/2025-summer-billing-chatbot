import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  TablePagination,
  TableSortLabel,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
// import Link from '@mui/material/Link';
import { Link } from 'react-router-dom';
import BillDetails from './BillDetails.jsx';
import axios from 'axios';



const Bills = () => {
  // State for bills data
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // State for sorting
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('date');

  // Fetch bills from backend
  const fetchBills = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_NODE_API}/api/bills`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBills(response.data);
      console.log(response.data)
    } catch (error) {
      console.error("Error fetching bills:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  // Handlers for pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handlers for sorting
  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this bill?")) {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        await axios.delete(`${import.meta.env.VITE_NODE_API}/bills/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchBills(); // Refresh the table
      } catch (error) {
        console.error("Error deleting bill:", error);
      }
    }
  };

  // Function to truncate text to 20 characters
  const truncateText = (text) => {
    return text.length > 20 ? `${text.substring(0, 20)}...` : text;
  };

  // Function to sort data
  const stableSort = (array, comparator) => {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
  };

  // Comparator function
  const getComparator = (order, orderBy) => {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  };

  const descendingComparator = (a, b, orderBy) => {
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
    return 0;
  };

  // Paginated and sorted data
  const sortedData = stableSort(bills, getComparator(order, orderBy));
  const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth={false} disableGutters={true} sx={{ width: '100%', paddingLeft: 0, paddingRight: 0 }}>
      {/* Page Title */}
      <Typography variant="h4" gutterBottom>
        Bills
      </Typography>

      {/* Bills Table */}
      <TableContainer component={Paper}>
        <Table>
          {/* Table Header */}
          <TableHead>
            <TableRow>
              {['Date', 'Time', 'Doctor', 'Patient', 'Type', 'Notes', 'Codes', 'Total ($)'].map((column) => (
                <TableCell key={column}>
                  <TableSortLabel
                    active={orderBy === column.toLowerCase()}
                    direction={orderBy === column.toLowerCase() ? order : 'asc'}
                    onClick={() => handleSort(column.toLowerCase())}
                  >
                    {column}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>

          {/* Table Body */}
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : paginatedData.map((bill) => (
              <TableRow key={bill.id}>
                <TableCell>{bill.date}</TableCell>
                <TableCell>{bill.time}</TableCell>
                <TableCell>{bill.doctor}</TableCell>
                <TableCell>{bill.patient}</TableCell>
                <TableCell>
                  {bill.billType === 'ohip' && 'OHIP'}
                  {bill.billType === 'private' && (bill.hasInsurance === 'yes' ? 'Private (with insurance)' : 'Private (no insurance)')}
                  {bill.billType === 'custom' && 'Custom'}
                </TableCell>
                <TableCell>{truncateText(bill.notes)}</TableCell>
                <TableCell>{bill.codes}</TableCell>
                <TableCell>{bill.total}</TableCell>
                <TableCell align="center">
                  <Tooltip title="View">
                    <Link to={`/billdetails/${bill.id}/view`}>
                      <IconButton aria-label="view"><ViewIcon /></IconButton>
                    </Link>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton aria-label="delete" onClick={() => handleDelete(bill.id)}><DeleteIcon /></IconButton>
                  </Tooltip>
                  <Tooltip title="Print">
                    <Link to={`/printbill/${bill.id}`}>
                      <IconButton aria-label="print"><PrintIcon /></IconButton>
                    </Link>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={bills.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Container>
  );
};

export default Bills;