FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx ng build --configuration production --base-href=/new/

FROM node:20-alpine
RUN npm install -g serve
WORKDIR /usr/src/app
COPY --from=builder /app/dist/iserve-uiv2/browser .
EXPOSE 80
CMD ["serve", "-s", ".", "-l", "80"]
