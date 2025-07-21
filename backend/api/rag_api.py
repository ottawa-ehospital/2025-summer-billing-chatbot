from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import os
from dotenv import load_dotenv

# 导入我们的服务
from services.enhanced_rag_service import enhanced_rag_service

# 加载环境变量
load_dotenv()

app = FastAPI(title="Medical Billing RAG API", version="1.0.0")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该限制为特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic模型
class ChatMessage(BaseModel):
    role: str
    content: str

class QueryRequest(BaseModel):
    query: str
    chat_history: Optional[List[ChatMessage]] = None
    patient_info: Optional[Dict[str, Any]] = None

class ServiceSearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 10

class ComplianceCheckRequest(BaseModel):
    service_codes: List[str]
    patient_info: Optional[Dict[str, Any]] = None

class OptimalCombinationRequest(BaseModel):
    condition: Optional[str] = None
    procedure: Optional[str] = None
    constraints: Optional[List[str]] = None
    budget_limit: Optional[float] = None

class ServiceDetailsRequest(BaseModel):
    service_code: str

class CategoryServicesRequest(BaseModel):
    category: str

# API端点
@app.get("/")
async def root():
    return {"message": "Medical Billing RAG API is running"}

@app.post("/api/rag/query")
async def process_query(request: QueryRequest):
    """处理用户查询的主端点"""
    try:
        # 转换聊天历史格式
        chat_history = []
        if request.chat_history:
            for msg in request.chat_history:
                chat_history.append({
                    "role": msg.role,
                    "content": msg.content
                })
        
        # 处理查询
        result = enhanced_rag_service.process_query(
            request.query, 
            chat_history=chat_history
        )
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rag/search-services")
async def search_services(request: ServiceSearchRequest):
    """搜索医疗服务"""
    try:
        services = enhanced_rag_service.search_services(
            request.query, 
            top_k=request.top_k
        )
        
        return {
            "success": True,
            "data": {
                "services": services,
                "count": len(services)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rag/search-rules")
async def search_rules(request: ServiceSearchRequest):
    """搜索账单规则"""
    try:
        rules = enhanced_rag_service.search_rules(
            request.query, 
            top_k=request.top_k
        )
        
        return {
            "success": True,
            "data": {
                "rules": rules,
                "count": len(rules)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rag/check-compliance")
async def check_compliance(request: ComplianceCheckRequest):
    """检查服务组合合规性"""
    try:
        compliance = enhanced_rag_service.check_compliance(
            request.service_codes,
            request.patient_info
        )
        
        return {
            "success": True,
            "data": compliance
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rag/optimal-combination")
async def get_optimal_combination(request: OptimalCombinationRequest):
    """获取最优服务组合"""
    try:
        requirements = {
            "condition": request.condition,
            "procedure": request.procedure,
            "constraints": request.constraints or [],
            "budget_limit": request.budget_limit
        }
        
        combination = enhanced_rag_service.get_optimal_combination(requirements)
        
        return {
            "success": True,
            "data": combination
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rag/service-details")
async def get_service_details(request: ServiceDetailsRequest):
    """获取服务详细信息"""
    try:
        details = enhanced_rag_service.get_service_details(request.service_code)
        
        if details is None:
            raise HTTPException(status_code=404, detail="Service not found")
        
        return {
            "success": True,
            "data": details
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rag/category-services")
async def get_category_services(request: CategoryServicesRequest):
    """获取特定类别的服务"""
    try:
        services = enhanced_rag_service.get_category_services(request.category)
        
        return {
            "success": True,
            "data": {
                "category": request.category,
                "services": services,
                "count": len(services)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rag/select-expensive-service")
async def select_expensive_service(request: ServiceSearchRequest):
    """Select the most expensive service from the provided list"""
    try:
        # Search for services
        services = enhanced_rag_service.search_services(
            request.query,
            top_k=request.top_k
        )

        # Find the most expensive service
        if not services:
            raise HTTPException(status_code=404, detail="No services found")

        most_expensive_service = max(services, key=lambda s: s['fee'])

        return {
            "success": True,
            "data": most_expensive_service
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/rag/stats")
async def get_rag_stats():
    """获取RAG系统统计信息"""
    try:
        stats = enhanced_rag_service.index.describe_index_stats()
        
        return {
            "success": True,
            "data": {
                "total_vectors": stats.total_vector_count,
                "dimension": stats.dimension,
                "index_fullness": stats.index_fullness,
                "namespaces": stats.namespaces
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/rag/health")
async def health_check():
    """健康检查端点"""
    try:
        # 简单的健康检查
        stats = enhanced_rag_service.index.describe_index_stats()
        
        return {
            "status": "healthy",
            "index_name": enhanced_rag_service.index_name,
            "total_vectors": stats.total_vector_count,
            "timestamp": "2024-01-01T00:00:00Z"  # 这里应该使用实际时间戳
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

if __name__ == "__main__":
    port = int(os.getenv("RAG_API_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 