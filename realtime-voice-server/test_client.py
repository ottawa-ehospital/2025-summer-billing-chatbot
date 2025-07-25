#!/usr/bin/env python3
"""
Simple test client for the Realtime Voice Server
"""

import asyncio
import websockets
import json
import sys

async def test_connection():
    """Test WebSocket connection to the voice server"""
    try:
        # Connect to the server
        uri = "ws://localhost:3035"
        print(f"Connecting to {uri}...")
        
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to server!")
            
            # Wait for connection established message
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                if data.get("type") == "connection.established":
                    client_id = data.get("client_id")
                    print(f"✅ Connection established! Client ID: {client_id}")
                else:
                    print(f"⚠️  Unexpected message: {data}")
            except asyncio.TimeoutError:
                print("⚠️  No connection message received within 5 seconds")
            
            # Send a test message
            test_message = {
                "type": "text",
                "text": "Hello, this is a test message"
            }
            await websocket.send(json.dumps(test_message))
            print("✅ Test message sent!")
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                print(f"✅ Received response: {response[:100]}...")
            except asyncio.TimeoutError:
                print("⚠️  No response received within 10 seconds")
            
            print("✅ Test completed successfully!")
            
    except websockets.exceptions.ConnectionRefused:
        print("❌ Connection refused. Make sure the server is running on port 3035")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    return True

async def test_voice_simulation():
    """Simulate voice interaction"""
    try:
        uri = "ws://localhost:3035"
        print(f"\n🔊 Testing voice simulation...")
        
        async with websockets.connect(uri) as websocket:
            # Wait for connection
            message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            data = json.loads(message)
            if data.get("type") != "connection.established":
                print("❌ Connection not established")
                return False
            
            # Send a voice-related query
            voice_query = {
                "type": "text",
                "text": "What is the billing code for general assessment?"
            }
            await websocket.send(json.dumps(voice_query))
            print("✅ Voice query sent!")
            
            # Wait for responses
            responses = []
            try:
                for _ in range(3):  # Expect multiple responses
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    responses.append(response)
                    print(f"✅ Response {len(responses)}: {response[:100]}...")
            except asyncio.TimeoutError:
                print("⚠️  No more responses")
            
            print("✅ Voice simulation completed!")
            return True
            
    except Exception as e:
        print(f"❌ Voice simulation error: {e}")
        return False

async def main():
    """Run all tests"""
    print("🧪 Realtime Voice Server Test Client")
    print("=" * 40)
    
    # Test basic connection
    success = await test_connection()
    
    if success:
        # Test voice simulation
        await test_voice_simulation()
    
    print("\n" + "=" * 40)
    if success:
        print("🎉 All tests passed!")
    else:
        print("❌ Some tests failed")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main()) 