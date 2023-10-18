FROM node:18

USER root

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .


CMD ["npm", "start"]