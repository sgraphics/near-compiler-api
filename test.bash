#!/usr/bin/env bash

docker run --platform=linux/amd64 $(docker build -q .) npm run test