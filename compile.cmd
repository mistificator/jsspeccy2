call npm install coffee-script google-closure-compiler http-server --save-dev
nmake clean
nmake all
start npx http-server ./dist/ -p 62321
start "" "http://localhost:62321"