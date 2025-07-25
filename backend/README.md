# Medical Billing Assistant

A comprehensive AI-powered medical billing assistant with real-time voice interaction, intelligent service code lookup, and automated form filling capabilities.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Overview

The Medical Billing Assistant is a full-stack application designed to streamline medical billing processes through AI-powered automation. It combines real-time voice interaction, intelligent service code lookup using RAG (Retrieval-Augmented Generation), and automated form filling to significantly improve billing efficiency and accuracy.

### Key Technologies

- **Frontend**: React 19, Vite, Material-UI, Web Audio API
- **Backend**: Python FastAPI, Node.js Express, WebSocket
- **AI Integration**: OpenAI GPT-4, OpenAI Realtime API, LangChain
- **Vector Database**: Pinecone for semantic search

## Features

### Core Functionality

- **Real-time Voice Chat**: Continuous voice interaction with AI using OpenAI Realtime API
- **Intelligent Service Lookup**: RAG-powered search through OHIP benefits database
- **Automated Form Filling**: AI extracts billing information from natural language
- **Multi-modal Input**: Support for both text and voice interactions
- **Service Code Mapping**: Automatic matching of medical services to billing codes

### Billing Types Support

- **OHIP Billing**: Ontario Health Insurance Plan billing with accurate fee schedules
- **Private Billing**: Private insurance billing with configurable multipliers
- **Custom Billing**: Hospital-specific billing configurations

### Advanced Features

- **Knowledge Base Integration**: Semantic search through medical service databases
- **Multi-service Recognition**: Intelligent parsing of complex medical service descriptions
- **Real-time Audio Streaming**: Continuous, seamless audio playback
- **PDF Generation**: Automated invoice generation with detailed breakdowns
- **User Authentication**: Secure login and session management

## Architecture

### System Overview

```
Frontend (React)
    ↓
├── Node.js Backend (Express) ← User data, billing CRUD
│   └── External API Integration
│
├── Python Backend (FastAPI) ← AI processing, RAG
│   ├── OpenAI Integration
│   ├── LangChain RAG Service
│   └── Pinecone Vector Database
│
└── Real-time Voice Server (WebSocket) ← Voice interaction
    └── OpenAI Realtime API
```

### Component Structure

**Frontend Components**:
- `ChatbotModal`: AI chat interface with voice/text modes
- `RealtimeVoiceChat`: Dedicated real-time voice interface
- `NewBill`: Bill creation with AI auto-fill
- `BillTypeSelector`: OHIP/Private/Custom billing selection
- Various form components for different billing types

**Backend Services**:
- `enhanced_rag_service`: LangChain-powered semantic search
- `realtime_voice_server`: WebSocket server for voice interaction
- `bill.py`: Billing business logic
- `service_combination_service`: Optimal service recommendations

## Prerequisites

### System Requirements

- **Python**: 3.8 or higher
- **Node.js**: 16.0 or higher
- **npm**: 8.0 or higher

### API Keys Required

- OpenAI API key (for GPT-4 and Realtime API)
- Pinecone API key (for vector database)
- OpenAI Assistant ID (for structured data extraction)

## Installation

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd DTI6302-repository

# Run the installation script
./install.sh
```

### Manual Installation

**1. Backend Python Dependencies**:
```bash
cd backend
pip install -r requirements.txt
```

**2. Backend Node.js Dependencies**:
```bash
cd backend
npm install
```

**3. Frontend Dependencies**:
```bash
cd frontend
npm install
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
ASSISTANT_ID=your_openai_assistant_id

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=medical-bills

# API Endpoints
VITE_NODE_API=http://localhost:3033
VITE_PYTHON_API=http://localhost:3034
```

### Data Setup

**1. OHIP Benefits Data**:
Place CSV files in `backend/data/` directory:
- `dataset_schedule_of_benefits_1.csv`
- `dataset_schedule_of_benefits_2.csv`
- ... (additional files as needed)

**2. Vector Database Population**:
```bash
cd backend
python scripts/upload_structured_data_to_pinecone.py
```

## Usage

### Starting the Application

**1. Start Python API Server**:
```bash
cd backend
python main.py
```

**2. Start Node.js API Server**:
```bash
cd backend
npm start
```

**3. Start Real-time Voice Server**:
```bash
cd backend
python realtime_voice_server.py
```

**4. Start Frontend Development Server**:
```bash
cd frontend
npm run dev
```

**5. Access the Application**:
Open your browser and navigate to `http://localhost:5173`

### Basic Workflow

1. **Login**: Use the authentication system to access the application
2. **Create New Bill**: Navigate to "New Bill" section
3. **Select Billing Type**: Choose OHIP, Private, or Custom billing
4. **AI Interaction**: Use voice or text to describe medical services
5. **Auto-fill**: AI automatically extracts and fills billing information
6. **Review and Submit**: Verify information and generate invoice

### Voice Interaction

1. **Text Chat**: Type messages to interact with the AI assistant
2. **Voice Chat**: Click the microphone button for real-time voice interaction
3. **Service Lookup**: Ask about specific medical services and codes
4. **Natural Language**: Describe procedures 

Example voice interaction:
```
User: "My patient did a general assessment and chest X-ray"
AI: "I found multiple services: General assessment (C003, $87.35) and Chest X-ray (X195, $45.30)"
```

## API Documentation

### Python FastAPI Endpoints

**Chat Endpoint**:
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

**Service Search**:
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

**Create Bill**:
```
POST /api/create-bill
Body: {
  "patient": "string",
  "billType": "string",
  "items": []
}
```

**Get Bills**:
```
GET /api/bills
Response: [
  {
    "id": "string",
    "patient": "string",
    "totalAmount": number
  }
]
```

### WebSocket API

**Real-time Voice**:
```
WebSocket: ws://localhost:3035
Messages: 
- Audio data (binary)
- Control messages (JSON)
```

## Development

### Project Structure

```
DTI6302-repository/
├── backend/
│   ├── main.py                 # FastAPI server
│   ├── realtime_voice_server.py # WebSocket server
│   ├── index.js               # Express server
│   ├── services/              # Business logic
│   ├── api/                   # API endpoints
│   ├── scripts/               # Data processing
│   ├── data/                  # CSV data files
│   └── models/                # Data models
├── frontend/
│   ├── src/
│   │   ├── Components/        # React components
│   │   ├── App.jsx           # Main application
│   │   └── main.jsx          # Entry point
│   └── public/               # Static assets
└── extracted_data/           # Processed data
```

### Adding New Features

**1. Frontend Components**:
- Create new React components in `frontend/src/Components/`
- Follow existing patterns for state management
- Use Material-UI for consistent styling

**2. Backend Services**:
- Add new FastAPI endpoints in `backend/api/`
- Implement business logic in `backend/services/`
- Follow async/await patterns for database operations

**3. Voice Features**:
- Extend `realtime_voice_server.py` for new voice capabilities
- Update `ChatbotModal.jsx` for frontend voice handling

### Testing

**Backend Testing**:
```bash
cd backend
python -m pytest
```

**Frontend Testing**:
```bash
cd frontend
npm test
```

## Deployment

### Production Environment

**1. Environment Configuration**:
- Set production API keys in environment variables
- Configure CORS settings for production domains
- Use HTTPS for all API communications

**2. Database Setup**:
- Populate Pinecone index with production data
- Configure external database connections
- Set up backup and recovery procedures

**3. Server Deployment**:
- Deploy Python backend using uvicorn with multiple workers
- Deploy Node.js backend using PM2 or similar process manager
- Use nginx as reverse proxy for load balancing

**4. Frontend Deployment**:
```bash
cd frontend
npm run build
# Deploy dist/ directory to CDN or static hosting
```

### Docker Deployment

Create `docker-compose.yml` for containerized deployment:

```yaml
version: '3.8'
services:
  python-backend:
    build: ./backend
    ports:
      - "3034:3034"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - PINECONE_API_KEY=${PINECONE_API_KEY}
  
  node-backend:
    build: ./backend
    ports:
      - "3033:3033"
  
  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
```

## Troubleshooting

### Common Issues

**1. Voice Audio Issues**:
- Check microphone permissions in browser
- Verify WebSocket connection to port 3035
- Ensure OpenAI API key has Realtime API access

**2. Service Lookup Failures**:
- Verify Pinecone API key and index name
- Check if vector database is populated
- Review RAG service logs for errors

**3. Connection Issues**:
- Verify all services are running on correct ports
- Check CORS configuration for cross-origin requests
- Ensure firewall allows required ports

**4. Authentication Problems**:
- Verify JWT token configuration
- Check session storage in browser
- Review user authentication endpoints

### Debug Mode

Enable debug logging:

```bash
# Python backend
export LOG_LEVEL=DEBUG
python main.py

# Check browser console for frontend logs
# Check terminal output for backend logs
```

### Performance Optimization

**1. Audio Streaming**:
- Adjust audio buffer sizes for network conditions
- Monitor WebSocket connection stability
- Optimize PCM audio processing

**2. Database Queries**:
- Index frequently searched fields
- Implement caching for common queries
- Use connection pooling for database operations

**3. Vector Search**:
- Optimize Pinecone query parameters
- Cache frequent search results
- Use appropriate embedding dimensions

## Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Update documentation as needed
5. Submit pull request with detailed description

### Code Standards

- **Python**: Follow PEP 8 guidelines
- **JavaScript**: Use ESLint configuration
- **Comments**: Document complex logic and API interactions
- **Testing**: Include unit tests for new features

### Commit Guidelines

Use conventional commit format:
```
feat: add real-time voice interaction
fix: resolve audio streaming issues
docs: update API documentation
test: add unit tests for RAG service
```

## License

This project is licensed under the MIT License. See LICENSE file for details.

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Maintained By**: Medical AI Development Team 