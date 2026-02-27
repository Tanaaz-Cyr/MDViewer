#!/bin/bash

# MDViewer Run Script
# This script runs the built MDViewer application

APP_PATH="build/bin/MDViewer.app"

echo "🚀 Starting MDViewer..."

# Check if the app exists
if [ ! -d "$APP_PATH" ]; then
    echo "❌ Error: MDViewer.app not found at $APP_PATH"
    echo ""
    echo "Please build the application first:"
    echo "  ./build.sh"
    echo ""
    echo "Or run in development mode:"
    echo "  wails dev"
    exit 1
fi

# Launch the application
echo "📂 Opening $APP_PATH"
open "$APP_PATH"

echo "✅ Application launched!"
