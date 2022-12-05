source setenv.sh

function runBackend() {
    sleep 10s
    node "${BACKEND_PATH}"
}

function runFrontend() {
    sleep 10s
    npm --prefix "${FRONTEND_PATH}" run start
}

"${MONGODB_PATH}" --dbpath="${DB_PATH}" && fg & runBackend & runFrontend & wait