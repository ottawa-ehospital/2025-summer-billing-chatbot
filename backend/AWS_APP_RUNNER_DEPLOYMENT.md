# AWS App Runner Deployment Guide

This guide walks you through deploying the Medical Billing Assistant backend to AWS App Runner with Nginx reverse proxy.

## Architecture Overview

```
AWS App Runner (Port 8080)
         ↓
    Nginx Reverse Proxy
         ↓
├── /chat → FastAPI (3034)
├── /api/services → FastAPI (3034)  
├── /api/bills → Express (3033)
├── /ws → WebSocket Server (3035)
└── / → FastAPI (3034)
```

## What's Configured

✅ **Nginx Reverse Proxy**: Routes traffic to appropriate services  
✅ **Single Port Exposure**: Port 8080 for App Runner  
✅ **WebSocket Support**: `/ws` routes to real-time voice server  
✅ **Health Check**: `/health` endpoint for App Runner monitoring  
✅ **Multi-Service Support**: FastAPI, Express, and WebSocket in one container  

## Pre-Deployment Steps

### 1. Test Locally (Optional)
```bash
# Build and run the container
docker build -t billing-chatbot-backend:apprunner .
docker run -p 8080:8080 \
  -e OPENAI_API_KEY="your-api-key" \
  -e PINECONE_API_KEY="your-pinecone-key" \
  -e PINECONE_INDEX_NAME="medical-bills" \
  -e ASSISTANT_ID="your-assistant-id" \
  billing-chatbot-backend:apprunner

# Test endpoints
curl http://localhost:8080/health        # Health check
curl http://localhost:8080/              # FastAPI root
curl http://localhost:8080/api/bills     # Express API
```

### 2. Push to ECR
```bash
# Build for ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Tag and push
docker tag billing-chatbot-backend:apprunner ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/billing-chatbot-backend:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/billing-chatbot-backend:latest
```

## App Runner Deployment Options

### Option 1: Using ECR Image

1. **Go to AWS App Runner Console**
2. **Create Service**
3. **Source Type**: Container registry
4. **Container image URI**: `ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/billing-chatbot-backend:latest`
5. **Port**: 8080
6. **Environment Variables**:
   ```
   OPENAI_API_KEY=your-openai-api-key
   PINECONE_API_KEY=your-pinecone-api-key
   PINECONE_INDEX_NAME=medical-bills
   ASSISTANT_ID=your-assistant-id
   PORT=8080
   ```

### Option 2: Using Source Code (GitHub)

1. **Go to AWS App Runner Console**
2. **Create Service**
3. **Source Type**: Source code repository
4. **Repository**: Connect your GitHub repository
5. **Build Configuration**: Use `apprunner.yaml` (already created)
6. **Environment Variables**: Same as above

## Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4 and Realtime API | `sk-...` |
| `PINECONE_API_KEY` | Pinecone vector database API key | `...` |
| `PINECONE_INDEX_NAME` | Pinecone index name | `medical-bills` |
| `ASSISTANT_ID` | OpenAI Assistant ID | `asst_...` |
| `PORT` | App Runner port (auto-set) | `8080` |

## Service Endpoints

Once deployed, your App Runner service will provide:

| Endpoint | Service | Purpose |
|----------|---------|---------|
| `https://your-app.region.awsapprunner.com/` | FastAPI | API root, documentation |
| `https://your-app.region.awsapprunner.com/chat` | FastAPI | AI chat interface |
| `https://your-app.region.awsapprunner.com/api/services/` | FastAPI | Service search, RAG |
| `https://your-app.region.awsapprunner.com/api/bills` | Express | Bill CRUD operations |
| `wss://your-app.region.awsapprunner.com/ws` | WebSocket | Real-time voice chat |
| `https://your-app.region.awsapprunner.com/health` | Nginx | Health check |

## Frontend Configuration

Update your frontend to use the App Runner URL:

```javascript
// Replace localhost URLs with your App Runner service URL
const API_BASE = 'https://your-app.region.awsapprunner.com';
const WS_URL = 'wss://your-app.region.awsapprunner.com/ws';
```

## Monitoring & Debugging

### Health Check
```bash
curl https://your-app.region.awsapprunner.com/health
# Should return: "healthy"
```

### Logs
- View logs in App Runner console
- Look for startup messages from all three services:
  - Nginx startup
  - FastAPI on port 3034
  - Express on port 3033
  - WebSocket server on port 3035

### Common Issues

1. **Service Won't Start**
   - Check environment variables are set
   - Verify all API keys are valid
   - Check App Runner logs for error messages

2. **WebSocket Connection Fails**
   - Ensure using `wss://` (not `ws://`) for HTTPS domains
   - Check `/ws` path in client code
   - Verify WebSocket server is running on port 3035

3. **API Routes Not Working**
   - Check Nginx configuration in container
   - Verify correct paths in frontend requests
   - Test individual services using logs

## Scaling & Performance

- **Auto Scaling**: App Runner handles this automatically
- **Concurrency**: Configure in App Runner settings (default: 100)
- **CPU/Memory**: Adjust based on your workload
- **Health Check**: Uses `/health` endpoint every 30 seconds

## Cost Optimization

- **Use minimum CPU/Memory** that meets your needs
- **Set appropriate auto-scaling** parameters
- **Monitor usage** via CloudWatch metrics
- **Consider pausing** during low-usage periods

## Next Steps

1. Deploy to App Runner using ECR or GitHub
2. Update frontend to use App Runner URLs
3. Test all endpoints (HTTP, WebSocket)
4. Configure custom domain (optional)
5. Set up monitoring and alerts

Your backend is now ready for production deployment on AWS App Runner! 🚀 