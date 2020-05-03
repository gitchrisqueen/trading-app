#!/bin/bash

echo "Income Level?:"

select incomeLevel in "intraday" "hourly" "daily";
do
  case "$incomeLevel" in
  "intraday")
  echo "Starting Intraday Docker";
  break ;;
  "hourly")
  echo "Starting Hourly Docker";
  break ;;
  "daily")
  echo "Starting Daily Docker";
  break ;;
  *) echo invalid option ;;
    esac
done

appName="TradingApp-$incomeLevel"
dockerImage="frostbyte07/btc-trading-app:$incomeLevel"

# Stop any previous container
docker stop "$appName"

# Rmeove the previoud container
docker rm "$appName"

# Pull Latest Inage
docker pull "$dockerImage"

# Start the conatiner
docker run -t -a STDOUT -a STDERR --name "$appName" --restart unless-stopped "$dockerImage"
