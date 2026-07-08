FROM node:22-slim

RUN apt-get update && \
    apt-get install -y ffmpeg python3 curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

COPY --chown=user package*.json ./
RUN npm ci || npm install

COPY --chown=user . .

RUN npm run build

EXPOSE 7860

ENV PORT=7860
ENV NODE_ENV=production

CMD ["npm", "start"]
