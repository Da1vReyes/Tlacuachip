FROM node:24-alpine AS build
WORKDIR /app
ARG VITE_API_URL=http://localhost:4000
ARG VITE_USER_SERVICE_URL=http://localhost:4100
ARG VITE_CATALOG_SERVICE_URL=http://localhost:4200
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_USER_SERVICE_URL=$VITE_USER_SERVICE_URL
ENV VITE_CATALOG_SERVICE_URL=$VITE_CATALOG_SERVICE_URL
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
# Vite's preview server is the intentionally small static host used by this
# hackathon deployment, so the Vite binary must exist in the runtime image.
RUN npm ci
COPY --from=build /app/dist ./dist
CMD ["sh", "-c", "./node_modules/.bin/vite preview --host 0.0.0.0 --port ${PORT:-5173}"]
