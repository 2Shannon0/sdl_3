FROM node:alpine

WORKDIR /node-app

COPY package.json .

RUN npm install

COPY . .

WORKDIR /node-app/app

# CMD ["node", "index.js"]