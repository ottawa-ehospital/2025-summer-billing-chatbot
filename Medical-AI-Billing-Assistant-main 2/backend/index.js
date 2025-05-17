require('dotenv').config(); // Add this at the very top
const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors')

const UserModel = require('./models/Users')
const BillModel = require('./models/Bills')

const app = express()
app.use(cors())
app.use(express.json())

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI) // Modified this line
        console.log(`MongoDB Connected at: ${conn.connection.host}`)
    } catch (error) {
        console.error(error)
        process.exit(1)
    }
}

connectDB()

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

// sign-in route
app.post('/signin', async (req, res) => {
    const { email, password } = req.body

    try {
        const user = await UserModel.findOne({ email })

        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" })
        }

        const isMatched = await bcrypt.compare(password, user.password)
        if (!isMatched) {
            return res.status(400).json({ message: "Invalid email or password" })
        }

        const token = jwt.sign({ id: user._id }, 'secretkey', { expiresIn: '1h' });

        res.status(200).json({ token, user, message: "Success" })
    } catch (error) {
        res.status(500).json({ message: "Server error", error })
    }
})

// sign-up route
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body

    try {
        const existingUser = await UserModel.findOne({ email: email })

        if (existingUser) {
            return res.status(400).json({ message: "Email already in use." })
        }

        const hasedPassword = await bcrypt.hash(password, 10)

        const newUser = new UserModel({ name, email, password: hasedPassword })
        await newUser.save()

        res.status(201).json({ message: "User registered successfully." })
    } catch (error) {
        res.status(500).json({ message: "Check all fileds.", error })
    }
})

// Profile route (Fetch user data)
app.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId).select('-password');
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

// Update Profile
app.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { name, hospital, specialties } = req.body;

        const updatedUser = await UserModel.findByIdAndUpdate(
            req.userId,
            { name, hospital, specialties },
            { new: true }
        );

        res.json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: "Error updating profile", error });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`)
})

// Change Password
app.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Find user by ID
        const user = await UserModel.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        // Hash the new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update the password in the database
        user.password = hashedNewPassword;
        await user.save();

        res.json({ message: "Password updated successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Error updating password", error });
    }
});

app.post('/create-bill', authenticateToken, async (req, res) => {
    try {
        const { date, time, doctorName, doctorEmail, doctorHospital, patient, items } = req.body;

        // Ensure required fields are present
        if (!date || !time || !doctorName || !doctorEmail || !doctorHospital || !patient || !items || items.length === 0) {
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

        // Check if doctor exists using email (since name can be duplicate)
        const doctorUser = await UserModel.findOne({ email: doctorEmail });
        if (!doctorUser) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        // Create new bill object
        const newBill = new BillModel({
            date: validDate, // Store as Date object
            time,
            doctorName, // Doctor name from frontend
            doctorEmail, // Email used for identification
            doctorHospital,
            patient,
            items
        });

        await newBill.save();
        res.status(201).json({ message: "Bill created successfully", bill: newBill });
    } catch (error) {
        res.status(500).json({ message: "Error creating bill", error });
    }
});

app.get('/bills', authenticateToken, async (req, res) => {
    try {
        const bills = await BillModel.find();

        // Process bills before sending response
        const formattedBills = bills.map((bill) => {
            // Get all codes as a string in "code1, code2, ..." format
            const allCodes = bill.items.flatMap(item => item.codes.map(code => code.code)).join(', ');

            // Calculate total cost
            const totalAmount = bill.items.reduce((sum, item) => {
                return sum + item.codes.reduce((subTotal, code) => subTotal + (code.unitPrice * code.unit), 0);
            }, 0);

            return {
                id: bill._id,
                date: new Date(bill.date).toISOString().split('T')[0], // Format date as YYYY-MM-DD
                time: bill.time,
                doctor: bill.doctorName,
                patient: bill.patient,
                notes: bill.items.length > 0 ? bill.items[0].note : '',
                codes: allCodes,
                total: totalAmount.toFixed(2) // Keep two decimal places
            };
        });

        res.json(formattedBills);
    } catch (error) {
        res.status(500).json({ message: "Error fetching bills", error });
    }
});

app.delete('/bills/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const deletedBill = await BillModel.findByIdAndDelete(id);
        if (!deletedBill) {
            return res.status(404).json({ message: "Bill not found" });
        }
        res.json({ message: "Bill deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting bill", error });
    }
});


// Fetch a single bill by ID
app.get('/billdetails/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const bill = await BillModel.findById(id);
        if (!bill) {
            return res.status(404).json({ message: "Bill not found" });
        }
        res.json(bill);
    } catch (error) {
        res.status(500).json({ message: "Error fetching bill", error });
    }
});

// Update a bill (edit mode)
app.put('/billdetails/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updatedBill = await BillModel.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedBill) {
            return res.status(404).json({ message: "Bill not found" });
        }
        res.json(updatedBill);
    } catch (error) {
        res.status(500).json({ message: "Error updating bill", error });
    }
});



