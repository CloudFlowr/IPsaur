FROM denoland/deno:latest

# # Create deno user
# RUN addgroup --system deno && \
#     adduser --system --ingroup deno deno

# Switch to deno user
USER deno

WORKDIR /app

# Copy manifests first so the dependency install layer caches across
# source-only edits
COPY deno.json* ./
RUN deno install

# Then copy the rest of the source
COPY . .

ENV PORT=8080
EXPOSE 8080
CMD ["deno", "run", "--allow-net", "--allow-read=/app", "--allow-env", "./main.ts"]
