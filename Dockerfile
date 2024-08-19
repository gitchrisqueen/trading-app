FROM node
WORKDIR /usr/src/app
COPY package.json ./

#Copy all the *.js files
COPY *.js ./

# Copy the needed src files
COPY src ./src

# Run NPM install for the node moudules
RUN npm install
#EXPOSE 80
# For Local Docker with more space and debuging options
#CMD ["node","--trace-warnings","--expose-gc","--max_old_space_size=4096","./src/app.js"]
#CMD ["node","--max_old_space_size=1024","./src/app.js"]
# RUN npm start
CMD ["npm start"]