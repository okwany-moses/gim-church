# Base image with Node.js 20
FROM node:20-slim AS base

# Install build essentials for native dependencies like sqlite3
RUN apt-get update && apt-get install -y python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for compiling TS/esbuild)
RUN npm ci

# Copy the rest of the application files
COPY . .

# Build both frontend and backend
# (Note: For split deployment, we only strictly need the backend build, but building everything ensures server.cjs is created)
RUN npm run build

# Prune devDependencies to keep the image lightweight
RUN npm prune --production

# Expose port 3000
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000

# Start command
CMD ["npm", "run", "start"]
