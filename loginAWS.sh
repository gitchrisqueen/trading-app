#!/usr/bin/env bash

# Load env variables (in the .env file)
set -o allexport
source .env
set +o allexport


echo "Income Level?:"
select incomeLevel in "Intra-Day" "Hourly" "Daily"; do
  case "$incomeLevel" in
  "Intra-Day")
    ssh_ip="${SEVER_1_IP}"
    break
    ;;
  "Hourly")
    ssh_ip="${SEVER_2_IP}"
    break
    ;;
  "Daily")
    ssh_ip="${SEVER_3_IP}"
    break
    ;;
  *) echo invalid option ;;
  esac
done



function tailDockerScript() {
  # Tail any running docker container with name TradingApp
  docker logs -f $(docker ps -f "name=TradingApp" --format "{{.Names}}")
}

echo "Tail Docker?:"
select incomeLevel in "Yes" "No"; do
  case "$incomeLevel" in
  "Yes")
    ssh -i ~/.ssh/aws_trading_app_keypair.pem ec2-user@"$ssh_ip" "$(typeset -f tailDockerScript); tailDockerScript"
    break
    ;;
  "No")
    ssh -i ~/.ssh/aws_trading_app_keypair.pem ec2-user@"$ssh_ip"
    break
    ;;
  *) echo invalid option ;;
  esac
done

