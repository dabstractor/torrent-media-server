#!/bin/sh
# Nginx Entrypoint Script - Handles environment variable substitution

set -e

echo "Starting nginx with environment variable substitution..."

# Substitute environment variables in the nginx configuration template
envsubst '${VPN_IP_ADDRESS}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "Nginx configuration generated with VPN_IP_ADDRESS=${VPN_IP_ADDRESS}"

# Test the generated configuration
nginx -t

echo "Starting nginx..."
exec nginx -g 'daemon off;'