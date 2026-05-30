# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies) to build the app
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client and build TypeScript
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/

# Only install production dependencies
RUN npm install --omit=dev

# Generate Prisma Client for the production environment
RUN npx prisma generate

# Copy the compiled JS files from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the API port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
