# Realtime Voice Server

Standalone realtime voice server for medical billing assistant with voice interaction capabilities.

## Features

- **Real-time Voice Interaction**: Using OpenAI Realtime API
- **Medical Knowledge Base**: Integrated OHIP service codes and pricing information
- **WebSocket Communication**: Multi-client connection support
- **Automatic Service Search**: Automatically search related medical services based on voice content

## Installation

### 1. Navigate to directory
```bash
cd realtime-voice-server
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure environment variables
Create `.env` file:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 4. Add data files (optional)
Place OHIP service data CSV files in the `data/` directory:
```
data/
├── dataset_schedule_of_benefits_1.csv
├── dataset_schedule_of_benefits_2.csv
└── ...
```

## Running

### Start server
```bash
python realtime_voice_server.py
```

Server will start on `ws://localhost:3035`.

### Use startup script (recommended)
```bash
./start_server.sh
```

### Test connection
You can use WebSocket client to test connection:
```javascript
const ws = new WebSocket('ws://localhost:3035');
```

## API Endpoints

### WebSocket Connection
- **URL**: `ws://localhost:3035`
- **Protocol**: WebSocket

### Message Format

#### Client to Server
```json
{
  "type": "input_audio_buffer.append",
  "audio": "base64_encoded_audio_data"
}
```

#### Server to Client
```json
{
  "type": "response.audio_transcript.done",
  "transcript": "AI response text"
}
```

## Configuration Options

### Server Configuration
- **Port**: 3035
- **Host**: localhost
- **Ping Interval**: 20 seconds
- **Ping Timeout**: 10 seconds

### OpenAI Configuration
- **Model**: gpt-4o-realtime-preview-2024-10-01
- **Voice**: alloy
- **Sample Rate**: 24000Hz
- **Audio Format**: PCM16

## Deployment

### Docker Deployment
```bash
docker build -t realtime-voice-server .
docker run -p 3035:3035 --env-file .env realtime-voice-server
```

### Docker Compose Deployment
```bash
docker-compose up -d
```

### Production Environment
1. Change host address to `0.0.0.0`
2. Configure reverse proxy (like Nginx)
3. Set up SSL certificates
4. Configure firewall rules

## Testing

### Python Test Client
```bash
python test_client.py
```

### Web Test Page
Open `test.html` file in browser to test

## Troubleshooting

### Common Issues

1. **OpenAI API Key Error**
   - Check API key in `.env` file
   - Ensure API key is valid and has sufficient quota

2. **WebSocket Connection Failure**
   - Check if port 3035 is occupied
   - Confirm firewall settings

3. **Audio Processing Issues**
   - Ensure audio format is PCM16
   - Check sample rate settings

## Logging

Server outputs detailed log information:
- Client connections/disconnections
- OpenAI API communication
- Error messages
- Service search results

## License

MIT License 