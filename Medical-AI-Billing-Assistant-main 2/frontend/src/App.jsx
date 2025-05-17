import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

import SigninPage from './Components/SigninPage'
import SignupPage from './Components/SignupPage'
import Layout from './Components/Layout'
import Dashboard from './Components/Dashboard'
import BillDetails from './Components/BillDetails.jsx'
import PrintBill from './Components/PrintBill'
import PrivateRoute from "./Components/PrivateRoute";

import { useEffect, useState } from "react";

const App = () => {

  // const [isAuthenticated, setIsAuthenticated] = useState(false);

  // useEffect(() => {
  //   // Check if JWT token exists in localStorage
  //   const token = localStorage.getItem("token");
  //   setIsAuthenticated(!!token); // Convert to boolean
  // }, []);

  // useEffect(() => {
  //   // Watch for token changes (logout or login)
  //   const handleStorageChange = () => {
  //     const token = localStorage.getItem("token");
  //     setIsAuthenticated(!!token);
  //   };

  //   window.addEventListener("storage", handleStorageChange);
  //   return () => window.removeEventListener("storage", handleStorageChange);
  // }, []);

  const isAuthenticated = true;
  
  return (
    <Router basename="">
      <Routes>

        {/* Default Route '/' - Redirect Based on Auth */}
        {/* <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/signin" />} /> */}

        <Route path="/" element={<Navigate to="/dashboard" />} />

        {/* Public Routes */}
        {/* <Route path="/signin" element={<Layout><SigninPage setIsAuthenticated={setIsAuthenticated} /></Layout>} /> */}
        <Route path="/signin" element={<Layout><SigninPage /></Layout>} />
        <Route path="/signup" element={<Layout><SignupPage /></Layout>} />

        {/* Protected Routes inside PrivateRoute */}
        <Route element={<PrivateRoute isAuthenticated={isAuthenticated} />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/billdetails/:id/:mode" element={<BillDetails />}/>
            <Route path="/printbill/:id" element={<PrintBill />}/> 
          </Route>
        </Route>
      </Routes>
    </Router>
  )
}

export default App