FROM sctx/overseerr:latest

# Install gettext for envsubst and curl for health checks
RUN apk add --no-cache gettext curl

# Copy our entrypoint script
COPY scripts/overseerr-entrypoint.sh /overseerr-entrypoint.sh
RUN chmod +x /overseerr-entrypoint.sh

ENTRYPOINT ["/overseerr-entrypoint.sh"]
