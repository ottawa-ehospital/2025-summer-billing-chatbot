import pdfplumber
import json
import re
import os
from typing import List, Dict, Any
from dataclasses import dataclass, asdict
from datetime import datetime

@dataclass
class ServiceItem:
    """Medical billing service item data structure"""
    code: str
    name: str
    description: str
    fee: float
    category: str
    billing_constraints: List[str]
    page_number: int
    section: str
    notes: str = ""

@dataclass
class BillingRule:
    """Billing rule data structure"""
    rule_id: str
    rule_type: str  # "restriction", "combination", "frequency", "timing"
    description: str
    affected_codes: List[str]
    conditions: List[str]
    page_number: int
    section: str

class PDFServiceExtractor:
    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        self.services = []
        self.rules = []
        self.current_section = ""
        
    def extract_services_and_rules(self, start_page: int = 1, end_page: int = None) -> Dict[str, Any]:
        """Extract service items and rules from PDF"""
        print(f"Starting PDF extraction, file: {self.pdf_path}")
        
        with pdfplumber.open(self.pdf_path) as pdf:
            total_pages = len(pdf.pages)
            end_page = end_page or total_pages
            
            print(f"PDF total pages: {total_pages}, extraction range: {start_page}-{end_page}")
            
            for page_num in range(start_page - 1, min(end_page, total_pages)):
                print(f"Processing page {page_num + 1}...")
                page = pdf.pages[page_num]
                text = page.extract_text()
                
                if text:
                    # Update current section
                    self._update_current_section(text)
                    
                    # Extract service items
                    services_on_page = self._extract_services_from_text(text, page_num + 1)
                    self.services.extend(services_on_page)
                    
                    # Extract rules
                    rules_on_page = self._extract_rules_from_text(text, page_num + 1)
                    self.rules.extend(rules_on_page)
        
        return {
            "services": [asdict(service) for service in self.services],
            "rules": [asdict(rule) for rule in self.rules],
            "summary": {
                "total_services": len(self.services),
                "total_rules": len(self.rules),
                "pages_processed": end_page - start_page + 1,
                "extraction_date": datetime.now().isoformat()
            }
        }
    
    def _update_current_section(self, text: str):
        """Update current section information"""
        # Find section titles
        section_patterns = [
            r'^([A-Z][A-Z\s]+)$',  # All caps titles
            r'^(\d+\.\s*[A-Z][A-Za-z\s]+)$',  # Numbered titles
            r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*:?)$'  # Title case titles
        ]
        
        lines = text.split('\n')
        for line in lines[:5]:  # Only check first 5 lines
            line = line.strip()
            for pattern in section_patterns:
                if re.match(pattern, line) and len(line) > 3:
                    self.current_section = line
                    break
    
    def _extract_services_from_text(self, text: str, page_num: int) -> List[ServiceItem]:
        """Extract service items from text"""
        services = []
        
        # Service item patterns - find codes, names, fees
        service_patterns = [
            # Pattern 1: code name fee
            r'([A-Z]\d{3,4})\s+([A-Za-z\s,]+?)\s+(\$?\d+\.?\d*)',
            # Pattern 2: code - name - fee
            r'([A-Z]\d{3,4})\s*[-–]\s*([A-Za-z\s,]+?)\s*[-–]\s*(\$?\d+\.?\d*)',
            # Pattern 3: code name (fee)
            r'([A-Z]\d{3,4})\s+([A-Za-z\s,]+?)\s*\((\$?\d+\.?\d*)\)',
            # Pattern 4: code followed by description and fee
            r'([A-Z]\d{3,4})\s+([A-Za-z\s,\.]+?)\s+(\d+\.?\d*)',
            # Pattern 5: code with description containing numbers
            r'([A-Z]\d{3,4})\s+([A-Za-z\s,\.]+?)\s+(\d+)',
            # Pattern 6: simple code and fee
            r'([A-Z]\d{3,4})\s+(\d+\.?\d*)',
        ]
        
        lines = text.split('\n')
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
                
            for pattern in service_patterns:
                matches = re.findall(pattern, line)
                for match in matches:
                    if len(match) == 3:
                        code, name, fee_str = match
                    elif len(match) == 2:
                        code, fee_str = match
                        name = code  # Use code as name if no name found
                    else:
                        continue
                    
                    # Clean data
                    code = code.strip()
                    name = name.strip()
                    fee_str = fee_str.replace('$', '').strip()
                    
                    # Skip if code is too short or invalid
                    if len(code) < 3 or not code[0].isalpha():
                        continue
                    
                    try:
                        fee = float(fee_str)
                        # Skip if fee is too small (likely not a real fee)
                        if fee < 1.0:
                            continue
                    except ValueError:
                        fee = 0.0
                    
                    # Check if service with same code already exists
                    if not any(s.code == code for s in services):
                        service = ServiceItem(
                            code=code,
                            name=name,
                            description=name,  # Initial description same as name
                            fee=fee,
                            category=self._categorize_service(code, name),
                            billing_constraints=[],
                            page_number=page_num,
                            section=self.current_section
                        )
                        services.append(service)
        
        return services
    
    def _extract_rules_from_text(self, text: str, page_num: int) -> List[BillingRule]:
        """Extract billing rules from text"""
        rules = []
        
        # Enhanced rule patterns based on actual PDF content
        rule_patterns = [
            # Eligibility rules
            r'([^.]*(?:is only eligible for payment if|is not eligible for payment when|not eligible for payment)[^.]*\.)',
            # Service restrictions
            r'([^.]*(?:cannot|can\'t|not allowed|prohibited|restricted|excluded|no more than|not to be billed)[^.]*\.)',
            # Time-based rules
            r'([^.]*(?:same day|concurrent|simultaneous|within|during|on the same|in the same)[^.]*\.)',
            # Conditional rules
            r'([^.]*(?:if|when|provided|subject to|conditional|unless|except)[^.]*\.)',
            # Billing instructions
            r'([^.]*(?:submit claims|claims submission|bill|billing|claim|report|document)[^.]*\.)',
            # Service restrictions
            r'([^.]*(?:not covered|not eligible|not payable|not reimbursed)[^.]*\.)',
            # Fee adjustments
            r'([^.]*(?:reduce.*fee|increase.*fee|adjust.*fee|fee.*reduced|fee.*increased)[^.]*\.)',
            # Special conditions
            r'([^.]*(?:special|additional|extra|premium|bonus|add|plus)[^.]*\.)',
            # Administrative rules
            r'([^.]*(?:must|should|required|mandatory|obligatory)[^.]*\.)',
            # Service combinations
            r'([^.]*(?:when rendered with|in combination with|together with)[^.]*\.)',
            # Time requirements
            r'([^.]*(?:minimum.*minutes|at least.*minutes|spend.*minutes)[^.]*\.)',
            # Documentation requirements
            r'([^.]*(?:recorded in|documented in|permanent medical record)[^.]*\.)',
        ]
        
        sentences = re.split(r'[.!?]', text)
        rule_id_counter = 1
        
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) < 10:  # Reduced minimum length
                continue
                
            for pattern in rule_patterns:
                matches = re.findall(pattern, sentence, re.IGNORECASE)
                for match in matches:
                    if match and len(match.strip()) > 8:  # Ensure match has meaningful content
                        # Extract related service codes
                        affected_codes = re.findall(r'[A-Z]\d{3,4}', match)
                        
                        rule = BillingRule(
                            rule_id=f"RULE_{page_num}_{rule_id_counter}",
                            rule_type=self._classify_rule_type(match),
                            description=match,
                            affected_codes=affected_codes,
                            conditions=self._extract_conditions(match),
                            page_number=page_num,
                            section=self.current_section
                        )
                        rules.append(rule)
                        rule_id_counter += 1
        
        return rules
    
    def _categorize_service(self, code: str, name: str) -> str:
        """Categorize service based on code and name"""
        name_lower = name.lower()
        code_prefix = code[:2] if len(code) >= 2 else code
        
        # Classification based on code prefix
        code_categories = {
            'A': 'Assessment',
            'C': 'Consultation',
            'E': 'Emergency',
            'F': 'Follow-up',
            'H': 'Hospital',
            'L': 'Laboratory',
            'P': 'Procedure',
            'R': 'Radiology',
            'S': 'Surgery',
            'T': 'Treatment'
        }
        
        # Classification based on name keywords
        name_categories = {
            'assessment': 'Assessment',
            'consultation': 'Consultation',
            'emergency': 'Emergency',
            'follow': 'Follow-up',
            'lab': 'Laboratory',
            'x-ray': 'Radiology',
            'surgery': 'Surgery',
            'procedure': 'Procedure',
            'treatment': 'Treatment',
            'examination': 'Examination'
        }
        
        # Prioritize code classification
        if code_prefix in code_categories:
            return code_categories[code_prefix]
        
        # Then use name classification
        for keyword, category in name_categories.items():
            if keyword in name_lower:
                return category
        
        return 'Other'
    
    def _classify_rule_type(self, rule_text: str) -> str:
        """Classify rule type"""
        text_lower = rule_text.lower()
        
        if any(word in text_lower for word in ['maximum', 'max', 'limit', 'once', 'twice']):
            return 'frequency'
        elif any(word in text_lower for word in ['cannot', 'prohibited', 'restricted']):
            return 'restriction'
        elif any(word in text_lower for word in ['same day', 'concurrent', 'simultaneous']):
            return 'combination'
        elif any(word in text_lower for word in ['if', 'when', 'provided']):
            return 'conditional'
        else:
            return 'general'
    
    def _extract_conditions(self, rule_text: str) -> List[str]:
        """Extract conditions from rule text"""
        conditions = []
        
        # Extract if/when conditions
        if_conditions = re.findall(r'(?:if|when)\s+([^,]+)', rule_text, re.IGNORECASE)
        conditions.extend(if_conditions)
        
        # Extract time conditions
        time_conditions = re.findall(r'(?:within|during|same day|concurrent)', rule_text, re.IGNORECASE)
        conditions.extend(time_conditions)
        
        return conditions
    
    def save_to_json(self, data: Dict[str, Any], output_file: str):
        """Save extracted data to JSON file"""
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Data saved to: {output_file}")
    
    def save_to_csv(self, data: Dict[str, Any], output_dir: str):
        """Save extracted data to CSV files"""
        import pandas as pd
        
        # Save service data
        if data['services']:
            services_df = pd.DataFrame(data['services'])
            services_file = os.path.join(output_dir, 'services.csv')
            services_df.to_csv(services_file, index=False, encoding='utf-8')
            print(f"Service data saved to: {services_file}")
        
        # Save rule data
        if data['rules']:
            rules_df = pd.DataFrame(data['rules'])
            rules_file = os.path.join(output_dir, 'rules.csv')
            rules_df.to_csv(rules_file, index=False, encoding='utf-8')
            print(f"Rule data saved to: {rules_file}")

def main():
    """Main function"""
    # Configuration parameters
    pdf_path = "../../Ohip Benefits.pdf"  # Path relative to backend/scripts directory
    output_dir = "../extracted_data"
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Initialize extractor
    extractor = PDFServiceExtractor(pdf_path)
    
    # Extract data (extract more pages to find rules)
    print("Starting PDF data extraction...")
    data = extractor.extract_services_and_rules(start_page=1, end_page=400)  # Extract first 400 pages
    
    # Save data
    json_file = "../extracted_data/extracted_services_and_rules.json"
    extractor.save_to_json(data, json_file)
    extractor.save_to_csv(data, output_dir)
    
    # Print statistics
    print("\n=== Extraction Statistics ===")
    print(f"Extracted service items: {data['summary']['total_services']}")
    print(f"Extracted rules: {data['summary']['total_rules']}")
    print(f"Pages processed: {data['summary']['pages_processed']}")
    
    # Show first few service items as examples
    if data['services']:
        print("\n=== Service Items Examples ===")
        for i, service in enumerate(data['services'][:5]):
            print(f"{i+1}. {service['code']} - {service['name']} - ${service['fee']}")
    
    # Show first few rules as examples
    if data['rules']:
        print("\n=== Rules Examples ===")
        for i, rule in enumerate(data['rules'][:3]):
            print(f"{i+1}. {rule['rule_type']}: {rule['description'][:100]}...")
    else:
        print("\n=== No Rules Found ===")
        print("No billing rules were extracted. This could be because:")
        print("1. Rules are in different pages (beyond page 400)")
        print("2. Rules use different text patterns than expected")
        print("3. Rules are embedded in service descriptions")
        print("4. PDF structure is different than expected")

if __name__ == "__main__":
    main() 