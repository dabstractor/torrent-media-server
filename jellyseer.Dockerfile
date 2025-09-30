FROM fallenbagel/jellyseerr:latest

# Install gettext for envsubst and curl for health checks
RUN apk add --no-cache gettext curl jq

# Copy our entrypoint script
COPY scripts/jellyseer-entrypoint.sh /jellyseer-entrypoint.sh
RUN chmod +x /jellyseer-entrypoint.sh

ENTRYPOINT ["/jellyseer-entrypoint.sh"]
