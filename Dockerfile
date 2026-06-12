# Stage 1: build the React client
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN npm install

# Copy source and build
COPY client/ ./client/
COPY server/ ./server/

RUN npm run build

# Stage 2: production server image
FROM node:22-alpine AS runner

WORKDIR /app

COPY package.json ./
COPY server/package.json ./server/

# Install only server production dependencies
WORKDIR /app/server
RUN npm install --omit=dev

# Copy compiled server code
COPY --from=builder /app/server/dist /app/server/dist

# Copy built client assets into the location Express will serve
COPY --from=builder /app/client/dist /app/client/dist

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
