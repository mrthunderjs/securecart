FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p database uploads && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["npm","start"]
