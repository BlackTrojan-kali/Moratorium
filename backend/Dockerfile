FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY migrations ./migrations
COPY src ./src
COPY create-accounts.mjs ./

RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["npm", "start"]

