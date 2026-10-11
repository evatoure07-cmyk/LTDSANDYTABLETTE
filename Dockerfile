FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY public ./public
ENV NODE_ENV=production PORT=3000 DB_FILE=/var/data/recrutement.sqlite
RUN mkdir -p /var/data
EXPOSE 3000
CMD ["node", "server.js"]
