FROM node:20.19.5 AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM deps AS development
COPY prisma ./prisma
COPY src ./src
COPY public ./public
COPY scripts ./scripts
RUN npx prisma generate
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM deps AS build
COPY prisma ./prisma
COPY src ./src
COPY public ./public
COPY scripts ./scripts
RUN npx prisma generate && npm prune --omit=dev

FROM base AS production
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src
COPY --from=build /app/public ./public
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package*.json ./
EXPOSE 3000
CMD ["npm", "start"]

