# Medical AI Billing Assistant - Deployment Guide

## Project Overview

The Medical AI Billing Assistant is a comprehensive full-stack application that automates medical billing processes through AI-powered voice interaction and intelligent service code lookup. The system combines OpenAI GPT-4, real-time voice processing, and RAG (Retrieval-Augmented Generation) technology to streamline billing workflows.

### Key Features
- **Real-time Voice Interaction**: Continuous voice chat using OpenAI Realtime API
- **Intelligent Service Lookup**: RAG-powered search through OHIP benefits database  
- **Automated Form Filling**: AI extracts billing information from natural language
- **Multi-modal Input**: Support for both text and voice interactions
- **Professional Bill Generation**: PDF generation with accurate service codes and fees

## Technology Stack

### Frontend
- **Framework**: React 18 with Vite
- **UI Library**: Material-UI (MUI)
- **Audio Processing**: Web Audio API
- **HTTP Client**: Axios
- **Routing**: React Router DOM

### Backend
- **Python API**: FastAPI with uvicorn
- **Node.js API**: Express.js
- **Real-time Communication**: WebSocket
- **AI Integration**: OpenAI GPT-4 and Realtime API
- **Vector Database**: Pinecone with LangChain
- **Data Processing**: Pandas, CSV parsing

### AI & Machine Learning
- **Language Model**: OpenAI GPT-4
- **Voice Processing**: OpenAI Realtime API
- **Embeddings**: OpenAI text-embedding-ada-002
- **Vector Search**: LangChain with Pinecone
- **Knowledge Base**: RAG with medical service data

## Project Structure

```
2025-summer-billing-chatbot/
├── frontend/                    # React frontend application
│   ├── src/
│   │   ├── Components/         # React components
│   │   ├── App.jsx            # Main application
│   │   └── main.jsx           # Entry point
│   ├── public/                # Static assets
│   ├── package.json           # Frontend dependencies
│   └── vite.config.js         # Vite configuration
│
├── backend/                    # Backend services
│   ├── api/                   # FastAPI endpoints
│   ├── services/              # Business logic
│   ├── models/                # Data models
│   ├── scripts/               # Data processing scripts
│   ├── data/                  # CSV data files
│   ├── main.py               # FastAPI server
│   ├── index.js              # Express server
│   ├── realtime_voice_server.py # WebSocket server
│   ├── requirements.txt       # Python dependencies
│   └── package.json          # Node.js dependencies
│
├── extracted_data/            # Processed medical service data
├── .env.example              # Environment variables template
├── README.md                 # Project documentation
└── install.sh               # Installation script
```

## Dependencies

### Frontend Dependencies (package.json)
```json
{
  "dependencies": {
    "@emotion/react": "^11.11.4",
    "@emotion/styled": "^11.11.5",
    "@mui/icons-material": "^5.15.21",
    "@mui/material": "^5.15.21",
    "axios": "^1.7.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.24.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "eslint": "^8.57.0",
    "eslint-plugin-react": "^7.34.2",
    "eslint-plugin-react-hooks": "^4.6.2",
    "eslint-plugin-react-refresh": "^0.4.7",
    "vite": "^5.3.1"
  }
}
```

### Backend Python Dependencies (requirements.txt)
```txt
fastapi==0.104.1
uvicorn==0.24.0
websockets==12.0
openai==1.3.7
langchain==0.1.0
langchain-openai==0.0.2
langchain-pinecone==0.0.3
pinecone-client==3.0.0
pandas==2.1.4
python-multipart==0.0.6
python-dotenv==1.0.0
pydantic==2.5.1
aiofiles==23.2.1
```

### Backend Node.js Dependencies (package.json)
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "mongoose": "^8.0.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "nodemon": "^3.0.2"
  }
}
```

## Environment Configuration

Create a `.env` file in the project root with the following variables:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
ASSISTANT_ID=your_openai_assistant_id_here

# Pinecone Configuration  
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=medical-bills

# API Endpoints
VITE_NODE_API=http://localhost:3033
VITE_PYTHON_API=http://localhost:3034

# Database Configuration (MongoDB)
MONGODB_URI=mongodb://localhost:27017/medical_billing
JWT_SECRET=your_jwt_secret_here

# Server Ports
PYTHON_API_PORT=3034
NODE_API_PORT=3033
VOICE_SERVER_PORT=3035
FRONTEND_PORT=5173
```

## Installation Instructions

### Prerequisites
- **Node.js**: 16.0 or higher
- **Python**: 3.8 or higher
- **npm**: 8.0 or higher
- **Git**: Latest version

### Quick Installation
```bash
# Run the installation script
chmod +x install.sh
./install.sh
```

### Manual Installation

#### 1. Backend Python Setup
```bash
cd backend
pip install -r requirements.txt
```

#### 2. Backend Node.js Setup  
```bash
cd backend
npm install
```

#### 3. Frontend Setup
```bash
cd frontend
npm install
```

#### 4. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your API keys
nano .env
```

#### 5. Data Setup
```bash
# Upload medical service data to Pinecone
cd backend
python scripts/upload_structured_data_to_pinecone.py
```

## Running the Application

### Development Mode

#### Start All Services
```bash
# Terminal 1: Python API Server
cd backend
python main.py

# Terminal 2: Node.js API Server
cd backend  
npm start

# Terminal 3: Real-time Voice Server
cd backend
python realtime_voice_server.py

# Terminal 4: Frontend Development Server
cd frontend
npm run dev
```

#### Access Points
- **Frontend Application**: http://localhost:5173
- **Python API**: http://localhost:3034
- **Node.js API**: http://localhost:3033
- **Voice WebSocket**: ws://localhost:3035

### Production Mode

#### Backend Deployment
```bash
# Python API with multiple workers
cd backend
uvicorn main:app --host 0.0.0.0 --port 3034 --workers 4

# Node.js API with PM2
cd backend
pm2 start index.js --name "billing-api"

# Voice Server
cd backend  
python realtime_voice_server.py
```



## Database Schema

### Required Tables/Collections

#### 1. Users Collection 
```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String, // hashed
  role: String, // "doctor", "admin", "billing"
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. Bills Collection (MongoDB)
```javascript
{
  _id: ObjectId,
  userId: ObjectId, // Reference to Users
  patientName: String,
  patientHealthCard: String,
  billType: String, // "OHIP", "Private", "Custom"
  services: [{
    code: String,
    description: String,
    fee: Number,
    quantity: Number
  }],
  totalAmount: Number,
  multiplier: Number, // For private billing
  status: String, // "draft", "submitted", "paid"
  createdAt: Date,
  updatedAt: Date
}
```

#### 3. Medical Services (Vector Database - Pinecone)
```javascript
// Stored in Pinecone with embeddings
{
  id: String, // Service code
  metadata: {
    code: String,
    description: String,
    fee: Number,
    category: String,
    type: String // "OHIP", "Private"
  },
  values: [Float] // OpenAI embeddings
}
```

### Database Setup Scripts

#### MongoDB Setup
```javascript
// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "username": 1 }, { unique: true })
db.bills.createIndex({ "userId": 1 })
db.bills.createIndex({ "createdAt": -1 })
db.bills.createIndex({ "status": 1 })
```

#### Pinecone Index Setup
```python
# Run this script to create Pinecone index
import pinecone

pinecone.init(api_key="your_pinecone_api_key")

# Create index with OpenAI embedding dimensions
pinecone.create_index(
    name="medical-bills",
    dimension=1536,  # OpenAI ada-002 embedding size
    metric="cosine"
)
```

## API Documentation

### Python FastAPI Endpoints

#### Chat with AI
```
POST /chat
Body: {
  "message": "string",
  "chat_history": []
}
Response: {
  "reply": "string", 
  "billInfo": {},
  "missingFields": []
}
```

#### Service Search
```
GET /api/pinecone-search?query=service_name&top_k=5
Response: {
  "result": {
    "code": "string",
    "name": "string", 
    "amount": number
  }
}
```

### Node.js Express Endpoints

#### Authentication
```
POST /api/signup
POST /api/signin
GET /api/profile
```

#### Bill Management
```
GET /api/bills
POST /api/create-bill
GET /api/bill/:id
PUT /api/bill/:id
DELETE /api/bill/:id
```

### WebSocket API
```
ws://localhost:3035
Messages:
- Audio data (binary)
- Control messages (JSON)
```

## Testing

### Unit Tests
```bash
# Backend Python tests
cd backend
python -m pytest

# Frontend tests  
cd frontend
npm test
```

### Integration Tests
```bash
# Test API endpoints
cd backend
python test_api.py

# Test voice functionality
python test_voice_server.py
```

## Deployment Checklist

### Pre-deployment
- [ ] All environment variables configured
- [ ] API keys validated and working
- [ ] Database connections tested
- [ ] Pinecone index populated with data
- [ ] All dependencies installed
- [ ] Tests passing

### Security
- [ ] API keys stored securely 
- [ ] CORS configured for production domains
- [ ] HTTPS enabled for all endpoints
- [ ] JWT secrets generated securely
- [ ] Database access restricted

### Performance
- [ ] Frontend build optimized
- [ ] API rate limiting implemented
- [ ] Database indexes created
- [ ] Caching configured where appropriate
- [ ] Load balancing configured

## Monitoring & Maintenance

### Logs
- Python API: uvicorn logs
- Node.js API: PM2 logs  
- Frontend: Browser console
- Voice Server: WebSocket connection logs

### Health Checks
```bash
# Check API status
curl http://localhost:3034/health
curl http://localhost:3033/health

# Check Pinecone connection
python -c "import pinecone; print('Pinecone OK')"
```

### Backup Procedures
- MongoDB: Regular database backups
- Pinecone: Export vector data
- Environment: Backup .env configurations
- Code: Git repository backups

## Support & Troubleshooting

### Common Issues
1. **Voice not working**: Check microphone permissions and WebSocket connection
2. **Service lookup failing**: Verify Pinecone API key and index population
3. **Authentication errors**: Check JWT secret and MongoDB connection
4. **CORS errors**: Configure CORS for your domain

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
python main.py
```

### Contact Information
For technical support and questions:
- **Development Team**: Medical AI Billing Team
- **Repository**: https://github.com/ottawa-ehospital/2025-summer-billing-chatbot
- **Documentation**: See README.md for detailed setup instructions

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Deployment Ready**: ✅ 