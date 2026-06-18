# Single-container deploy: Express serves the prebuilt client (client/dist is
# committed) + the API. Keeps runtime memory low for 512MB hosts.
FROM node:22-slim

# better-sqlite3 may need build tools if no prebuilt binary matches.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (root + workspaces) using the lockfile.
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm install

# Copy the rest of the source (client/dist is already built + committed).
COPY . .

# Cap V8 heap to stay well under the 512MB limit at runtime.
ENV NODE_OPTIONS=--max-old-space-size=400
ENV PORT=8787
EXPOSE 8787

# The DB ships pre-seeded (data/app.db is committed), so startup only migrates
# (idempotent no-op) + starts the server — NO runtime embedding (no OOM).
CMD ["sh", "-c", "npm run deploy:start:preseeded"]
