FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Expose WebSocket port
EXPOSE 3030

# Set environment variable
ENV WS_PORT=3030

# Run the server
CMD ["node", "app.js"]
