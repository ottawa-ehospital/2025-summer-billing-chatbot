import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

import SigninPage from './Components/SigninPage.jsx'
import SignupPage from './Components/SignupPage.jsx'
import Layout from './Components/Layout.jsx'
import Dashboard from './Components/Dashboard.jsx'
import BillDetails from './Components/BillDetails.jsx'
import PrintBill from './Components/PrintBill.jsx'
import RealtimeVoiceChat from './Components/RealtimeVoiceChat.jsx'
import PrivateRoute from "./Components/PrivateRoute.jsx";


import { useEffect, useState } from "react";

const App = () => {
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
            <Route path="/voice-chat" element={<RealtimeVoiceChat />}/> 
          </Route>
        </Route>
      </Routes>
    </Router>
  )
}

export default App