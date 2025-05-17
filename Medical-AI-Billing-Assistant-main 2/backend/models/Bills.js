const mongoose = require('mongoose')

const BillSchema = new mongoose.Schema({
    date: { type: Date, required: true },  
    time: { type: String, required: true },  
    doctorName: { type: String, required: true },
    doctorEmail: { type: String, required: true },
    doctorHospital: { type: String, required: true },
    patient: { type: String, required: true },
    items: [{
        note: { type: String, required: true },
        codes: [{
            code: { type: String, required: true },
            description:  { type: String, required: true },
            unitPrice: { type: Number, required: true },
            unit: { type: Number, required: true }
        }]
    }]
})

const BillModel = mongoose.model("bills", BillSchema)

module.exports = BillModel

/**
 * sample
    {   
        "date": "2025-03-29",
        "time": "14:30",
        doctorName: "John Doe",
        doctorEmail: "jdoe@gmail.com",
        doctorHospital: "Queensway Hospital",
        patient: "Jane Doe",
        items: [{
            note: 'Common Cold - Patient complained of fever and sore throat.',
            codes: [
                {
                    code: 'ICD-10: J00',
                    description: 'Acute nasopharyngitis (common cold)',
                    unitPrice: 19.99,
                    unit: 2,
                },
                {
                    code: 'CPT: 99213',
                    description: 'Office or other outpatient visit',
                    unitPrice: 75.0,
                    unit: 1,
                }
            ],
        },{
            note: 'Migraine - Patient reported severe headaches and sensitivity to light.',
            codes: [
                {
                    code: 'ICD-10: G43',
                    description: 'Migraine without aura',
                    unitPrice: 29.99,
                    unit: 1,
                },
                {
                    code: 'HCPCS: J1030',
                    description: 'Injection, methylprednisolone acetate',
                    unitPrice: 15.0,
                    unit: 2,
                }，
                {
                    code: 'ICD-10: R51',
                    description: 'Headache',
                    unitPrice: 10.0,
                    unit: 1,
                }
            ],
        }]
    }
 */