import sys
import asyncio
import csv
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Fetch API keys and index names from environment
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")

if sys.platform.startswith("darwin") and sys.version_info >= (3, 8):
    asyncio.set_event_loop_policy(asyncio.DefaultEventLoopPolicy())
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from services import bill
from services.service_combination_service import ServiceCombinationService
from services.enhanced_rag_service import enhanced_rag_service
import websockets
import base64
from pydantic import BaseModel
import openai
import re
import json
from typing import List
from pinecone import Pinecone
from openai import OpenAI

app = FastAPI(title="Medical Billing Assistant API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(bill.router, prefix="/api/bill", tags=["bill"])

# Initialize service combination service
service_combination_service = ServiceCombinationService()

class ChatRequest(BaseModel):
    message: str
    context: dict = {}
    chat_history: list = []

class ServiceCombinationRequest(BaseModel):
    description: str
    max_services: int = 5

class ServiceComparisonRequest(BaseModel):
    service_codes: List[str]

class ServiceDetailsRequest(BaseModel):
    service_code: str

class ServiceAlternativesRequest(BaseModel):
    service_code: str
    reason: str = ""

BILL_FIELDS = [
    "patientName", "ohipNumber", "serviceDate", "serviceType",
    "diagnosisCode", "serviceCode", "serviceName", "amount", "note", "billingType"
]

openai.api_key = OPENAI_API_KEY

services = []
data_dir = os.path.join(os.path.dirname(__file__), "data")
for filename in os.listdir(data_dir):
    if filename.startswith("dataset_schedule_of_benefits") and filename.endswith(".csv"):
        with open(os.path.join(data_dir, filename), encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("Billing Code"):
                    services.append({
                        "code": row.get("Billing Code"),
                        "description": row.get("Description"),
                        "amount": row.get("Charge $")
                    })

ASSISTANT_ID = os.getenv("ASSISTANT_ID")

def extract_fields_from_assistant(user_message, chat_history=None):
    # Use RAG to get context
    rag_result = enhanced_rag_service.process_query(user_message, chat_history=chat_history or [])
    rag_context = ''
    if isinstance(rag_result, dict):
        rag_context = rag_result.get('context', '') or rag_result.get('answer', '') or ''
    # Build system prompt with RAG context
    system_prompt = f"""You are a helpful medical billing assistant. 

If this is the user's first message (like "hi" or a greeting), respond warmly and ask how you can help with their billing needs.

When the user describes medical services, use the context below to identify ALL mentioned services with their specific codes and fees. Search for each service separately (e.g., "general assessment" AND "chest x-ray").

Be conversational and helpful - ask for one piece of information at a time if needed.

When you have enough information, provide a JSON response with ALL services found from your knowledge base:
{{
  "patientName": "name",
  "serviceDate": "YYYY-MM-DD",
  "ohipNumber": "number",
  "services": [
    {{"serviceName": "service name from database", "serviceCode": "code from database", "unitPrice": actual_price_from_database}}
  ]
}}

Context:
{rag_context}"""
    thread_messages = []
    if chat_history:
        for m in chat_history:
            if m.get("role") in ("user", "assistant") and m.get("content"):
                thread_messages.append({"role": m["role"], "content": m["content"]})
    # Insert RAG context as the first user message
    thread_messages.insert(0, {"role": "user", "content": system_prompt})
    thread_messages.append({"role": "user", "content": user_message})
    # Create a thread and run the assistant
    thread = openai.beta.threads.create(messages=thread_messages)
    run = openai.beta.threads.runs.create(thread_id=thread.id, assistant_id=ASSISTANT_ID)
    import time
    while True:
        run_status = openai.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)
        if run_status.status == "completed":
            break
        elif run_status.status == "failed":
            raise Exception("OpenAI Assistant run failed")
        time.sleep(0.5)
    messages = openai.beta.threads.messages.list(thread_id=thread.id)
    answer = ""
    for msg in messages.data:
        if msg.role == "assistant":
            answer = msg.content[0].text.value
            break
    import re, json
    match = re.search(r'({[\s\S]*})', answer)
    bill_info = {}
    service_list = []
    if match:
        try:
            bill_info = json.loads(match.group(1))
            # Normalize field names
            if 'billingDate' in bill_info:
                bill_info['serviceDate'] = bill_info['billingDate']
            
            # Handle services array with different field names
            if bill_info.get("serviceList") and isinstance(bill_info["serviceList"], list):
                service_list = bill_info["serviceList"]
            elif bill_info.get("services") and isinstance(bill_info["services"], list):
                service_list = bill_info["services"]
                bill_info["serviceList"] = service_list
            
            # Normalize service field names and find highest fee
            for service in service_list:
                if 'serviceCode' in service and 'code' not in service:
                    service['code'] = service['serviceCode']
                if 'serviceName' in service and 'name' not in service:
                    service['name'] = service['serviceName']
                if 'unitPrice' in service and 'amount' not in service:
                    service['amount'] = service['unitPrice']
            
            if service_list:
                # For OHIP, keep all services for summary but mark highest
                highest = max(service_list, key=lambda s: float(s.get("amount", 0)))
                bill_info["serviceList"] = service_list  # Keep all for summary
                bill_info["optimalService"] = highest  # Mark the best one
        except Exception as e:
            print("Error parsing assistant JSON:", e)
    return answer, bill_info

def process_user_message(user_message: str, chat_history: list):
    """Run assistant, build summary, detect missing fields, and return tuple (reply, bill_info, missing_fields)."""
    reply, bill_info = extract_fields_from_assistant(user_message, chat_history)

    # Only detect missing fields for final billing, not for conversation
    essential_fields = ["patientName", "ohipNumber", "serviceDate"]
    missing_fields = [f for f in essential_fields if not bill_info.get(f)]

    # Compose summary & optimal bill if info sufficient
    if not missing_fields and bill_info.get("serviceList"):
        services = bill_info["serviceList"]
        
        # Build detailed service explanation
        service_details = []
        for i, s in enumerate(services, 1):
            code = s.get('code', '')
            name = s.get('name', s.get('description', ''))
            amount = s.get('amount', '0')
            service_details.append(f"Service {i}: {name} (Code: {code}, Fee: ${amount})")
        
        services_explanation = "\n".join(service_details)
        
        # Find optimal service (highest fee)
        optimal_service = bill_info.get("optimalService") or max(services, key=lambda s: float(s.get("amount", 0)))
        optimal_code = optimal_service.get('code', '')
        optimal_name = optimal_service.get('name', optimal_service.get('description', ''))
        optimal_amount = optimal_service.get('amount', '0')

        summary_lines = [
            "Here is a summary of the collected billing information:",
            f"Patient Name: {bill_info.get('patientName', 'N/A')}",
            f"OHIP Number: {bill_info.get('ohipNumber', 'N/A')}",
            f"Date of Service: {bill_info.get('serviceDate', 'N/A')}",
            "",
            "Available services found:",
            services_explanation,
            "",
            f"The selected service is {optimal_name} (Code: {optimal_code}) for ${optimal_amount}, because this service yields the highest reimbursement among the options."
        ]
        summary_text = "\n".join(summary_lines)
        reply = f"{summary_text}\n\n---\n{reply}"

    return reply, bill_info, missing_fields

@app.post("/chat")
async def chat_with_ai(req: ChatRequest):
    user_message = req.message
    chat_history = req.chat_history or []
    reply, bill_info, missing_fields = process_user_message(user_message, chat_history)
    return {
        "reply": reply,
        "billInfo": bill_info,
        "missingFields": missing_fields
    }

@app.get("/")
async def root():
    return {"message": "Medical Billing Assistant API is running"}

@app.post("/api/services/optimal")
async def find_optimal_services(req: ServiceCombinationRequest):
    """Find optimal service combinations based on user description"""
    try:
        result = service_combination_service.find_optimal_services(
            req.description, 
            req.max_services
        )
        return result
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/services/compare")
async def compare_services(req: ServiceComparisonRequest):
    """Compare multiple service options"""
    try:
        result = service_combination_service.compare_service_options(req.service_codes)
        return result
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/services/details")
async def get_service_details(req: ServiceDetailsRequest):
    """Get detailed information about a specific service"""
    try:
        result = service_combination_service.get_service_details(req.service_code)
        return result
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/services/alternatives")
async def suggest_alternatives(req: ServiceAlternativesRequest):
    """Suggest alternative services for a given service code"""
    try:
        result = service_combination_service.suggest_alternatives(
            req.service_code, 
            req.reason
        )
        return result
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/services/search")
async def search_services(query: str, limit: int = 10):
    """Search for services using semantic search"""
    try:
        results = service_combination_service.rag_service.search_similar(query, top_k=limit)
        services = []
        for result in results:
            services.append({
                "code": result.metadata.get("code", ""),
                "description": result.metadata.get("description", ""),
                "category": result.metadata.get("category", ""),
                "charge": result.metadata.get("charge", 0.0),
                "similarity_score": result.score
            })
        return {"services": services}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/pinecone-search")
async def pinecone_search(query: str, top_k: int = 1):
    """Semantic search for services using Pinecone"""
    try:
        # 1. Get embedding
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        embedding_response = openai_client.embeddings.create(
            model="text-embedding-ada-002",
            input=query
        )
        embedding = embedding_response.data[0].embedding
        # 2. Query Pinecone
        pc = Pinecone(api_key=PINECONE_API_KEY)
        index = pc.Index(PINECONE_INDEX_NAME)
        res = index.query(vector=embedding, top_k=top_k, include_metadata=True)
        matches = res.matches if hasattr(res, 'matches') else res["matches"]
        if not matches:
            return {"result": None, "message": "No match found"}
        # 3. Return top match info
        top = matches[0]
        meta = top.metadata
        return {
            "result": {
                "code": meta.get("code", ""),
                "name": meta.get("name", ""),
                "description": meta.get("description", ""),
                "amount": meta.get("fee", 0),
                "category": meta.get("category", ""),
                "section": meta.get("section", ""),
                "notes": meta.get("notes", ""),
                "score": top.score
            }
        }
    except Exception as e:
        return {"error": str(e)}

