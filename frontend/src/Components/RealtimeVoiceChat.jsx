import React, { useState, useEffect, useRef } from 'react';
import './RealtimeVoiceChat.css';

const RealtimeVoiceChat = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);

  const connectToServer = async () => {
    try {
      setError(null);
      const ws = new WebSocket(import.meta.env.VITE_WEBSOCKET_URL);
      
      ws.onopen = () => {
        console.log('Connected to realtime voice server');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleServerMessage(data);
        } catch (error) {
          console.error('Error parsing server message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from realtime voice server');
        setIsConnected(false);
        setIsRecording(false);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error. Make sure the server is running.');
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error connecting to server:', error);
      setError('Failed to connect to server');
    }
  };

  const handleServerMessage = (data) => {
    if (data.type === 'audio') {
      playAudioFromBase64(data.audio);
    } else if (data.type === 'transcript') {
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: data.text,
        timestamp: new Date()
      }]);
    } else if (data.type === 'error') {
      setError(data.message);
    }
  };

  const playAudioFromBase64 = (base64Audio) => {
    try {
      const audioData = atob(base64Audio);
      const audioBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(audioBuffer);
      
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      const blob = new Blob([audioBuffer], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
      });
    } catch (error) {
      console.error('Error processing audio:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      audioStreamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          const reader = new FileReader();
          reader.onload = () => {
            const base64Data = reader.result.split(',')[1];
            wsRef.current.send(JSON.stringify({
              type: 'audio',
              audio: base64Data
            }));
          };
          reader.readAsDataURL(event.data);
        }
      };
      
      mediaRecorder.start(100); // Send data every 100ms
      setIsRecording(true);
      
      setMessages(prev => [...prev, {
        type: 'user',
        content: 'Recording started...',
        timestamp: new Date()
      }]);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      setMessages(prev => [...prev, {
        type: 'user',
        content: 'Recording stopped',
        timestamp: new Date()
      }]);
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (isRecording) {
      stopRecording();
    }
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return (
    <div className="realtime-voice-chat">
      <div className="voice-chat-header">
        <h3>Realtime Voice Chat</h3>
        <div className="connection-status">
          Status: <span className={isConnected ? 'connected' : 'disconnected'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="voice-controls">
        {!isConnected ? (
          <button onClick={connectToServer} className="connect-btn">
            Connect to Server
          </button>
        ) : (
          <div className="recording-controls">
            {!isRecording ? (
              <button onClick={startRecording} className="record-btn">
                🎤 Start Recording
              </button>
            ) : (
              <button onClick={stopRecording} className="stop-btn">
                ⏹️ Stop Recording
              </button>
            )}
            <button onClick={disconnect} className="disconnect-btn">
              Disconnect
            </button>
          </div>
        )}
      </div>

      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.type}`}>
            <div className="message-content">{message.content}</div>
            <div className="message-time">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RealtimeVoiceChat; 