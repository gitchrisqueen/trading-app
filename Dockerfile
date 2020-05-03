FROM node
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
#COPY node_modules ./
RUN npm install
COPY src ./src
EXPOSE 80
# For Local Docker with more space and debuging options
#CMD ["node","--trace-warnings","--expose-gc","--max_old_space_size=4096","./src/app.js"]
CMD ["node","./src/app.js"]
