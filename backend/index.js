require('dotenv').config(); 
const express = require('express')
const axios = require('axios');
const { getTable, insertRow } = require('./ehospitalClient');
const bodyParser = require('body-parser');
const cors = require('cors')
const csv = require('csvtojson');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express()
// CORS handled by Nginx reverse proxy
// app.use(cors())
app.use(express.json())

const PORT = 3033

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    jwt.verify(token.split(' ')[1], 'secretkey', (err, decoded) => {
        if (err) return res.status(403).json({ message: "Invalid token" });
        req.userId = decoded.id;
        next();
    });
};



app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`)
})

app.post('/api/create-bill', async (req, res) => {
    console.log('Received body:', JSON.stringify(req.body, null, 2));
    try {
        const { 
            date, 
            time, 
            doctorName, 
            doctorEmail, 
            doctorHospital, 
            patient, 
            billType,
            items 
        } = req.body;

        // Ensure required fields are present
        if (!date || !time || !doctorName || !doctorEmail || !doctorHospital || !patient || !billType || !items || items.length === 0) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Validate that the date is a valid ISO date
        const validDate = new Date(date);
        if (isNaN(validDate.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
        }

        // Validate time format (HH:mm)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(time)) {
            return res.status(400).json({ message: "Invalid time format. Use HH:mm" });
        }

        // Calculate total amount
        const totalAmount = items.reduce((sum, item) => {
            const itemTotal = item.codes.reduce((subTotal, code) => subTotal + (code.unitPrice * code.unit), 0);
            // Add hospital policy bonuses if applicable
            if (item.hospitalPolicy && item.hospitalPolicy.appliedBonuses) {
                const bonuses = item.hospitalPolicy.appliedBonuses.reduce((bonusSum, bonus) => bonusSum + bonus.amount, 0);
                return sum + itemTotal + bonuses;
            }
            return sum + itemTotal;
        }, 0);

        // Create new bill object
        const newBill = {
            _id: uuidv4(),
            date: validDate,
            time,
            doctorName,
            doctorEmail,
            doctorHospital,
            patient,
            billType,
            items,
            totalAmount,
            status: 'draft'
        };

        await insertRow('bills', newBill);
        console.log('Bill saved:', newBill);
        res.status(201).json({ message: "Bill created successfully", billId: newBill._id });
    } catch (error) {
        console.error('Error saving bill:', error);
        res.status(500).json({ message: "Error creating bill", error });
    }
});

app.get('/api/bills', async (req, res) => {
    try {
        const bills = await getTable('bills');

        // Process bills before sending response
        const formattedBills = bills.map((bill) => {
            // Get all codes as a string in "code1, code2, ..." format
            const allCodes = bill.items.flatMap(item => item.codes.map(code => code.code)).join(', ');

            return {
                id: bill._id,
                date: new Date(bill.date).toISOString().split('T')[0],
                time: bill.time,
                doctor: bill.doctorName,
                patient: bill.patient,
                billType: bill.billType,
                notes: bill.items.length > 0 ? bill.items[0].note : '',
                codes: allCodes,
                total: bill.totalAmount.toFixed(2),
                status: bill.status
            };
        });

        res.json(formattedBills);
    } catch (error) {
        res.status(500).json({ message: "Error fetching bills", error });
    }
});

app.delete('/api/bills/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        // Deletion not supported; respond 501
        return res.status(501).json({ message: 'Delete not implemented in external DB' });
    } catch (error) {
        res.status(500).json({ message: "Error deleting bill", error });
    }
});

// Fetch a single bill by ID
app.get('/api/billdetails/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const bill = await getTable('bills').find(b => b._id.toString() === id);
        if (!bill) {
            return res.status(404).json({ message: "Bill not found" });
        }
        res.json(bill);
    } catch (error) {
        res.status(500).json({ message: "Error fetching bill", error });
    }
});

// Update a bill (edit mode)
app.put('/api/billdetails/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updatedBill = await getTable('bills').findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedBill) {
            return res.status(404).json({ message: "Bill not found" });
        }
        res.json(updatedBill);
    } catch (error) {
        res.status(500).json({ message: "Error updating bill", error });
    }
});

// Get OHIP services
app.get('/api/services', async (req, res) => {
    try {
        const dataDir = path.join(__dirname, 'data');
        const files = await fs.promises.readdir(dataDir);
        const csvFiles = files.filter(file => file.startsWith('dataset_schedule_of_benefits') && file.endsWith('.csv'));
        
        let allServices = [];
        
        for (const file of csvFiles) {
            const csvFilePath = path.join(dataDir, file);
            const jsonArray = await csv().fromFile(csvFilePath);
            const services = jsonArray.map(row => {
                let name = row.Description && row.Description.trim();
                if (!name || name === '') {
                    // 拼接 Category 字段
                    const cats = [row.Category]
                        .filter(Boolean)
                        .map(s => s.trim())
                        .filter(s => s !== '' && s !== 'Not applicable' && s !== 'GENERAL LISTINGS');
                    name = cats.join(' / ');
                }
                return {
                    code: row['Billing Code'],
                    name,
                    amount: parseFloat(row['Charge $'] || 0)
                };
            }).filter(s => s.code && s.name && s.name !== '');
            
            allServices = [...allServices, ...services];
        }
        
        // 去重，保留最新的记录
        const uniqueServices = allServices.reduce((acc, curr) => {
            const existing = acc.find(item => item.code === curr.code);
            if (!existing) {
                acc.push(curr);
            }
            return acc;
        }, []);
        
        res.json(uniqueServices);
    } catch (error) {
        console.error('Error in /api/services:', error);
        res.status(500).json({ message: "Error fetching services", error });
    }
});

// Update bill status
app.put('/api/bills/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['draft', 'submitted', 'paid', 'rejected'].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const updatedBill = await getTable('bills').findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!updatedBill) {
            return res.status(404).json({ message: "Bill not found" });
        }

        res.json(updatedBill);
    } catch (error) {
        res.status(500).json({ message: "Error updating bill status", error });
    }
});



