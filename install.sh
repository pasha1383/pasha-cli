#!/bin/bash

set -e

REPO="pasha1383/pasha"
BINARY_NAME="pasha"
INSTALL_DIR="/usr/local/bin"
TMP_DIR=$(mktemp -d)

echo "📦 Installing pasha CLI..."

if ! command -v node &> /dev/null; then
  echo "❌ Node.js پیدا نشد! اول Node.js نصب کن: https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ لازمه. نسخه فعلی: $(node -v)"
  exit 1
fi

echo "✅ Node.js $(node -v) پیدا شد"
echo "⬇️  در حال دانلود از GitHub..."

curl -fsSL "https://raw.githubusercontent.com/$REPO/main/bin/pasha.js" \
  -o "$TMP_DIR/pasha.js"

curl -fsSL "https://raw.githubusercontent.com/$REPO/main/package.json" \
  -o "$TMP_DIR/package.json"

cd "$TMP_DIR" && npm install --production --silent

sudo tee "$INSTALL_DIR/$BINARY_NAME" > /dev/null << WRAPPER
#!/bin/bash
NODE_PATH="$TMP_DIR/node_modules" node "$TMP_DIR/pasha.js" "\$@"
WRAPPER

sudo chmod +x "$INSTALL_DIR/$BINARY_NAME"

echo ""
echo "✅ pasha CLI نصب شد!"
echo "اجرا کن: pasha --help"
