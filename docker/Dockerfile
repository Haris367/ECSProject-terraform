FROM node:current-alpine3.21

WORKDIR /app

COPY ../app/package*.json ./
RUN npm ci --only=production

COPY ../app .

EXPOSE 3000

CMD ["node", "index.js"]