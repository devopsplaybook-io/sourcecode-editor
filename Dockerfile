# BUILD
FROM node:22-alpine as builder

WORKDIR /opt/src

RUN apk add --no-cache bash git python3 perl alpine-sdk

COPY sourcecode-editor-server sourcecode-editor-server

RUN cd sourcecode-editor-server && \
    npm ci && \
    npm run build

COPY sourcecode-editor-web sourcecode-editor-web

RUN cd sourcecode-editor-web && \
    npm ci && \
    npm run generate

# RUN
FROM node:22-alpine

RUN apk add --no-cache kubectl gzip git openssh

COPY entrypoint.sh /entrypoint.sh

COPY --from=builder /opt/src/sourcecode-editor-server/node_modules /opt/app/sourcecode-editor/node_modules
COPY --from=builder /opt/src/sourcecode-editor-server/dist /opt/app/sourcecode-editor/dist
COPY --from=builder /opt/src/sourcecode-editor-web/.output/public /opt/app/sourcecode-editor/web
COPY sourcecode-editor-server/config.json /opt/app/sourcecode-editor/config.json
COPY sourcecode-editor-server/sql /opt/app/sourcecode-editor/sql
COPY package.json /opt/app/sourcecode-editor/package.json

WORKDIR /opt/app/sourcecode-editor

ENTRYPOINT [ "/entrypoint.sh" ]