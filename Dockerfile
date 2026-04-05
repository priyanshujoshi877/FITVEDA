FROM node:20-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    pipx \
    ca-certificates \
    && pipx install yt-dlp \
    && apt-get purge -y python3-pip pipx \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.local/bin:$PATH"

# --- Build stage ---
FROM base AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci
RUN npm install --no-save lightningcss-linux-x64-gnu@1.30.2 @tailwindcss/oxide-linux-x64-gnu@4.1.18

COPY . .
RUN npm run build

# --- Production stage ---
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
# Copy static assets and public files (not included in standalone)
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Create video storage directory
RUN mkdir -p /tmp/fitveda

EXPOSE 3000

CMD ["node", "server.js"]
