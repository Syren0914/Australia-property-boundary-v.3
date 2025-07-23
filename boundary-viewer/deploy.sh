#!/bin/bash

# Build the project
npm run build

# Create a simple server for the dist folder
cd dist

# Create a simple Python server (if Python is available)
if command -v python3 &> /dev/null; then
    echo "Starting Python server on http://localhost:8000"
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "Starting Python server on http://localhost:8000"
    python -m http.server 8000
else
    echo "Python not found. Please install Python or use a different server."
    echo "You can also open the dist/index.html file directly in your browser."
fi 