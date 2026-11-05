FROM node:20-alpine

WORKDIR /app

# Install dependencies first for efficient layer caching
COPY package.json package-lock.json* ./
RUN npm install

# Copy application source code
COPY . .

EXPOSE 3000

ENV PORT=3000 \
    NODE_ENV=development

CMD ["npm", "run", "dev"]

