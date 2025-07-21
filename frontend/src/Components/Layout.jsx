import React from 'react'
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import NavBar from './NavBar'
import Footer from './Footer'
import { Container } from '@mui/material'
import { Outlet } from 'react-router-dom';
import ChatbotModal from './ChatbotModal';

const Layout = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <NavBar />
      <Box component='main' sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 0, width: '100%' }}>
        <Container maxWidth={false} disableGutters={true} sx={{ width: '100%', paddingLeft: 0, paddingRight: 0 }}>
          <CssBaseline />
          {children} {/* Render pages passed via props */}
          <Outlet /> {/* Render nested routes when used inside PrivateRoute */}
        </Container>
      </Box>
      <Footer />
      <ChatbotModal />
    </Box>
  )
}

export default Layout