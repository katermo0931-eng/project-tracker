FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV PORT=4319
EXPOSE 4319

CMD ["node", "server.js"]
