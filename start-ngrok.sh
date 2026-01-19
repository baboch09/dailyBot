#!/bin/bash
cd "$(dirname "$0")"
./bin/ngrok http 3000
