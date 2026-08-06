#!/bin/bash
set -e

REPO_URL="https://github.com/pasha1383/pasha-cli.git"
INSTALL_ROOT="$HOME/.pasha-cli"
BIN_LINK="/usr/local/bin/pasha"

echo "📦 Installing pasha CLI..."

OS_NAME=$(uname -s)
if [ "$OS_NAME" != "Linux" ] && [ "$OS_NAME" != "Darwin" ]; then
  echo "❌ pasha currently only supports Linux and macOS."
  exit 1
fi

if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found! Install Node.js 18+ first: https://nodejs.org"
  exit 1
fi

NODE_MAJOR=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "❌ Node.js 18+ is required. Current version: $(node -v)"
  exit 1
fi

if ! command -v git &> /dev/null; then
  echo "❌ git not found! Install git first."
  exit 1
fi

echo "✅ Found Node.js $(node -v) and git"
echo "⬇️  Downloading pasha-cli..."

rm -rf "$INSTALL_ROOT"
git clone --depth 1 "$REPO_URL" "$INSTALL_ROOT" --quiet

echo "📦 Installing dependencies..."
cd "$INSTALL_ROOT" && npm install --production --silent

chmod +x "$INSTALL_ROOT/bin/pasha.js"
sudo ln -sf "$INSTALL_ROOT/bin/pasha.js" "$BIN_LINK"

echo ""
echo "✅ pasha CLI installed!"
echo "Run: pasha --help"
