FROM node:22-alpine

# The node image ships a non-root `node` user; /app must be writable by it (Vite caches in node_modules).
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package*.json ./
RUN npm ci

# Source is bind-mounted by docker-compose for hot reload.
COPY --chown=node:node . .

EXPOSE 5173
CMD ["npm", "run", "dev"]
