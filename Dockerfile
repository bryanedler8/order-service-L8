# Use an official Node.js runtime as a parent image
FROM node:18.20.4-alpine AS builder

# Set the working directory to /app
WORKDIR /app

# Set the build argument for the app version number
ARG APP_VERSION=0.1.0

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install app dependencies including axios
RUN npm install --production && npm install axios

# Copy the rest of the app source code to the container
COPY . .

# Expose the port the app listens on
EXPOSE 3000

# Set the environment variables
ENV APP_VERSION=$APP_VERSION
ENV PORT=3000
ENV PRODUCT_SERVICE_URL=http://product-service:3002
ENV NODE_ENV=production

# Start the app
CMD [ "npm", "start" ]