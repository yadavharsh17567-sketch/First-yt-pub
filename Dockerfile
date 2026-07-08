FROM node:22-slim

RUN apt-get update && \
    apt-get install -y ffmpeg python3 curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm ci || npm install

COPY . .

RUN npm run build

EXPOSE 7860

ENV PORT=7860
ENV NODE_ENV=production

USER node

CMD ["npm", "start"]
