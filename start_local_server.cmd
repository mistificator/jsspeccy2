@echo off
echo Start server
taskkill /fi "windowtitle eq http-server"
start npx http-server ./dist/ -p 6321 -o ?debug_print=on -c-1 -S -C 127.0.0.1.cert -K 127.0.0.1.key