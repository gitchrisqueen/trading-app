FROM node:12.4
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm install
COPY src ./
EXPOSE 80
CMD ["node","--expose-gc","--max_old_space_size=4096", "./app.js"]
