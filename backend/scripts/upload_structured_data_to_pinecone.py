import json
import os
import uuid
from typing import List, Dict, Any
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from openai import OpenAI

# Load environment variables
base_dir = os.path.abspath(os.path.dirname(__file__))
env_path = os.path.join(base_dir, '..', '.env')  # Go up one directory to backend
load_dotenv(env_path)

class StructuredDataUploader:
    def __init__(self):
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        self.index_name = os.getenv("PINECONE_INDEX_NAME", "medical-bills")
        
        # Ensure index exists
        self._ensure_index_exists()
        
    def _ensure_index_exists(self):
        """Ensure Pinecone index exists"""
        if self.index_name not in self.pc.list_indexes().names():
            print(f"Creating index: {self.index_name}")
            self.pc.create_index(
                name=self.index_name,
                dimension=1536,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region="us-west-2"
                )
            )
        else:
            print(f"Using existing index: {self.index_name}")
        
        self.index = self.pc.Index(self.index_name)
    
    def get_embedding(self, text: str) -> List[float]:
        """Get text embedding"""
        response = self.openai_client.embeddings.create(
            model="text-embedding-ada-002",
            input=text
        )
        return response.data[0].embedding
    
    def create_service_embedding_text(self, service: Dict[str, Any]) -> str:
        """Create embedding text for service item"""
        text_parts = [
            f"Service Code: {service['code']}",
            f"Service Name: {service['name']}",
            f"Description: {service['description']}",
            f"Category: {service['category']}",
            f"Fee: ${service['fee']}"
        ]
        
        # Add billing constraints
        if service.get('billing_constraints'):
            constraints_text = ", ".join(service['billing_constraints'])
            text_parts.append(f"Billing Constraints: {constraints_text}")
        
        # Add section information
        if service.get('section'):
            text_parts.append(f"Section: {service['section']}")
        
        # Add notes
        if service.get('notes'):
            text_parts.append(f"Notes: {service['notes']}")
        
        return " | ".join(text_parts)
    
    def create_rule_embedding_text(self, rule: Dict[str, Any]) -> str:
        """Create embedding text for rule"""
        text_parts = [
            f"Rule ID: {rule['rule_id']}",
            f"Rule Type: {rule['rule_type']}",
            f"Description: {rule['description']}"
        ]
        
        # Add affected codes
        if rule.get('affected_codes'):
            codes_text = ", ".join(rule['affected_codes'])
            text_parts.append(f"Affected Codes: {codes_text}")
        
        # Add conditions
        if rule.get('conditions'):
            conditions_text = ", ".join(rule['conditions'])
            text_parts.append(f"Conditions: {conditions_text}")
        
        # Add section information
        if rule.get('section'):
            text_parts.append(f"Section: {rule['section']}")
        
        return " | ".join(text_parts)
    
    def upload_services(self, services: List[Dict[str, Any]]) -> int:
        """Upload service items to Pinecone"""
        print(f"Starting upload of {len(services)} service items...")
        
        uploaded_count = 0
        batch_size = 100  # Pinecone batch upload limit
        
        for i in range(0, len(services), batch_size):
            batch = services[i:i + batch_size]
            vectors = []
            
            for service in batch:
                # Create embedding text
                embedding_text = self.create_service_embedding_text(service)
                
                # Get embedding
                embedding = self.get_embedding(embedding_text)
                
                # Prepare metadata
                metadata = {
                    "type": "service",
                    "code": service['code'],
                    "name": service['name'],
                    "description": service['description'],
                    "fee": service['fee'],
                    "category": service['category'],
                    "section": service.get('section', ''),
                    "page_number": service.get('page_number', 0),
                    "text": embedding_text,
                    "billing_constraints": json.dumps(service.get('billing_constraints', [])),
                    "notes": service.get('notes', '')
                }
                
                vectors.append({
                    "id": f"service_{service['code']}_{uuid.uuid4().hex[:8]}",
                    "values": embedding,
                    "metadata": metadata
                })
            
            # Batch upload
            try:
                self.index.upsert(vectors=vectors)
                uploaded_count += len(batch)
                print(f"Uploaded {uploaded_count}/{len(services)} service items")
            except Exception as e:
                print(f"Batch upload failed: {e}")
                # Try individual upload
                for vector in vectors:
                    try:
                        self.index.upsert(vectors=[vector])
                        uploaded_count += 1
                    except Exception as e2:
                        print(f"Individual upload failed {vector['id']}: {e2}")
        
        print(f"Service items upload completed: {uploaded_count}/{len(services)}")
        return uploaded_count
    
    def upload_rules(self, rules: List[Dict[str, Any]]) -> int:
        """Upload rules to Pinecone"""
        print(f"Starting upload of {len(rules)} rules...")
        
        uploaded_count = 0
        batch_size = 100
        
        for i in range(0, len(rules), batch_size):
            batch = rules[i:i + batch_size]
            vectors = []
            
            for rule in batch:
                # Create embedding text
                embedding_text = self.create_rule_embedding_text(rule)
                
                # Get embedding
                embedding = self.get_embedding(embedding_text)
                
                # Prepare metadata
                metadata = {
                    "type": "rule",
                    "rule_id": rule['rule_id'],
                    "rule_type": rule['rule_type'],
                    "description": rule['description'],
                    "section": rule.get('section', ''),
                    "page_number": rule.get('page_number', 0),
                    "text": embedding_text,
                    "affected_codes": json.dumps(rule.get('affected_codes', [])),
                    "conditions": json.dumps(rule.get('conditions', []))
                }
                
                vectors.append({
                    "id": f"rule_{rule['rule_id']}_{uuid.uuid4().hex[:8]}",
                    "values": embedding,
                    "metadata": metadata
                })
            
            # Batch upload
            try:
                self.index.upsert(vectors=vectors)
                uploaded_count += len(batch)
                print(f"Uploaded {uploaded_count}/{len(rules)} rules")
            except Exception as e:
                print(f"Batch upload failed: {e}")
                # Try individual upload
                for vector in vectors:
                    try:
                        self.index.upsert(vectors=[vector])
                        uploaded_count += 1
                    except Exception as e2:
                        print(f"Individual upload failed {vector['id']}: {e2}")
        
        print(f"Rules upload completed: {uploaded_count}/{len(rules)}")
        return uploaded_count
    
    def upload_from_json(self, json_file: str) -> Dict[str, int]:
        """Upload data from JSON file"""
        print(f"Loading data from file: {json_file}")
        
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        services = data.get('services', [])
        rules = data.get('rules', [])
        
        print(f"Loaded {len(services)} service items and {len(rules)} rules")
        
        # Upload service items
        services_uploaded = self.upload_services(services)
        
        # Upload rules
        rules_uploaded = self.upload_rules(rules)
        
        return {
            "services_uploaded": services_uploaded,
            "rules_uploaded": rules_uploaded,
            "total_uploaded": services_uploaded + rules_uploaded
        }
    
    def get_index_stats(self) -> Dict[str, Any]:
        """Get index statistics"""
        stats = self.index.describe_index_stats()
        return {
            "total_vector_count": stats.total_vector_count,
            "dimension": stats.dimension,
            "index_fullness": stats.index_fullness,
            "namespaces": stats.namespaces
        }

def main():
    """Main function"""
    # Configuration parameters
    json_file = "../extracted_data/extracted_services_and_rules.json"
    
    if not os.path.exists(json_file):
        print(f"Error: File not found {json_file}")
        print("Please run extract_services_from_pdf.py first to generate data file")
        return
    
    # Initialize uploader
    uploader = StructuredDataUploader()
    
    # Get statistics before upload
    print("=== Statistics Before Upload ===")
    before_stats = uploader.get_index_stats()
    print(f"Current vector count: {before_stats['total_vector_count']}")
    
    # Upload data
    print("\n=== Starting Data Upload ===")
    upload_results = uploader.upload_from_json(json_file)
    
    # Get statistics after upload
    print("\n=== Statistics After Upload ===")
    after_stats = uploader.get_index_stats()
    print(f"Current vector count: {after_stats['total_vector_count']}")
    print(f"New vectors added: {after_stats['total_vector_count'] - before_stats['total_vector_count']}")
    
    # Print upload results
    print("\n=== Upload Results ===")
    print(f"Service items uploaded: {upload_results['services_uploaded']}")
    print(f"Rules uploaded: {upload_results['rules_uploaded']}")
    print(f"Total uploaded: {upload_results['total_uploaded']}")

if __name__ == "__main__":
    main() 