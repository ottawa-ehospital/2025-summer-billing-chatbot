#!/bin/sh

# Start Nginx reverse proxy
nginx -g 'daemon off;' &

# Start Python API server (FastAPI on port 3034)
python3 main.py &

# Start Node.js API server (Express on port 3033)
npm start &

# Start real-time voice server (WebSocket on port 3035)
python3 realtime_voice_server.py &

# Wait for all background jobs
wait 