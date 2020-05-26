#!/bin/bash
# Script for starting docker and pulling lasted file

sudo docker service start
docker pull frostbyte07/btc-trading-app:latest
docker rm trading app
docker run -d --name tradingapp frostbyte07/btc-trading-app:latest
docker logs --follow tradingapp
