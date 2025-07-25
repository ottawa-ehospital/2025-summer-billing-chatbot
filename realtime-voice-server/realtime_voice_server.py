import asyncio
import websockets
import json
import base64
import os
import sys
from dotenv import load_dotenv
import logging
import csv
from typing import List, Dict, Any, Optional

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# OpenAI API configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    logger.error("OPENAI_API_KEY not found in environment variables")
    sys.exit(1)

OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"

class SimpleRAGService:
    """Simplified RAG service for the standalone voice server"""
    
    def __init__(self):
        self.services = []
        self._load_services()
    
    def _load_services(self):
        """Load services from CSV files"""
        try:
            # Look for CSV files in the data directory
            data_dir = os.path.join(os.path.dirname(__file__), "data")
            if os.path.exists(data_dir):
                for filename in os.listdir(data_dir):
                    if filename.startswith("dataset_schedule_of_benefits") and filename.endswith(".csv"):
                        file_path = os.path.join(data_dir, filename)
                        with open(file_path, encoding="utf-8-sig") as f:
                            reader = csv.DictReader(f)
                            for row in reader:
                                billing_code = row.get("Billing Code") or row.get("CODE", "")
                                if billing_code:
                                    amount = (row.get("Charge $") or 
                                            row.get("$") or 
                                            row.get("T") or 
                                            row.get("Charge $(provider)") or 
                                            "")
                                    
                                    description = row.get("Description", "")
                                    
                                    if billing_code and (description or amount):
                                        self.services.append({
                                            "code": billing_code,
                                            "name": description,
                                            "fee": amount
                                        })
            logger.info(f"Loaded {len(self.services)} services from CSV files")
        except Exception as e:
            logger.error(f"Error loading services: {e}")
    
    def search_services(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search services by query"""
        query_lower = query.lower()
        matches = []
        
        for service in self.services:
            service_name = service.get('name', '').lower()
            service_code = service.get('code', '').lower()
            
            if (query_lower in service_name or 
                query_lower in service_code or
                any(word in service_name for word in query_lower.split())):
                matches.append(service)
        
        # Sort by relevance (simple scoring)
        matches.sort(key=lambda x: len([word for word in query_lower.split() if word in x['name'].lower()]), reverse=True)
        return matches[:top_k]
    
    def process_query(self, query: str, top_k: int = 3) -> Dict[str, Any]:
        """Process a query and return context"""
        services = self.search_services(query, top_k)
        
        if services:
            context_parts = []
            for service in services:
                context_parts.append(f"{service['name']} (code: {service['code']}, price: ${service['fee']})")
            
            return {
                "context": "; ".join(context_parts),
                "services": services
            }
        
        return {"context": "", "services": []}

# Initialize RAG service
rag_service = SimpleRAGService()

class RealtimeVoiceServer:
    def __init__(self):
        self.clients = {}
        
    async def get_service_info(self, query):
        """Get service information from knowledge base"""
        try:
            result = rag_service.process_query(query, top_k=3)
            if result.get('context'):
                return f"From knowledge base: {result['context']}"
            return f"Found service information for: {query}"
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
            'test', 'examination', 'scan', 'ultrasound', 'mri', 'ct',
            'blood', 'lab', 'laboratory', 'ekg', 'ecg', 'electrocardiogram'
        ]
        
        message_lower = message_text.lower()
        return any(keyword in message_lower for keyword in search_keywords)
    
    async def register_client(self, websocket):
        """Register a new client"""
        import uuid
        client_id = str(uuid.uuid4())
        self.clients[client_id] = {
            'websocket': websocket,
            'openai_ws': None,
            'session_id': None
        }
        logger.info(f"Registered client {client_id}")
        return client_id
    
    async def unregister_client(self, client_id):
        """Unregister a client"""
        if client_id in self.clients:
            client = self.clients[client_id]
            if client['openai_ws']:
                await client['openai_ws'].close()
            del self.clients[client_id]
            logger.info(f"Unregistered client {client_id}")
    
    async def connect_to_openai(self, client_id):
        """Connect to OpenAI Realtime API"""
        if client_id not in self.clients:
            return False
            
        client = self.clients[client_id]
        
        try:
            # Connect to OpenAI
            openai_ws = await websockets.connect(
                OPENAI_REALTIME_URL,
                extra_headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                }
            )
            
            client['openai_ws'] = openai_ws
            
            # Initialize session
            await self.initialize_session(client_id)
            
            # Start handling OpenAI messages
            asyncio.create_task(self.handle_openai_messages(client_id, openai_ws))
            
            logger.info(f"Connected to OpenAI for client {client_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to OpenAI for client {client_id}: {e}")
            return False
    
    async def initialize_session(self, client_id):
        """Initialize OpenAI session"""
        if client_id not in self.clients:
            return
            
        client = self.clients[client_id]
        
        try:
            # Send session initialization
            init_message = {
                "type": "session.init",
                "data": {
                    "mode": "text",
                    "voice": "alloy",
                    "input_audio_format": "pcm16",
                    "output_audio_format": "pcm16",
                    "sample_rate": 24000,
                    "chunk_length_s": 0.1,
                    "enable_interruption": True,
                    "enable_emojis": False,
                    "enable_ducking": True,
                    "ducking_activation_percentage": 0.1,
                    "ducking_deactivation_percentage": 0.1,
                    "ducking_ramp_in_ms": 100,
                    "ducking_ramp_out_ms": 100,
                    "ducking_volume_reduction_percentage": 0.1,
                    "enable_web_search": False,
                    "enable_tools": False,
                    "tools": [],
                    "system_prompt": """You are a helpful medical billing assistant. You help doctors and medical staff with billing questions and service code lookups. 

When users ask about medical services, procedures, or billing codes, provide accurate information from the knowledge base. Be professional, concise, and helpful.

Key capabilities:
- Answer questions about medical billing codes and services
- Provide pricing information for medical procedures
- Help with OHIP billing questions
- Assist with service code lookups

Always be polite and professional in your responses."""
                }
            }
            
            await client['openai_ws'].send(json.dumps(init_message))
            logger.info(f"Initialized session for client {client_id}")
            
        except Exception as e:
            logger.error(f"Error initializing session for client {client_id}: {e}")
    
    async def handle_openai_messages(self, client_id, openai_ws):
        """Handle messages from OpenAI"""
        if client_id not in self.clients:
            return
            
        client = self.clients[client_id]
        
        try:
            async for message in openai_ws:
                await self.process_openai_message(client_id, message)
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"OpenAI connection closed for client {client_id}")
        except Exception as e:
            logger.error(f"Error handling OpenAI messages for client {client_id}: {e}")
    
    async def process_openai_message(self, client_id, message):
        """Process a message from OpenAI"""
        if client_id not in self.clients:
            return
            
        client = self.clients[client_id]
        
        try:
            data = json.loads(message)
            message_type = data.get("type", "")
            
            # Forward message to client
            await client['websocket'].send(message)
            
            if message_type == "input_audio_transcript.interim":
                transcript = data.get("transcript", "")
                logger.info(f"Interim transcript for client {client_id}: {transcript}")
                
                # Check if we should search knowledge base
                if await self.should_search_services(transcript):
                    try:
                        service_info = await self.get_service_info(transcript)
                        # Send service info as a text message
                        info_message = {
                            "type": "text",
                            "text": service_info
                        }
                        await client['websocket'].send(json.dumps(info_message))
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
                
        except Exception as e:
            logger.error(f"Error processing OpenAI message for client {client_id}: {e}")
    
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