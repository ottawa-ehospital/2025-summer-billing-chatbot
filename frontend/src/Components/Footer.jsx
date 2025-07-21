import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import IconButton from '@mui/material/IconButton';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import { createTheme, ThemeProvider } from '@mui/material/styles';

// Default MUI theme
const defaultTheme = createTheme();

const Footer = () => {
    return (
        <ThemeProvider theme={defaultTheme}>
          {/* Footer Container */}
          <Box
            component="footer"
            sx={{
              py: 3,
              px: 2,
              mt: 'auto',
              backgroundColor: (theme) =>
                theme.palette.mode === 'light'
                  ? theme.palette.grey[200]
                  : theme.palette.grey[800],
            }}
          >
            <Container maxWidth="sm">
              {/* Copyright Notice */}
              <Typography variant="body1" align="center">
                {'© '}
                <Link color="inherit" href="/">
                  Your Website
                </Link>{' '}
                {new Date().getFullYear()}
                {'.'}
              </Typography>
    
              {/* Additional Links */}
              <Typography variant="body2" align="center">
                <Link color="inherit" href="#" sx={{ mx: 1 }}>
                  Privacy Policy
                </Link>
                {' | '}
                <Link color="inherit" href="#" sx={{ mx: 1 }}>
                  Terms of Service
                </Link>
                {' | '}
                <Link color="inherit" href="#" sx={{ mx: 1 }}>
                  Contact Us
                </Link>
              </Typography>

              {/* Social Media Icons */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <IconButton href="#" color="inherit">
                  <FacebookIcon />
                </IconButton>
                <IconButton href="#" color="inherit">
                  <TwitterIcon />
                </IconButton>
                <IconButton href="#" color="inherit">
                  <InstagramIcon />
                </IconButton>
              </Box>
            </Container>
          </Box>
        </ThemeProvider>
      );
}

export default Footer;