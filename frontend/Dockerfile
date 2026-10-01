FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci

# Source is bind-mounted by docker-compose for hot reload.
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]
