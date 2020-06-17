#!/usr/bin/env bash
BASEDIR=$(dirname "$0")

# Load env variables (in the .env file)
set -o allexport
source "$BASEDIR/../.env"
set +o allexport

dockerConfig="'$(< $BASEDIR/../aws_docker_config.json)'"
restartBash="'$(< $BASEDIR/restart-docker-containers.sh)'"
#echo "$dockerConfig";
#echo "$restartBash";

#localizing the env variable for port
port="${PORT}"
dockerImage="frostbyte07/btc-trading-app:latest"

echo "Build Container?:"
select doBuild in "Yes" "No"; do
  case "$doBuild" in
  "Yes")
    # Build Image Locally
    docker build -t "$dockerImage" ./
    # Push to Docker Hub
    docker push "$dockerImage"
    break
    ;;
  "No")
    break
    ;;
  *) echo invalid option ;;
  esac
done

echo "Income Level?:"
select incomeLevel in "Intra-Day" "Hourly" "Daily"; do
  case "$incomeLevel" in
  "Intra-Day")
    ssh_ip="${SEVER_1_IP}"
    test_client_key="${TEST_CLIENT_KEY_1}"
    test_secret="${TEST_SECRET_1}"
    client_key="${CLIENT_KEY_1}"
    client_secret="${SECRET_1}"
    break
    ;;
  "Hourly")
    ssh_ip="${SEVER_2_IP}"
    test_client_key="${TEST_CLIENT_KEY_2}"
    test_secret="${TEST_SECRET_2}"
    client_key="${CLIENT_KEY_2}"
    client_secret="${SECRET_2}"
    break
    ;;
  "Daily")
    ssh_ip="${SEVER_3_IP}"
    test_client_key="${TEST_CLIENT_KEY_3}"
    test_secret="${TEST_SECRET_3}"
    client_key="${CLIENT_KEY_3}"
    client_secret="${SECRET_3}"
    break
    ;;
  *) echo invalid option ;;
  esac
done

echo "Test or Live?"
select type in "test" "live"; do
  case "$type" in
  "test")
    deribit_url="${DERIBIT_TEST_URL}"
    key="$test_client_key"
    secret="$test_secret"
    break
    ;;
  "live")
    deribit_url="${DERIBIT_LIVE_URL}"
    key="$client_key"
    secret="$client_secret"
    break
    ;;
  *) echo invalid option ;;
  esac
done

function getDockerScript() {
  incomeLevel=${1}
  type=${2}
  dockerImage=${3}
  deribit_url=${4}
  key=${5}
  secret=${6}
  host=${7}
  port=${8}
  dockerConfig=${9}
  restartBash=${10}

  appName="TradingApp-${incomeLevel}-${type}"

  # Stop any previous container
  echo "Stopping Previous Containers"
  docker stop $(docker ps -aq -f "name=TradingApp" --format "{{.Names}}")

  # Remove any previous containers
  echo "Removing Previous Containers"
  docker rm $(docker ps -aq -f "name=TradingApp" --format "{{.Names}}")

  # Pull Latest Image
  echo "Pulling latest docker image"
  docker pull "$dockerImage"

  # Start the container
  # Attached
  #docker run -t --memory 983m -a STDOUT -a STDERR --name "$appName" --restart unless-stopped -e INCOMELEVEL="$incomeLevel" -e DOMAIN="$deribit_url" -e KEY="$key" -e SECRET="$secret" "$dockerImage"
  # Detached
  echo "Starting the docker container detached"
  docker run \
    -d \
    -t \
    --memory 1024m \
    --log-driver json-file \
    --log-opt max-size=10m \
    --log-opt max-file=3 \
    --name "$appName" \
    --restart unless-stopped \
    -e INCOMELEVEL="$incomeLevel" \
    -e DERIBIT_DOMAIN="$deribit_url" \
    -e KEY="$key" \
    -e SECRET="$secret" \
    -e HOST="$host" \
    -e PORT="$port" \
    -p "$port":"$port" \
    "$dockerImage"

  # Copy aws_dockerconfig.json to server
  echo "Copying the aws_dockerconfig.json file to server"
  temp="${dockerConfig%\'}"
  temp="${temp#\'}"
  echo "$temp" >~/aws_docker_config.json

  # Start WatchTower
  echo "Starting the WatchTower Container"
  sudo docker stop watchtower
  sudo docker rm watchtower
  sudo docker run -d \
    --name watchtower \
    -v ~/aws_docker_config.json:/config.json \
    -v /var/run/docker.sock:/var/run/docker.sock \
    containrrr/watchtower --debug
  #--interval 10 # 10 seconds default 5 minutes?

  # Remove all 'at' jobs
  echo "Removing all 'at' jobs"
  for i in $(atq | awk '{print $1}'); do atrm $i; done

  # Copy restart-docker-containers.sh to server
  echo "Copying restart-docker-containers.sh to server"
  temp="${restartBash%\'}"
  temp="${temp#\'}"
  echo "$temp" >~/restart-docker-containers.sh

  # Make sure its executable
  chmod +x ~/restart-docker-containers.sh

  #Start the restart script
  echo "Starting the restart script"
  ~/restart-docker-containers.sh
}

echo "Location to Launch?"
select location in "local" "aws"; do
  case "$location" in
  "local")
    echo "Launching Locally"
    getDockerScript "$incomeLevel" "$type" "$dockerImage" "$deribit_url" "$key" "$secret" "127.0.0.1" "$port" "$dockerConfig" "$restartBash"
    break
    ;;
  "aws")
    ssh -i ~/.ssh/aws_trading_app_keypair.pem ec2-user@"$ssh_ip" "$(typeset -f getDockerScript); getDockerScript $incomeLevel $type $dockerImage $deribit_url $key $secret $ssh_ip $port $dockerConfig $restartBash"
    break
    ;;
  *) echo invalid option ;;
  esac
done
