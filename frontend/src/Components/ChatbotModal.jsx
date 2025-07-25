import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, Modal, TextField, Button, Typography, Paper, Divider, Tooltip, Fab } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';

import KeyboardIcon from '@mui/icons-material/Keyboard';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import CloseIcon from '@mui/icons-material/Close';
import { useAIBill } from './AIBillContext';

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

const modalStyle = {
  position: 'fixed',
  bottom: 80,
  right: 40,
  width: 380,
  maxWidth: '90vw',
  bgcolor: 'background.paper',
  boxShadow: 24,
  borderRadius: 2,
  p: 2,
  zIndex: 1300,
};

const ChatbotModal = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMode, setInputMode] = useState('text');
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);
  const { handleAIAutoFill } = useAIBill();
  const [realtimeScript, setRealtimeScript] = useState('');
  const [isRealtime, setIsRealtime] = useState(false);
  const [context, setContext] = useState({});
  const [missingFields, setMissingFields] = useState([]);
  const [realtimeStatus, setRealtimeStatus] = useState('');
  const [wsRef, setWsRef] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const currentSourceRef = useRef(null);
  const audioQueueRef = useRef([]);
  const processedAudioIds = useRef(new Set());
  const mediaStreamRef = useRef(null);
  const isProcessingAudioRef = useRef(false);

  const sessionReadyRef = useRef(false);

  const genMsgId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

  const extractNaturalReply = (reply) => {
    if (!reply) return '';
    const dashIdx = reply.indexOf('---');
    if (dashIdx !== -1) return reply.slice(0, dashIdx).trim();
    const jsonIdx = reply.indexOf('{');
    if (jsonIdx !== -1) return reply.slice(0, jsonIdx).trim();
    return reply.trim();
  };

  const getAudioContext = () => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      setAudioContext(ctx);
      return ctx;
    }
    return audioContext;
  };

  const stopCurrentAudio = () => {
    console.log('Stopping all audio playback...');
    
    // Stop current audio source
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
        currentSourceRef.current = null;
        console.log('Stopped current audio source');
      } catch (e) {
        console.warn("Error stopping audio source:", e);
      }
    }
    
    // Stop all scheduled audio in the audio context
    if (audioContext && audioContext.state !== 'closed') {
      try {
        // Suspend the audio context to stop all audio immediately
        audioContext.suspend();
        console.log('Suspended audio context');
      } catch (e) {
        console.warn("Error suspending audio context:", e);
      }
    }
    
    // Clear all audio queues and processing state
    audioQueueRef.current = [];
    processedAudioIds.current.clear();
    setIsPlayingAudio(false);
    
    console.log('All audio stopped');
  };

  // Removed old processOldAudioQueue - using unified processAudioQueue instead

  const playAudioResponse = async (base64Audio) => {
    try {
      // Generate unique ID for audio chunk
      const audioId = base64Audio.substring(0, 50) + Date.now();
      if (processedAudioIds.current.has(audioId)) {
        console.log("Skipping duplicate audio chunk");
        return;
      }
      processedAudioIds.current.add(audioId);
      
      const audioData = atob(base64Audio);
      const audioBuffer = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioBuffer[i] = audioData.charCodeAt(i);
      }
      
      // For manual chat, use simple Audio API for MP3
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      
      // Stop any current realtime audio to avoid overlap
      if (isPlayingAudio) {
        audioQueueRef.current = [];
        setIsPlayingAudio(false);
      }
      
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlayingAudio(false);
      };
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        URL.revokeObjectURL(audioUrl);
        setIsPlayingAudio(false);
      };
      
      setIsPlayingAudio(true);
      await audio.play();
      console.log("Playing manual chat audio:", base64Audio.length, "chars");
      
    } catch (error) {
      console.error("Error processing audio:", error);
      setIsPlayingAudio(false);
    }
  };

  // Initialize with empty chat - AI will only respond after user speaks
  useEffect(() => {
    setMessages([]);
  }, []);

  // Cleanup when modal closes or component unmounts
  useEffect(() => {
    return () => {
      if (isRealtime) {
        stopVoiceInput();
      }
    };
  }, []);

  // Stop voice input when modal closes
  useEffect(() => {
    if (!open && isRealtime) {
      stopVoiceInput();
    }
  }, [open, isRealtime]);



  const startVoiceInput = async () => {
    try {
      setRealtimeStatus('Connecting...');
      setIsRealtime(true);
      
      // Connect to our realtime voice server
      const ws = new WebSocket(import.meta.env.VITE_WEBSOCKET_URL);
      setWsRef(ws);
      
      ws.onopen = () => {
        setRealtimeStatus('Connected - Setting up microphone...');
        startMicrophone(ws);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealtimeMessage(data);
        } catch (e) {
          console.error('Error parsing message:', e);
        }
      };
      
      ws.onclose = () => {
        setRealtimeStatus('Disconnected');
        setIsRealtime(false);
        cleanup();
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setRealtimeStatus('Connection failed');
        setIsRealtime(false);
      };
      
    } catch (error) {
      console.error('Failed to start voice chat:', error);
      setRealtimeStatus('Failed to start');
      setIsRealtime(false);
    }
  };

  const stopVoiceInput = () => {
    console.log('Stopping voice input...');
    
    // Close WebSocket connection
    if (wsRef) {
      wsRef.close();
      setWsRef(null);
    }
    
    // Stop all audio playback immediately
    stopCurrentAudio();
    
    // Clear audio queue and reset timing
    audioQueueRef.current = [];
    nextPlayTimeRef.current = 0;
    setIsPlayingAudio(false);
    
    // Stop and close audio context
    if (audioContext) {
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
      setAudioContext(null);
    }
    
    // Stop microphone
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped microphone track');
      });
      mediaStreamRef.current = null;
    }
    
    // Clear all refs and state
    processedAudioIds.current.clear();
    currentSourceRef.current = null;
    
    // Update UI state
    setIsRealtime(false);
    setRealtimeStatus('Voice chat stopped');
    
    console.log('Voice input stopped completely');
  };

  // Handle realtime voice messages
  const handleRealtimeMessage = (data) => {
    const messageType = data.type;
    
    switch (messageType) {
      case 'connection.established':
        setRealtimeStatus('Ready for voice chat');
        break;
        
      case 'session.created':
        setRealtimeStatus('Listening...');
        break;
        
      case 'input_audio_buffer.speech_started':
        setRealtimeStatus('You are speaking...');
        break;
        
      case 'input_audio_buffer.speech_stopped':
        setRealtimeStatus('Processing...');
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        const userTranscript = data.transcript || '';
        if (userTranscript) {
          const userMsg = { 
            role: 'user', 
            content: userTranscript, 
            id: genMsgId() 
          };
          setMessages(prev => [...prev, userMsg]);
        }
        break;
        
      case 'response.created':
        setRealtimeStatus('AI is responding...');
        break;
        
      case 'response.audio.delta':
        if (data.delta) {
          playAudioDelta(data.delta);
        }
        break;
        
      case 'response.audio_transcript.done':
        const aiTranscript = data.transcript || '';
        if (aiTranscript) {
          const aiMsg = { 
            role: 'ai', 
            content: aiTranscript, 
            id: genMsgId() 
          };
          setMessages(prev => [...prev, aiMsg]);
        }
        break;
        
      case 'response.done':
        setRealtimeStatus('Listening...');
        break;
        
      case 'error':
        const errorMsg = data.error?.message || 'Unknown error';
        setRealtimeStatus('Error: ' + errorMsg);
        console.error('Realtime error:', errorMsg);
        break;
    }
  };

  // Start microphone capture
  const startMicrophone = async (ws) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Store the media stream for cleanup
      mediaStreamRef.current = stream;

      const context = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24000
      });
      setAudioContext(context);

      const source = context.createMediaStreamSource(stream);

      // Try to use AudioWorklet
      try {
        await context.audioWorklet.addModule('/worklets/pcm-processor.js');
        const processor = new AudioWorkletNode(context, 'pcm-processor');

        processor.port.onmessage = (event) => {
          const pcmData = event.data;
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(pcmData);
          }
        };

        source.connect(processor);
        processor.connect(context.destination);

      } catch (workletError) {
        console.log('AudioWorklet not available, using ScriptProcessor');
        
        // Fallback to ScriptProcessor
        const processor = context.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (event) => {
          const inputData = event.inputBuffer.getChannelData(0);
          
          // Convert to 16-bit PCM
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }

          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(pcm16.buffer);
          }
        };

        source.connect(processor);
        processor.connect(context.destination);
      }

      setRealtimeStatus('Microphone ready - Start talking!');

    } catch (error) {
      console.error('Microphone error:', error);
      setRealtimeStatus('Microphone access failed');
    }
  };

  // Global audio buffer for continuous streaming
  const audioBufferRef = useRef([]);
  const nextPlayTimeRef = useRef(0);

  // Play audio delta from AI - scheduled continuous playback
  const playAudioDelta = (audioData) => {
    try {
      if (audioData && audioData.length > 0) {
        audioQueueRef.current.push(audioData);
        // Process queue if not already processing
        if (!isPlayingAudio) {
          processAudioQueue();
        }
      }
    } catch (error) {
      console.error('Error playing audio delta:', error);
    }
  };

  // Process audio queue with scheduled playback for seamless streaming
  const processAudioQueue = async () => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    
    try {
      // Get audio context
      let context = audioContext;
      if (!context || context.state === 'closed') {
        context = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        setAudioContext(context);
      }
      
      if (context.state === 'suspended') {
        await context.resume();
      }

      // Initialize next play time if not set
      if (nextPlayTimeRef.current < context.currentTime) {
        nextPlayTimeRef.current = context.currentTime;
      }

      // Process all available audio chunks
      while (audioQueueRef.current.length > 0) {
        const audioData = audioQueueRef.current.shift();
        
        if (audioData && audioData.length > 0) {
          try {
            // Decode base64 to binary
            const binaryString = atob(audioData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            // Convert to 16-bit PCM
            const pcmData = new Int16Array(bytes.buffer);
            
            if (pcmData.length > 0) {
              // Create audio buffer
              const audioBuffer = context.createBuffer(1, pcmData.length, 24000);
              const channelData = audioBuffer.getChannelData(0);
              
              // Convert PCM to float
              for (let i = 0; i < pcmData.length; i++) {
                channelData[i] = pcmData[i] / 32768.0;
              }

              // Create and schedule audio source
              const source = context.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(context.destination);
              
              // Schedule playback to continue seamlessly
              source.start(nextPlayTimeRef.current);
              
              // Update next play time
              nextPlayTimeRef.current += audioBuffer.duration;
              
              console.log(`Scheduled audio chunk: ${pcmData.length} samples at ${nextPlayTimeRef.current.toFixed(3)}s`);
            }
          } catch (error) {
            console.error('Error processing audio chunk:', error);
          }
        }
      }

      // Set timeout to reset playing state after all scheduled audio should be done
      const timeToWait = Math.max(0, (nextPlayTimeRef.current - context.currentTime) * 1000);
      setTimeout(() => {
        setIsPlayingAudio(false);
        // Check if more audio arrived
        if (audioQueueRef.current.length > 0) {
          processAudioQueue();
        }
      }, timeToWait + 100); // Add small buffer

    } catch (error) {
      console.error('Error processing audio queue:', error);
      setIsPlayingAudio(false);
    }
  };

  // Cleanup function
  const cleanup = () => {
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      setAudioContext(null);
    }
    // Clear all audio processing
    audioQueueRef.current = [];
    setIsPlayingAudio(false);
    
    // Stop any existing audio sources
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
        currentSourceRef.current = null;
      } catch (e) {
        // Audio already stopped
      }
    }
    
    // Clear processed audio IDs
    processedAudioIds.current.clear();
    
    // Clear any existing media streams
    if (mediaStreamRef && mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // Unified sendMessage for both manual and voice input, with system prompt
  const sendMessage = async (userInput) => {
    if (!userInput) return;
    const userMsg = { role: 'user', content: userInput, id: genMsgId() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    // Build chat_history for multi-turn context
    const chat_history = messages
      .filter(m => m.role === 'user' || m.role === 'ai')
      .map(m => ({
        role: m.role === 'ai' ? 'assistant' : m.role,
        content: m.content
      }));
    // Only add system prompt on the first user message
    const systemPrompt = messages.length <= 1
      ? "You are a friendly and professional medical billing assistant. Always greet the user at the start, then help with billing questions."
      : undefined;
    const payload = {
      message: userInput,
      chat_history,
      ...(systemPrompt ? { system_prompt: systemPrompt } : {})
    };
    try {
      const res = await fetch(`${import.meta.env.VITE_PYTHON_API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const aiMsg = { role: 'ai', content: extractNaturalReply(data.reply), id: genMsgId() };
      setMessages(prev => [...prev, aiMsg]);
      setContext(data.billInfo || {});
      setMissingFields(data.missingFields || []);
      if (data.billInfo && typeof data.billInfo === 'object' && Object.keys(data.billInfo).length > 0 && handleAIAutoFill) {
        handleAIAutoFill(data.billInfo);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Error: ' + e.message, id: genMsgId() }]);
    }
  };

  // Manual input uses sendMessage
  const handleSendManual = () => {
    if (inputText.trim()) {
      sendMessage(inputText.trim());
      setInputText('');
    }
  };



  React.useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  return (
    <>
      <Tooltip title="Chat with AI">
        <Fab color="primary" onClick={() => setOpen(true)} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1200 }}>
          <ChatIcon />
        </Fab>
      </Tooltip>
      <Modal open={open} onClose={() => setOpen(false)} BackdropProps={{ style: { background: 'transparent', pointerEvents: 'none' } }} style={{ pointerEvents: 'none' }}>
        <Paper sx={{ ...modalStyle, p: 0, display: 'flex', flexDirection: 'column', height: 500, pointerEvents: 'auto' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" p={2} pb={1}>
            <Typography variant="h6">AI Chat Assistant</Typography>
            <IconButton onClick={() => setOpen(false)}><CloseIcon /></IconButton>
          </Box>
          <Divider />
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#f9f9f9' }}>
            {messages.length === 0 && <Typography color="text.secondary">Start a conversation with the AI assistant...</Typography>}
            {messages.map((msg) => (
              <Box key={msg.id} mb={1} display="flex" justifyContent={msg.role === 'user' ? 'flex-end' : 'flex-start'}>
                <Box sx={{ maxWidth: '75%', borderRadius: 3, px: 2, py: 1, bgcolor: msg.role === 'user' ? '#e3f2fd' : '#ede7f6', textAlign: 'left' }}>
                  <Typography variant="body2" color={msg.role === 'user' ? 'primary' : 'secondary'} fontWeight="bold">
                    {msg.role === 'user' ? 'You' : 'AI'}
                  </Typography>
                  <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>{msg.content}</Typography>
                </Box>
              </Box>
            ))}
            <div ref={chatEndRef} />
          </Box>
          <Divider />
          <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pt: 1, gap: 1 }}>
            {inputMode === 'text' ? (
              <>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  placeholder="Type your message..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendManual(); } }}
                  sx={{ borderRadius: 3, background: '#fff' }}
                  inputProps={{ style: { borderRadius: 12 } }}
                />

                <Tooltip title="Speech-to-Speech">
                  <IconButton onClick={() => setInputMode('realtime')}><RecordVoiceOverIcon /></IconButton>
                </Tooltip>
              </>
            ) : (
              <>
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isRealtime ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="primary">
                        {realtimeStatus.includes('Listening') && 'Listening...'}
                        {realtimeStatus.includes('speaking') && 'You are speaking...'}
                        {realtimeStatus.includes('responding') && 'AI is responding...'}
                        {realtimeStatus.includes('Processing') && 'Processing...'}
                        {realtimeStatus.includes('Ready') && 'Ready for voice chat'}
                        {realtimeStatus.includes('Connecting') && 'Connecting...'}
                        {realtimeStatus.includes('Microphone') && 'Setting up microphone...'}
                        {realtimeStatus.includes('Error') && '❌ ' + realtimeStatus}
                        {realtimeStatus.includes('failed') && '❌ ' + realtimeStatus}
                        {!realtimeStatus && '⏸️ Voice chat stopped'}
                      </Typography>

                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">Click microphone for speech-to-speech</Typography>
                  )}
                </Box>
                <IconButton onClick={() => setInputMode('text')}><KeyboardIcon /></IconButton>
                <Tooltip title={isRealtime ? "Stop Voice Chat" : "Start Voice Chat"}>
                  <IconButton 
                    onClick={isRealtime ? stopVoiceInput : startVoiceInput}
                    color={isRealtime ? "error" : "primary"}
                    sx={{ 
                      backgroundColor: isRealtime ? 'rgba(244, 67, 54, 0.1)' : 'rgba(25, 118, 210, 0.1)',
                      '&:hover': {
                        backgroundColor: isRealtime ? 'rgba(244, 67, 54, 0.2)' : 'rgba(25, 118, 210, 0.2)'
                      }
                    }}
                  >
                    <RecordVoiceOverIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </Paper>
      </Modal>
    </>
  );
};

export default ChatbotModal;

