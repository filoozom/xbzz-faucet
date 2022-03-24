FROM node:16-alpine AS builder

WORKDIR /src
ENV NODE_ENV production

# Only copy package.json and package-lock.json so
# that npm install can be cached
COPY package.json package-lock.json ./

# git is used to install npm packages from git
# ffmpeg is used for Discord Voice
# all other dependencies are for Discord additional packages
RUN npm ci --no-production

COPY . .

RUN npm run build \
  && cp src/abi.json dist/

CMD ["node", "dist/index.js"]
