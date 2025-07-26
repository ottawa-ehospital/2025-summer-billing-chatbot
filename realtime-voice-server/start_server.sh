#!/bin/bash

# Realtime Voice Server Startup Script

echo "🚀 Starting Realtime Voice Server..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "📝 Please edit .env file and add your OpenAI API key"
        echo "   OPENAI_API_KEY=your_openai_api_key_here"
        exit 1
    else
        echo "❌ env.example not found. Please create .env file manually."
        exit 1
    fi
fi

# Check if OpenAI API key is set
if ! grep -q "OPENAI_API_KEY=" .env || grep -q "OPENAI_API_KEY=your_openai_api_key_here" .env; then
    echo "❌ Please set your OpenAI API key in .env file"
    echo "   OPENAI_API_KEY=your_actual_api_key_here"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

echo "📦 Activating virtual environment..."
source venv/bin/activate

echo "📦 Installing dependencies..."
pip install -r requirements.txt

echo "🔧 Starting server..."
echo "📍 Server will be available at: ws://localhost:3035"
echo "🛑 Press Ctrl+C to stop the server"
echo ""

python realtime_voice_server.py 