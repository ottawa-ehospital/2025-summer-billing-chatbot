import asyncio
import websockets
import json
import base64
import os
import sys
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from services.enhanced_rag_service import enhanced_rag_service
except ImportError:
    logger.warning("Could not import enhanced_rag_service. Voice responses may not use knowledge base.")
    enhanced_rag_service = None

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# OpenAI API configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    logger.error("OPENAI_API_KEY not found in environment variables")
    sys.exit(1)

OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"

class RealtimeVoiceServer:
    def __init__(self):
        self.clients = {}
        
    async def get_service_info(self, query):
        """Get service information from knowledge base"""
        try:
            if enhanced_rag_service:
                # Check if query mentions multiple services
                multiple_services = self._extract_multiple_services(query)
                
                if len(multiple_services) > 1:
                    # Search for multiple services
                    result = enhanced_rag_service.search_multiple_services(multiple_services, top_k=2)
                    if result.get('services'):
                        services_text = []
                        for svc in result['services'][:3]:  # Limit to top 3 results
                            services_text.append(f"{svc['name']} (code: {svc['code']}, price: ${svc['fee']})")
                        context = f"Multiple services found: {'; '.join(services_text)}"
                        return f"From knowledge base: {context}"
                else:
                    # Single service search
                    result = enhanced_rag_service.process_query(query, top_k=3)
                    if isinstance(result, dict):
                        context = result.get('context', '')
                        if context:
                            return f"From knowledge base: {context}"
                
                return f"Found service information for: {query}"
            return "Knowledge base not available"
        except Exception as e:
            logger.error(f"Error querying knowledge base: {e}")
            return "Unable to retrieve service information"
    
    def _extract_multiple_services(self, query):
        """Extract multiple service names from query"""
        query_lower = query.lower()
        
        # Common medical services keywords
        service_keywords = [
            'general assessment', 'minor assessment', 'intermediate assessment',
            'ekg', 'ecg', 'electrocardiogram',
            'chest x-ray', 'x-ray', 'xray', 'radiography',
            'consultation', 'follow-up', 'follow up',
            'blood test', 'lab test', 'laboratory',
            'ultrasound', 'ct scan', 'mri'
        ]
        
        found_services = []
        for keyword in service_keywords:
            if keyword in query_lower:
                found_services.append(keyword)
        
        # If no specific keywords found, split by common conjunctions
        if not found_services:
            # Split by 'and', 'plus', ','
            import re
            parts = re.split(r'\s+and\s+|\s+plus\s+|,\s*', query_lower)
            if len(parts) > 1:
                found_services = [part.strip() for part in parts if len(part.strip()) > 3]
        
        return found_services if found_services else [query]
    
    async def should_search_services(self, message_text):
        """Check if user message requires service lookup"""
        search_keywords = [
            'service code', 'billing code', 'assessment', 'consultation', 
            'x-ray', 'chest', 'general', 'procedure', 'surgery', 'treatment',
            'find', 'search', 'look up', 'what is', 'how much', 'fee', 'price'
        ]
        message_lower = message_text.lower()
        return any(keyword in message_lower for keyword in search_keywords)
        
    async def register_client(self, websocket):
        """Register a new client"""
        client_id = id(websocket)
        self.clients[client_id] = {
            'websocket': websocket,
            'openai_ws': None,
            'session_id': None
        }
        logger.info(f"Client {client_id} connected")
        return client_id
        
    async def unregister_client(self, client_id):
        """Unregister a client and cleanup"""
        if client_id in self.clients:
            client = self.clients[client_id]
            if client['openai_ws']:
                await client['openai_ws'].close()
            del self.clients[client_id]
            logger.info(f"Client {client_id} disconnected")
    
    async def connect_to_openai(self, client_id):
        """Connect to OpenAI Realtime API"""
        try:
            headers = {
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "OpenAI-Beta": "realtime=v1"
            }
            
            openai_ws = await websockets.connect(
                OPENAI_REALTIME_URL,
                additional_headers=headers,
                ping_interval=30,
                ping_timeout=20
            )
            
            self.clients[client_id]['openai_ws'] = openai_ws
            logger.info(f"Connected to OpenAI for client {client_id}")
            
            # Start listening for OpenAI responses
            asyncio.create_task(self.handle_openai_messages(client_id, openai_ws))
            
            # Initialize session with medical billing context
            await self.initialize_session(client_id)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to OpenAI for client {client_id}: {e}")
            return False
    
    async def initialize_session(self, client_id):
        """Initialize the OpenAI session with medical billing context"""
        session_config = {
            "type": "session.update",
            "session": {
                "modalities": ["text", "audio"],
                "instructions": (
                    "You are a helpful medical billing assistant with access to a knowledge base. "
                    "If this is the user's first message (like 'hi' or a greeting), respond warmly and ask how you can help with their billing needs. "
                    "When the user describes medical services, I will provide you with context from the knowledge base. "
                    "Use this knowledge base information to provide accurate service codes, names, and pricing. "
                    "When you receive 'Context from knowledge base:' messages, use that exact information to answer the user's questions. "
                    "Provide specific service codes and fees ONLY when they come from the knowledge base context. "
                    "Be conversational and helpful - ask for one piece of information at a time if needed. "
                    "Help users with OHIP billing, private billing, service codes, and medical procedures. "
                    "Keep responses concise but informative. "
                    "If no knowledge base context is provided, then refer users to check the current fee schedule."
                ),
                "voice": "alloy",
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
                "input_audio_transcription": {
                    "model": "whisper-1"
                },
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.5,
                    "prefix_padding_ms": 300,
                    "silence_duration_ms": 200
                },
                "tools": [],
                "tool_choice": "auto",
                "temperature": 0.8,
                "max_response_output_tokens": 4096
            }
        }
        
        client = self.clients[client_id]
        if client['openai_ws']:
            await client['openai_ws'].send(json.dumps(session_config))
            logger.info(f"Session initialized for client {client_id}")
    
    async def handle_openai_messages(self, client_id, openai_ws):
        """Handle messages from OpenAI and forward to client"""
        try:
            async for message in openai_ws:
                if client_id not in self.clients:
                    break
                    
                try:
                    data = json.loads(message)
                    await self.process_openai_message(client_id, data)
                    
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON from OpenAI for client {client_id}")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"OpenAI connection closed for client {client_id}")
        except Exception as e:
            logger.error(f"Error handling OpenAI messages for client {client_id}: {e}")
    
    async def process_openai_message(self, client_id, data):
        """Process and forward OpenAI messages to client"""
        if client_id not in self.clients:
            return
            
        client = self.clients[client_id]
        message_type = data.get("type")
        
        # Forward all messages to client
        try:
            await client['websocket'].send(json.dumps(data))
        except Exception as e:
            logger.error(f"Failed to send message to client {client_id}: {e}")
            return
        
        # Handle specific message types
        if message_type == "session.created":
            client['session_id'] = data.get("session", {}).get("id")
            logger.info(f"Session created for client {client_id}: {client['session_id']}")
            
        elif message_type == "input_audio_buffer.speech_started":
            logger.debug(f"Speech started for client {client_id}")
            
        elif message_type == "input_audio_buffer.speech_stopped":
            logger.debug(f"Speech stopped for client {client_id}")
            
        elif message_type == "conversation.item.input_audio_transcription.completed":
            transcript = data.get("transcript", "")
            logger.info(f"User transcript for client {client_id}: {transcript}")
            
            # Check if we need to search for service information
            should_search = await self.should_search_services(transcript)
            logger.info(f"Should search for '{transcript}': {should_search}")
            
            if should_search:
                try:
                    logger.info(f"Searching knowledge base for: {transcript}")
                    service_info = await self.get_service_info(transcript)
                    logger.info(f"Knowledge base result: {service_info}")
                    
                    # Send knowledge base context to AI
                    context_message = {
                        "type": "conversation.item.create",
                        "item": {
                            "type": "message",
                            "role": "user",
                            "content": [
                                {
                                    "type": "input_text",
                                    "text": f"Context from knowledge base: {service_info}. Please use this information to provide accurate service codes and pricing information."
                                }
                            ]
                        }
                    }
                    if client['openai_ws']:
                        await client['openai_ws'].send(json.dumps(context_message))
                        logger.info(f"Sent knowledge base context for client {client_id}")
                except Exception as e:
                    logger.error(f"Error searching knowledge base for client {client_id}: {e}")
            else:
                logger.info(f"No knowledge base search needed for: {transcript}")
            
        elif message_type == "response.audio_transcript.done":
            transcript = data.get("transcript", "")
            logger.info(f"AI response for client {client_id}: {transcript}")
            
        elif message_type == "error":
            error_msg = data.get("error", {}).get("message", "Unknown error")
            logger.error(f"OpenAI error for client {client_id}: {error_msg}")
    
    async def handle_client_message(self, client_id, message):
        """Handle messages from client and forward to OpenAI"""
        if client_id not in self.clients:
            return
            
        client = self.clients[client_id]
        
        try:
            # Handle both JSON and binary messages
            if isinstance(message, bytes):
                # Audio data - forward directly to OpenAI
                if client['openai_ws']:
                    # Create audio append message
                    audio_message = {
                        "type": "input_audio_buffer.append",
                        "audio": base64.b64encode(message).decode('utf-8')
                    }
                    await client['openai_ws'].send(json.dumps(audio_message))
                    
            else:
                # JSON message - forward to OpenAI
                data = json.loads(message)
                if client['openai_ws']:
                    await client['openai_ws'].send(message)
                    
        except Exception as e:
            logger.error(f"Error handling client message for {client_id}: {e}")
    
    async def handle_client(self, websocket, path=None):
        """Handle client WebSocket connection"""
        client_id = await self.register_client(websocket)
        
        try:
            # Connect to OpenAI
            if not await self.connect_to_openai(client_id):
                await websocket.send(json.dumps({
                    "type": "error",
                    "error": {"message": "Failed to connect to OpenAI"}
                }))
                return
            
            # Send connection success
            await websocket.send(json.dumps({
                "type": "connection.established",
                "client_id": client_id
            }))
            
            # Handle client messages
            async for message in websocket:
                await self.handle_client_message(client_id, message)
                
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client {client_id} connection closed")
        except Exception as e:
            logger.error(f"Error handling client {client_id}: {e}")
        finally:
            await self.unregister_client(client_id)

async def main():
    """Start the realtime voice server"""
    server = RealtimeVoiceServer()
    
    logger.info("Starting Realtime Voice Server on ws://localhost:3035")
    logger.info("Features: OpenAI Realtime API, Continuous conversation, Medical billing context")
    
    # Start WebSocket server
    async with websockets.serve(
        server.handle_client,
        "localhost",
        3035,
        ping_interval=20,
        ping_timeout=10
    ):
        logger.info("Realtime Voice Server is running")
        logger.info("Press Ctrl+C to stop")
        
        # Keep server running
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}") 