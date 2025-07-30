import os
from typing import List, Dict, Any, Optional
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain.schema import Document
from pinecone import Pinecone
import logging

logger = logging.getLogger(__name__)

class EnhancedRAGService:
    def __init__(self):
        # Use environment variable for index name
        self.index_name = os.getenv("PINECONE_INDEX_NAME", "medical-bills")
        self.api_key = os.getenv("PINECONE_API_KEY")
        self.environment = os.getenv("PINECONE_ENVIRONMENT", "us-east-1-aws")
        
        # Initialize LangChain components
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-ada-002",
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # Initialize Pinecone
        self.pinecone = Pinecone(api_key=self.api_key)
        
        try:
            # Initialize LangChain Pinecone VectorStore
            self.vector_store = PineconeVectorStore(
                index_name=self.index_name,
                embedding=self.embeddings,
                pinecone_api_key=self.api_key
            )
            logger.info(f"Connected to Pinecone index: {self.index_name}")
        except Exception as e:
            logger.error(f"Failed to connect to Pinecone: {e}")
            self.vector_store = None

    def process_query(self, query: str, chat_history: Optional[List] = None, top_k: int = 3) -> Dict[str, Any]:
        """Process query using LangChain and return service information"""
        if not self.vector_store:
            return {
                "context": "Knowledge base not available.",
                "answer": "Knowledge base connection failed.",
                "type": "service_lookup"
            }
        
        try:
            # Use LangChain similarity search
            docs = self.vector_store.similarity_search(
                query=query,
                k=top_k,
                filter={"type": "service"}  # Only search service items
            )
            
            if not docs:
                return {
                    "context": "No matching service found in the knowledge base.",
                    "answer": "No matching service found.",
                    "type": "service_lookup"
                }
            
            # Process top result
            top_doc = docs[0]
            metadata = top_doc.metadata
            
            # Extract service information with correct field names
            service_code = metadata.get('code', '')
            service_name = metadata.get('name', metadata.get('description', ''))
            service_fee = metadata.get('fee', 0.0)  # Use 'fee' field from upload script
            service_category = metadata.get('category', '')
            
            context_text = f"Service found: {service_name} (code: {service_code}, price: ${service_fee})"
            if service_category:
                context_text += f", category: {service_category}"
            
            # If multiple results, add them as alternatives
            if len(docs) > 1:
                alternatives = []
                for doc in docs[1:]:
                    alt_meta = doc.metadata
                    alt_code = alt_meta.get('code', '')
                    alt_name = alt_meta.get('name', alt_meta.get('description', ''))
                    alt_fee = alt_meta.get('fee', 0.0)
                    if alt_code and alt_name:
                        alternatives.append(f"{alt_name} ({alt_code}, ${alt_fee})")
                
                if alternatives:
                    context_text += f". Alternative services: {', '.join(alternatives[:2])}"
            
            return {
                "context": context_text,
                "answer": f'{{"serviceCode": "{service_code}", "serviceName": "{service_name}", "amount": {service_fee}}}',
                "type": "service_lookup",
                "services": [
                    {
                        "code": doc.metadata.get('code', ''),
                        "name": doc.metadata.get('name', doc.metadata.get('description', '')),
                        "fee": doc.metadata.get('fee', 0.0),
                        "category": doc.metadata.get('category', ''),
                        "score": getattr(doc, 'score', 0.0)
                    } for doc in docs
                ]
            }
            
        except Exception as e:
            logger.error(f"Error processing query '{query}': {e}")
            return {
                "context": f"Error searching knowledge base: {str(e)}",
                "answer": "Search error occurred.",
                "type": "service_lookup"
            }

    def search_multiple_services(self, queries: List[str], top_k: int = 2) -> Dict[str, Any]:
        """Search for multiple services at once"""
        if not self.vector_store:
            return {"error": "Knowledge base not available"}
        
        all_services = []
        for query in queries:
            result = self.process_query(query, top_k=top_k)
            if result.get("services"):
                all_services.extend(result["services"])
        
        # Remove duplicates based on service code
        unique_services = []
        seen_codes = set()
        for service in all_services:
            if service["code"] not in seen_codes:
                unique_services.append(service)
                seen_codes.add(service["code"])
        
        return {
            "services": unique_services,
            "total_found": len(unique_services),
            "queries_processed": len(queries)
        }

    def search_services(self, query, top_k=10):
        # Placeholder: Return mock services
        return [
            {"code": "A001", "name": "Mock Service", "fee": 100.0, "description": "A mock service for testing."}
            for _ in range(top_k)
        ]

    def search_rules(self, query, top_k=10):
        # Placeholder: Return mock rules
        return [
            {"rule_type": "mock_rule", "description": f"Rule for {query}"}
            for _ in range(top_k)
        ]

    def check_compliance(self, service_codes, patient_info=None):
        # Placeholder: Always compliant
        return {"is_compliant": True, "total_cost": 100.0, "issues": [], "recommendations": []}

    def get_optimal_combination(self, requirements):
        # Placeholder: Return mock combination
        return {
            "recommended_services": [
                {"code": "A001", "name": "Optimal Service", "fee": 200.0}
            ],
            "total_cost": 200.0,
            "efficiency_score": 8,
            "coverage_score": 9
        }

    def get_service_details(self, service_code):
        # Placeholder: Return mock details
        return {
            "service": {"code": service_code, "name": "Service Detail", "fee": 123.0, "category": "General"},
            "related_rules": []
        }

    def get_category_services(self, category):
        # Placeholder: Return mock services for a category
        return [
            {"code": "A001", "name": f"Service in {category}", "fee": 100.0}
        ]

enhanced_rag_service = EnhancedRAGService() 