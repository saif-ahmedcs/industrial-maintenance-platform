#!/bin/sh
set -eu

# Fail loudly if either broker password is missing or empty.
: "${MQTT_SIMULATOR_PASSWORD:?MQTT_SIMULATOR_PASSWORD must be set}"
: "${MQTT_BACKEND_PASSWORD:?MQTT_BACKEND_PASSWORD must be set}"

PASSWD_FILE=/mosquitto/config/passwd

# Build the password file at container start so no secrets live in the repo.
mosquitto_passwd -b -c "$PASSWD_FILE" simulator "$MQTT_SIMULATOR_PASSWORD"
mosquitto_passwd -b "$PASSWD_FILE" backend "$MQTT_BACKEND_PASSWORD"

# Mosquitto runs as the "mosquitto" user and wants a private password file.
chown mosquitto:mosquitto "$PASSWD_FILE"
chmod 0700 "$PASSWD_FILE"

exec /usr/sbin/mosquitto -c /mosquitto/config/mosquitto.conf
