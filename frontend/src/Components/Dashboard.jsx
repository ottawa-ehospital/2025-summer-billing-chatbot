import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom'; // Import useSearchParams
import {
    Box,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Container,
    Toolbar,
    useMediaQuery,
    ThemeProvider,
    createTheme,
    Tooltip,
    Divider,
} from '@mui/material';
import {
    MedicalServices as MedicalServicesIcon,
    PostAdd as PostAddIcon,
} from '@mui/icons-material';

import Bills from './Bills';
import NewRecord from './NewBill';

// Create a custom theme (optional)
const theme = createTheme();

const Dashboard = () => {
    const [searchParams] = useSearchParams(); // Get query params
    const tabParam = searchParams.get('tab'); // Read tab from URL

    // State to manage the selected item
    const [selectedItem, setSelectedItem] = useState('New Bill');

    // Update state when tabParam changes
    useEffect(() => {
        if (tabParam) {
            setSelectedItem(tabParam); // Set based on URL parameter
        }
    }, [tabParam]);

    // Check if the screen is small
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

    // List of items in the side column
    const sideColumnItems = [
        { text: 'New Bill', icon: <PostAddIcon /> },
        { text: 'Bills', icon: <MedicalServicesIcon /> },
    ];

    // Function to handle item click
    const handleItemClick = (item) => {
        setSelectedItem(item);
    };

    // Sub-level components to render in the right column
    const renderSubLevelComponent = () => {
        switch (selectedItem) {
            case 'Bills':
                return <Bills />;
            case 'New Bill':
                return <NewRecord />;
            default:
                return null;
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <Box sx={{ display: 'flex', flexGrow: 1, width: '100%' }}>
                {/* Side Column (Left) */}
                <Box
                    sx={{
                        width: isSmallScreen ? 56 : 240, 
                        maxWidth: 240,
                        flexShrink: 0,
                        backgroundColor: 'background.paper', // Match the background color
                        borderRight: '1px solid', 
                        borderColor: 'divider',
                        height: 'calc(100vh - 64px)', 
                        overflow: 'auto',
                    }}
                >
                    <List>
                        {sideColumnItems.map((item) => (
                            <ListItem key={item.text} disablePadding>
                                <Tooltip title={isSmallScreen ? item.text : ''} placement="right" arrow>
                                    <ListItemButton
                                        selected={selectedItem === item.text}
                                        onClick={() => handleItemClick(item.text)}
                                        sx={{
                                            minHeight: 48,
                                            justifyContent: isSmallScreen ? 'center' : 'flex-start', // Center icons on small screens
                                            px: 2.5,
                                        }}
                                    >
                                        <ListItemIcon
                                            sx={{
                                                minWidth: 0,
                                                mr: isSmallScreen ? 0 : 2, // Adjust margin based on screen size
                                                justifyContent: 'center',
                                            }}
                                        >
                                            {item.icon}
                                        </ListItemIcon>
                                        {!isSmallScreen && <ListItemText primary={item.text} />}
                                    </ListItemButton>
                                </Tooltip>
                            </ListItem>
                        ))}
                    </List>
                    <Divider /> {/* Add a divider at the bottom */}
                </Box>

                {/* Major Column (Right) */}
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        p: 3,
                        height: 'calc(100vh - 64px)', // Adjust height to fit between NavBar and Footer
                        overflow: 'auto', // Add scroll if content overflows
                    }}
                >
                    {renderSubLevelComponent()}
                </Box>
            </Box>
        </ThemeProvider>
    );
};

export default Dashboard;