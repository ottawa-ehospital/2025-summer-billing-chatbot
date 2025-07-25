# 🚀 Quick Start Guide

## 快速开始

### 1. 环境准备
```bash
# 确保已安装Python 3.8+
python3 --version

# 克隆项目（如果从GitHub）
git clone <your-repo-url>
cd realtime-voice-server
```

### 2. 配置API密钥
```bash
# 复制环境变量模板
cp env.example .env

# 编辑.env文件，添加你的OpenAI API密钥
# OPENAI_API_KEY=your_actual_api_key_here
```

### 3. 启动服务器

#### 方法1：使用启动脚本（推荐）
```bash
./start_server.sh
```

#### 方法2：手动启动
```bash
# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt

# 启动服务器
python realtime_voice_server.py
```

### 4. 测试连接

#### 使用Python测试客户端
```bash
python test_client.py
```

#### 使用Web测试页面
1. 打开 `test.html` 文件
2. 点击 "Connect" 按钮
3. 发送测试消息

#### 使用curl测试
```bash
# 测试WebSocket连接（需要websocat工具）
websocat ws://localhost:3035
```

### 5. 验证功能

服务器启动后，你应该看到：
```
INFO:__main__:Starting Realtime Voice Server on ws://localhost:3035
INFO:__main__:Features: OpenAI Realtime API, Continuous conversation, Medical billing context
INFO:__main__:Realtime Voice Server is running
INFO:__main__:Press Ctrl+C to stop
```

### 6. 常见问题

#### 端口被占用
```bash
# 检查端口3035是否被占用
lsof -i :3035

# 如果被占用，可以修改realtime_voice_server.py中的端口号
```

#### OpenAI API密钥错误
- 确保API密钥有效且有足够配额
- 检查.env文件格式是否正确
- 确保API密钥有Realtime API访问权限

#### 依赖安装失败
```bash
# 升级pip
pip install --upgrade pip

# 重新安装依赖
pip install -r requirements.txt --force-reinstall
```

### 7. 生产部署

#### Docker部署
```bash
# 构建镜像
docker build -t realtime-voice-server .

# 运行容器
docker run -p 3035:3035 --env-file .env realtime-voice-server
```

#### Docker Compose部署
```bash
docker-compose up -d
```

### 8. 下一步

- 查看 `README.md` 了解详细功能
- 修改 `data/` 目录中的CSV文件添加更多服务
- 自定义系统提示词以适应你的需求
- 集成到你的前端应用中

## 🎯 功能特性

✅ **实时语音交互** - OpenAI Realtime API  
✅ **医疗知识库** - OHIP服务代码和价格  
✅ **WebSocket通信** - 多客户端支持  
✅ **自动服务搜索** - 智能匹配医疗服务  
✅ **Docker支持** - 容器化部署  
✅ **测试工具** - Python和Web测试客户端  

## 📞 支持

如有问题，请检查：
1. 日志输出
2. 网络连接
3. API密钥配置
4. 依赖版本 