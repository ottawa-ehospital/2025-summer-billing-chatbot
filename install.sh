#!/bin/bash

# ========================================
# Medical Billing Assistant - Quick Install
# ========================================

echo "Medical Billing Assistant - Installation Script"
echo "=================================================="

# Check system requirements
echo "Checking system requirements..."

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required but not installed."
    exit 1
fi

python_version=$(python3 --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "Python $python_version detected"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js is required but not installed."
    exit 1
fi

node_version=$(node --version)
echo "Node.js $node_version detected"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "npm is required but not installed."
    exit 1
fi

npm_version=$(npm --version)
echo "npm $npm_version detected"

echo ""

# Install Python dependencies
echo "Installing Python dependencies..."
cd backend
if [ -f "requirements.txt" ]; then
    pip3 install -r requirements.txt
    echo "Python dependencies installed"
else
    echo "requirements.txt not found in backend directory"
    exit 1
fi

echo ""

# Install Node.js dependencies  
echo "Installing Node.js dependencies..."
if [ -f "package.json" ]; then
    npm install
    echo "Node.js backend dependencies installed"
else
    echo "package.json not found in backend directory"
    exit 1
fi

cd ..

# Install Frontend dependencies
echo "Installing React frontend dependencies..."
cd frontend
if [ -f "package.json" ]; then
    npm install
    echo "React frontend dependencies installed"
else
    echo "package.json not found in frontend directory"
    exit 1
fi

cd ..

echo ""
echo "Installation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and configure your API keys"
echo "2. Start the services:"
echo "   - Python Backend: cd backend && python main.py"
echo "   - Node.js Backend: cd backend && npm start"  
echo "   - Realtime Voice: cd backend && python realtime_voice_server.py"
echo "   - Frontend: cd frontend && npm run dev"
echo ""
echo "Access the application at: http://localhost:5173" 