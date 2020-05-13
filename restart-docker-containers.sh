#!/usr/bin/env bash

# Stop all Docker containers
#docker stop $(docker ps -aq -f "name=TradingApp")

# Restart all Docker Containers that start with "TradingApp"
docker restart $(docker ps -aq -f "name=TradingApp" --format "{{.Names}}")

# Call this script again in 1 hour
at -f ./restart-docker-containers.sh now + 1 hour
