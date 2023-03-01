FROM amd64/node:18.13.0-alpine

COPY ./ /weavedb

WORKDIR /weavedb

RUN npm install -g npm@9.5.1
RUN npm install

EXPOSE 9090

CMD ["node", "server.js"]
