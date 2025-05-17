import json
import os
import re
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, Request
from langchain_openai import OpenAIEmbeddings
from langchain_community.chat_models import ChatOpenAI
from langchain_pinecone import PineconeVectorStore
from langchain.chains import ConversationalRetrievalChain

from fastapi.middleware.cors import CORSMiddleware

# Load environment variables from the .env file
load_dotenv()

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (change this in production)
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

def clean_json_response(response_text: str):
    """Removes markdown formatting like triple backticks from OpenAI response"""
    cleaned_text = re.sub(r"```json|```", "", response_text).strip()  # Remove triple backticks
    return cleaned_text

def search_with_rag(input_text: str, chat_history: list):
    """Handles retrieval-augmented generation (RAG) with OpenAI and Pinecone"""
    
    api_key = os.getenv("OPENAI_API_KEY")
    pc_key = os.getenv("PINECONE_API_KEY")
    
    if not api_key or not pc_key:
        raise HTTPException(status_code=500, detail="API keys are missing. Set them as environment variables.")
    
    index_name = "billing-codes"

    # Initialize OpenAI and Pinecone
    embeddings = OpenAIEmbeddings(api_key=api_key)
    vectorstore = PineconeVectorStore(index_name=index_name, embedding=embeddings, pinecone_api_key=pc_key)
    chat = ChatOpenAI(verbose=True, temperature=0, model_name="gpt-4o", api_key=api_key)

    # Create Retrieval Chain
    qa = ConversationalRetrievalChain.from_llm(
        llm=chat, chain_type="stuff", retriever=vectorstore.as_retriever()
    )

    # Structured prompt to enforce JSON format
    prompt = (
        "Extract the procedure performed, billing code, and price. "
        "Strictly return only valid JSON with this exact format:\n"
        "{\n  \"code\": \"returned_code\",\n  \"description\": \"returned_description\",\n  \"unitPrice\": returned_price\n}"
        "\nDo not include any extra text, explanation, or markdown.\n"
        f"Text: {input_text}"
    )

    # Get response from AI
    response = qa({"question": prompt, "chat_history": chat_history})

    # Log the raw AI response
    raw_ai_response = response["answer"]
    print("Raw AI Response:", raw_ai_response)

    # Clean response to remove markdown formatting
    cleaned_json = clean_json_response(raw_ai_response)

    # Ensure valid JSON format
    try:
        extracted_data = json.loads(cleaned_json)  # Convert cleaned string to Python dictionary
        
        # Transform into required JSON structure
        return {
            "codes": [{
                "code": extracted_data.get("code", ""),
                "description": extracted_data.get("description", ""),
                "unitPrice": extracted_data.get("unitPrice", 0.0),
                "unit": 1  # Adding the default unit field
            }]
        }
    except json.JSONDecodeError:
        return {"error": "Invalid JSON response from AI", "raw_response": raw_ai_response}

@app.post("/bill")
async def bill_query(request: Request):
    data = await request.json()
    
    text = data.get("text")
    chat_history = data.get("chat_history", [])
    
    if not text:
        raise HTTPException(status_code=400, detail="Missing 'text' field in request body.")
    
    return search_with_rag(text, chat_history)
