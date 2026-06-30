FROM node:22-slim

# Instalar LibreOffice Writer para conversao DOCX -> PDF
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libreoffice-writer \
      fonts-liberation \
      fonts-dejavu-core && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY templates ./templates

RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "dist/server.js"]
