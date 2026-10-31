FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/data/jefac.sqlite
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3001
VOLUME /data
CMD ["node", "--import", "tsx", "server/index.ts"]