# syntax=docker/dockerfile:1

FROM node:20-bullseye

# Install Python 3.9, pip, and Nginx
RUN apt-get update \
    && apt-get install -y python3 python3-venv python3-distutils python3-pip nginx \
    && ln -sf /usr/bin/python3 /usr/local/bin/python3 \
    && ln -sf /usr/bin/pip3 /usr/local/bin/pip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node.js dependencies
COPY package.json package-lock.json* ./
RUN npm install --production

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend files
COPY . .

# Copy and configure Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Expose only the proxy port for App Runner
EXPOSE 8080

# Entrypoint script to run all backend services
RUN chmod +x ./start.sh
CMD ["./start.sh"] 