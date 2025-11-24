FROM node:24-alpine3.21 AS build_node

WORKDIR /app 

COPY package.json package-lock.json .

RUN npm i

FROM node:24-alpine3.21 AS runner

WORKDIR /app 

RUN apk update && apk add ffmpeg

COPY --from=build_node /app/node_modules node_modules
COPY . .

CMD ["npm", "run", "start"]
