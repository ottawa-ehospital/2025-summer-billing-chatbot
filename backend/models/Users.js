const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    name: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    image: { type: String, required: false},
    hospital: { type: String, required: false },
    specialties: { type: [String], required: false }
})

const UserModel = mongoose.model("users", UserSchema)

module.exports = UserModel

/**
 * sample
    {
        name: "Dr. Smith",
        email: "dr.smith@example.com",
        image: "https://www.aege.com/wgagege.jpg", 
        hospital: "General Hospital",
        specialty: ["Cardiology", "Internal Medicine"] // Now an array
    }
 */