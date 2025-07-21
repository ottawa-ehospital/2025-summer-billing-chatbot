import React, { useState, useRef, useEffect, useCallback } from 'react';
import './RealtimeVoiceChat.css';

const RealtimeVoiceChat = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState('Ready to connect');
  const [userTranscript, setUserTranscript] = useState('');
  const [aiTranscript, setAiTranscript] = useState('');
  const [error, setError] = useState('');
  const [connectionId, setConnectionId] = useState(null);

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);

  // WebSocket connection
  const connectWebSocket = useCallback(async () => {
    try {
      setStatus('Connecting to server...');
      setError('');

      const ws = new WebSocket('ws://localhost:3035');
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('Connected to server');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleServerMessage(data);
        } catch (e) {
          console.error('Error parsing server message:', e);
        }
      };

      ws.onclose = () => {
        setStatus('Disconnected from server');
        setIsConnected(false);
        setIsListening(false);
        cleanup();
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error. Please try again.');
        setStatus('Connection failed');
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Failed to connect:', error);
      setError('Failed to connect to server');
      setStatus('Connection failed');
    }
  }, []);

  // Handle messages from server
  const handleServerMessage = (data) => {
    const messageType = data.type;

    switch (messageType) {
      case 'connection.established':
        setConnectionId(data.client_id);
        setStatus('Ready for voice chat');
        break;

      case 'session.created':
        setStatus('Session created - Ready to talk');
        break;

      case 'input_audio_buffer.speech_started':
        setIsListening(true);
        setStatus('Listening...');
        break;

      case 'input_audio_buffer.speech_stopped':
        setIsListening(false);
        setStatus('Processing...');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        setUserTranscript(data.transcript || '');
        break;

      case 'response.created':
        setStatus('AI is responding...');
        setIsSpeaking(true);
        break;

      case 'response.audio.delta':
        if (data.delta) {
          handleAudioDelta(data.delta);
        }
        break;

      case 'response.audio_transcript.delta':
        if (data.delta) {
          setAiTranscript(prev => prev + data.delta);
        }
        break;

      case 'response.audio_transcript.done':
        setAiTranscript(data.transcript || '');
        break;

      case 'response.done':
        setStatus('Listening for your voice...');
        setIsSpeaking(false);
        setAiTranscript('');
        break;

      case 'error':
        const errorMsg = data.error?.message || 'Unknown error';
        setError(errorMsg);
        setStatus('Error occurred');
        console.error('Server error:', errorMsg);
        break;

      default:
        console.log('Unhandled message type:', messageType);
    }
  };

  // Handle audio delta from AI
  const handleAudioDelta = (audioData) => {
    try {
      // Decode base64 audio data
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Add to audio queue
      audioQueueRef.current.push(bytes);
      
      // Start playing if not already playing
      if (!isPlayingRef.current) {
        playAudioQueue();
      }
    } catch (error) {
      console.error('Error handling audio delta:', error);
    }
  };

  // Play audio queue
  const playAudioQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isPlayingRef.current = true;

    try {
      // Create audio context if not exists
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 24000
        });
      }

      const audioContext = audioContextRef.current;
      
      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Concatenate all audio chunks
      let totalLength = 0;
      audioQueueRef.current.forEach(chunk => {
        totalLength += chunk.length;
      });

      const combinedData = new Uint8Array(totalLength);
      let offset = 0;
      audioQueueRef.current.forEach(chunk => {
        combinedData.set(chunk, offset);
        offset += chunk.length;
      });

      // Clear the queue
      audioQueueRef.current = [];

      // Convert to 16-bit PCM
      const pcmData = new Int16Array(combinedData.buffer);
      
      // Create audio buffer
      const audioBuffer = audioContext.createBuffer(1, pcmData.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      
      // Convert PCM to float
      for (let i = 0; i < pcmData.length; i++) {
        channelData[i] = pcmData[i] / 32768.0;
      }

      // Create and play audio source
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      source.onended = () => {
        isPlayingRef.current = false;
        // Check if there are more chunks to play
        if (audioQueueRef.current.length > 0) {
          setTimeout(() => playAudioQueue(), 10);
        }
      };

      source.start();

    } catch (error) {
      console.error('Error playing audio:', error);
      isPlayingRef.current = false;
    }
  };

  // Start voice capture
  const startVoiceCapture = async () => {
    try {
      setStatus('Setting up microphone...');

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaStreamRef.current = stream;

      // Create audio context
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24000
      });

      const audioContext = audioContextRef.current;
      const source = audioContext.createMediaStreamSource(stream);

      // Create audio worklet for processing
      try {
        await audioContext.audioWorklet.addModule('/worklets/pcm-processor.js');
        
        const processor = new AudioWorkletNode(audioContext, 'pcm-processor');
        processorRef.current = processor;

        processor.port.onmessage = (event) => {
          const pcmData = event.data;
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            // Send raw PCM data as binary
            wsRef.current.send(pcmData);
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        setStatus('Microphone ready - Start talking!');

      } catch (workletError) {
        console.error('Worklet not available, using ScriptProcessor:', workletError);
        
        // Fallback to ScriptProcessor
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (event) => {
          const inputData = event.inputBuffer.getChannelData(0);
          
          // Convert to 16-bit PCM
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }

          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(pcm16.buffer);
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        setStatus('Microphone ready - Start talking!');
      }

    } catch (error) {
      console.error('Error starting voice capture:', error);
      setError('Failed to access microphone. Please check permissions.');
      setStatus('Microphone access failed');
    }
  };

  // Stop voice capture
  const stopVoiceCapture = () => {
    cleanup();
    setStatus('Voice capture stopped');
  };

  // Cleanup resources
  const cleanup = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    audioQueueRef.current = [];
    isPlayingRef.current = false;
  };

  // Disconnect WebSocket
  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    cleanup();
    setIsConnected(false);
    setConnectionId(null);
    setUserTranscript('');
    setAiTranscript('');
    setStatus('Disconnected');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className="realtime-voice-chat">
      <div className="voice-chat-header">
        <h2>🎤 Realtime Voice Assistant</h2>
        <p>Continuous conversation with AI - No buttons needed!</p>
      </div>

      <div className="connection-status">
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          <div className="status-dot"></div>
          <span className="status-text">{status}</span>
        </div>
        {connectionId && (
          <div className="connection-id">
            Session: {connectionId.toString().slice(-6)}
          </div>
        )}
      </div>

      <div className="voice-controls">
        {!isConnected ? (
          <button 
            className="btn btn-primary"
            onClick={connectWebSocket}
            disabled={isConnected}
          >
            Connect to Voice Chat
          </button>
        ) : (
          <div className="control-group">
            {!mediaStreamRef.current ? (
              <button 
                className="btn btn-success"
                onClick={startVoiceCapture}
              >
                🎤 Start Microphone
              </button>
            ) : (
              <button 
                className="btn btn-warning"
                onClick={stopVoiceCapture}
              >
                🔇 Stop Microphone
              </button>
            )}
            <button 
              className="btn btn-danger"
              onClick={disconnect}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      <div className="conversation-display">
        <div className="transcript-section">
          <h3>Your Speech</h3>
          <div className={`transcript-box user ${isListening ? 'listening' : ''}`}>
            {userTranscript || (isListening ? 'Listening...' : 'Start speaking to see your words here')}
          </div>
        </div>

        <div className="transcript-section">
          <h3>AI Response</h3>
          <div className={`transcript-box ai ${isSpeaking ? 'speaking' : ''}`}>
            {aiTranscript || (isSpeaking ? 'AI is responding...' : 'AI responses will appear here')}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
          <button className="error-dismiss" onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="voice-indicators">
        <div className={`indicator ${isListening ? 'active' : ''}`}>
          <div className="indicator-dot"></div>
          <span>Listening</span>
        </div>
        <div className={`indicator ${isSpeaking ? 'active' : ''}`}>
          <div className="indicator-dot"></div>
          <span>AI Speaking</span>
        </div>
        <div className={`indicator ${isConnected ? 'active' : ''}`}>
          <div className="indicator-dot"></div>
          <span>Connected</span>
        </div>
      </div>

      <div className="instructions">
        <h4>How to use:</h4>
        <ol>
          <li>Click "Connect to Voice Chat" to establish connection</li>
          <li>Click "Start Microphone" to begin voice input</li>
          <li>Start talking naturally - no need to press any buttons!</li>
          <li>The AI will respond automatically when you finish speaking</li>
          <li>Continue the conversation naturally</li>
        </ol>
      </div>
    </div>
  );
};

export default RealtimeVoiceChat; 