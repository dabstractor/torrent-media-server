#!/bin/sh
# Patch /scripts/run to use bash explicitly for wg-quick
sed -i 's|wg-quick up wg0|/bin/bash /usr/bin/wg-quick up wg0|' /scripts/run
sed -i 's|wg-quick down wg0|/bin/bash /usr/bin/wg-quick down wg0|' /scripts/run
