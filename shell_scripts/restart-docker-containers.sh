#!/usr/bin/env bash
# Absolute path to this script, e.g. /home/user/bin/foo.sh
SCRIPT=$(readlink "$0")
# Absolute path this script is in, thus /home/user/bin
SCRIPTPATH=$(dirname "$0")

# Stop all Docker containers
#docker stop $(docker ps -aq -f "name=TradingApp")

# Restart all Docker Containers that start with "TradingApp"
docker restart $(docker ps -aq -f "name=TradingApp" --format "{{.Names}}")

# Call this script again in 1 hour
echo "Calling $SCRIPTPATH/restart-docker-containers.sh again in 1 hour"
at -f "$SCRIPTPATH/restart-docker-containers.sh" now + 1 hour
