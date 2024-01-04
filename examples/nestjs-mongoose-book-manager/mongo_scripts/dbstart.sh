#!/bin/bash

docker-compose up -d

sleep 5

docker exec mongodb /mongo_scripts/rs-init.sh