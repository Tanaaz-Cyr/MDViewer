#!/bin/bash

# MDViewer Build Script
# This script builds the MDViewer application for production

echo "🔨 Building MDViewer..."
echo ""

# Check if wails is installed
if ! command -v wails &> /dev/null
then
    echo "❌ Error: Wails CLI is not installed"
    echo "Please install it with: go install github.com/wailsapp/wails/v2/cmd/wails@latest"
    exit 1
fi

# Clean previous build (optional)
# echo "🧹 Cleaning previous build..."
# rm -rf build/bin

# Build the application
echo "📦 Building application..."
wails build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo "📍 Application location: build/bin/MDViewer.app"
    echo ""
    echo "To run the app, use: ./run.sh"
    echo "Or manually: open build/bin/MDViewer.app"
else
    echo ""
    echo "❌ Build failed!"
    exit 1
fi
