FROM --platform=linux/amd64 ubuntu:22.04

# Install required packages for running the server
RUN apt update 
RUN apt install -y curl sudo
RUN curl -sL https://deb.nodesource.com/setup_16.x | sudo bash -
RUN apt install -y nodejs


# Install Dependencies
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm i

# Copy Source
COPY . .

# Run
ENV PORT=8080
EXPOSE 8080
CMD [ "node", "dist/index.js" ]