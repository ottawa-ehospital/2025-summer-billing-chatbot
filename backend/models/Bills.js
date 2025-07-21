const mongoose = require('mongoose')

const BillSchema = new mongoose.Schema({
    date: { type: Date, required: true },  
    time: { type: String, required: true },  
    doctorName: { type: String, required: true },
    doctorEmail: { type: String, required: true },
    doctorHospital: { type: String, required: true },
    patient: { type: String, required: true },
    billType: { 
        type: String, 
        required: true, 
        enum: ['ohip', 'private', 'custom'] 
    },
    items: [{
        note: { type: String, required: false, minlength: 0 },
        codes: [{
            code: { type: String, required: true },
            description: { type: String, required: false },
            unitPrice: { type: Number, required: true },
            unit: { type: Number, required: true }
        }],
        // For OHIP bills
        ohipNumber: { type: String },
        diagnosisCode: { type: String },
        serviceCode: { type: String },
        // For Private bills
        serviceType: { type: String },
        serviceDescription: { type: String },
        amount: { type: Number },
        // Hospital policy
        hospitalPolicy: {
            overtimeMultiplier: { type: Number, default: 1.5 },
            weekendMultiplier: { type: Number, default: 2.0 },
            afterHoursMultiplier: { type: Number, default: 1.8 },
            appliedBonuses: [{
                type: { type: String, enum: ['overtime', 'weekend', 'afterHours'] },
                amount: { type: Number },
                description: { type: String }
            }]
        },
        // Settlement info for OHIP bills
        settlementInfo: {
            status: { 
                type: String, 
                enum: ['pending', 'submitted', 'approved', 'rejected'],
                default: 'pending'
            },
            submittedAt: { type: Date },
            approvedAt: { type: Date },
            rejectionReason: { type: String }
        }
    }],
    totalAmount: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['draft', 'submitted', 'paid', 'rejected'],
        default: 'draft'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
})

// Update the updatedAt timestamp before saving
BillSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const BillModel = mongoose.model("bills", BillSchema)

module.exports = BillModel
