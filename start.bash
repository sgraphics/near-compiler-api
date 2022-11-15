#!/usr/bin/env bash

docker run -p 8080:8080 --platform=linux/amd64 $(docker build -q .)