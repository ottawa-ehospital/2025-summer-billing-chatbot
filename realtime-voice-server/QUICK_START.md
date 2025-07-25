# 🚀 Quick Start Guide

## Quick Start

### 1. Environment Setup
```bash
# Ensure Python 3.8+ is installed
python3 --version

# Clone project (if from GitHub)
git clone <your-repo-url>
cd realtime-voice-server
```

### 2. Configure API Key
```bash
# Copy environment variable template
cp env.example .env

# Edit .env file and add your OpenAI API key
# OPENAI_API_KEY=your_actual_api_key_here
```

### 3. Start Server

#### Method 1: Use startup script (recommended)
```bash
./start_server.sh
```

#### Method 2: Manual startup
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# or venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Start server
python realtime_voice_server.py
```

### 4. Test Connection

#### Using Python test client
```bash
python test_client.py
```

#### Using Web test page
1. Open `test.html` file
2. Click "Connect" button
3. Send test messages

#### Using curl test
```bash
# Test WebSocket connection (requires websocat tool)
websocat ws://localhost:3035
```

### 5. Verify Functionality

After server starts, you should see:
```
INFO:__main__:Starting Realtime Voice Server on ws://localhost:3035
INFO:__main__:Features: OpenAI Realtime API, Continuous conversation, Medical billing context
INFO:__main__:Realtime Voice Server is running
INFO:__main__:Press Ctrl+C to stop
```

### 6. Common Issues

#### Port occupied
```bash
# Check if port 3035 is occupied
lsof -i :3035

# If occupied, you can modify port number in realtime_voice_server.py
```

#### OpenAI API key error
- Ensure API key is valid and has sufficient quota
- Check .env file format is correct
- Ensure API key has Realtime API access

#### Dependency installation failure
```bash
# Upgrade pip
pip install --upgrade pip

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### 7. Production Deployment

#### Docker Deployment
```bash
# Build image
docker build -t realtime-voice-server .

# Run container
docker run -p 3035:3035 --env-file .env realtime-voice-server
```

#### Docker Compose Deployment
```bash
docker-compose up -d
```

### 8. Next Steps

- View `README.md` for detailed features
- Modify CSV files in `data/` directory to add more services
- Customize system prompts for your needs
- Integrate into your frontend application

## 🎯 Features

✅ **Real-time Voice Interaction** - OpenAI Realtime API  
✅ **Medical Knowledge Base** - OHIP service codes and pricing  
✅ **WebSocket Communication** - Multi-client support  
✅ **Automatic Service Search** - Smart medical service matching  
✅ **Docker Support** - Containerized deployment  
✅ **Test Tools** - Python and Web test clients  

## 📞 Support

If you have issues, please check:
1. Log output
2. Network connection
3. API key configuration
4. Dependency versions 