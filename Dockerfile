# Single-container deploy: build the client, run Express (which serves it + the API).
FROM node:22-slim

# better-sqlite3 needs build tools if no prebuilt binary is available.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (root + workspaces) using the lockfile.
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm install

# Copy the rest of the source and build the client.
COPY . .
RUN npm run build

ENV PORT=8787
EXPOSE 8787

# Create schema + seed the KB on container start, then run the server.
# (Seeding needs GEMINI_API_KEY at runtime; pass it as an env var.)
CMD ["sh", "-c", "npm run deploy:setup && npm run start"]
