'use strict';

const nodejsTemplate = ({ name, author, github, description, lang }) => {
  const messages = {
    fa: {
      hello: `سلام`,
      notFound: `دستور شناخته نشده`,
    },
    en: {
      hello: `Hello`,
      notFound: `Unknown command`,
    },
  }[lang];

  return {
    'bin/index.js': `#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');

const program = new Command();

program
  .name('${name}')
  .description('${description}')
  .version('1.0.0');

program
  .command('hello [name]')
  .description('${messages.hello}!')
  .option('-f, --fancy', '${lang === 'fa' ? 'خروجی رنگی' : 'Colorful output'}')
  .action((target = '${lang === 'fa' ? 'دوست' : 'World'}', opts) => {
    const msg = \`${messages.hello}, \${target}!\`;
    console.log(opts.fancy ? chalk.magenta('✨ ' + msg + ' ✨') : chalk.green(msg));
  });

program.parse();
`,

    'package.json': JSON.stringify({
      name: `@${github}/${name}`,
      version: '1.0.0',
      description,
      main: 'bin/index.js',
      bin: { [name]: './bin/index.js' },
      author,
      license: 'MIT',
      keywords: ['cli', name],
      repository: { type: 'git', url: `https://github.com/${github}/${name}.git` },
      dependencies: { commander: '^12.0.0', chalk: '^4.1.2' },
      engines: { node: '>=18.0.0' },
    }, null, 2),

    'README.md': lang === 'fa'
      ? `# ${name} CLI\n\n${description}\n\n## نصب\n\n\`\`\`bash\nnpm install -g @${github}/${name}\n\`\`\`\n\n## دستورات\n\n\`\`\`bash\n${name} hello\n${name} --help\n\`\`\`\n\n---\nساخته شده با ❤️ توسط ${author}\n`
      : `# ${name} CLI\n\n${description}\n\n## Install\n\n\`\`\`bash\nnpm install -g @${github}/${name}\n\`\`\`\n\n## Commands\n\n\`\`\`bash\n${name} hello\n${name} --help\n\`\`\`\n\n---\nMade with ❤️ by ${author}\n`,

    '.github/workflows/publish.yml': `name: Publish to npm

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'
      - run: npm install
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
`,

    'install.sh': `#!/bin/bash
set -e
REPO="${github}/${name}"
INSTALL_DIR="/usr/local/bin"
TMP_DIR=$(mktemp -d)

echo "📦 Installing ${name}..."

if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found! Install from: https://nodejs.org"
  exit 1
fi

curl -fsSL "https://raw.githubusercontent.com/$REPO/main/bin/index.js" -o "$TMP_DIR/index.js"
curl -fsSL "https://raw.githubusercontent.com/$REPO/main/package.json" -o "$TMP_DIR/package.json"
cd "$TMP_DIR" && npm install --production --silent

sudo tee "$INSTALL_DIR/${name}" > /dev/null << WRAPPER
#!/bin/bash
NODE_PATH="$TMP_DIR/node_modules" node "$TMP_DIR/index.js" "\\$@"
WRAPPER

sudo chmod +x "$INSTALL_DIR/${name}"
echo "✅ ${name} installed! Run: ${name} --help"
`,
  };
};

const pythonTemplate = ({ name, author, github, description, lang }) => ({
  'main.py': `#!/usr/bin/env python3
import click

@click.group()
@click.version_option("1.0.0")
def cli():
    """${description}"""
    pass

@cli.command()
@click.argument("name", default="${lang === 'fa' ? 'دوست' : 'World'}")
@click.option("--fancy", is_flag=True)
def hello(name, fancy):
    """${lang === 'fa' ? 'سلام می‌کنه' : 'Say hello'}"""
    msg = f"${lang === 'fa' ? 'سلام' : 'Hello'}, {name}!"
    if fancy:
        click.echo(click.style("✨ " + msg + " ✨", fg="magenta"))
    else:
        click.echo(click.style(msg, fg="green"))

if __name__ == "__main__":
    cli()
`,

  'requirements.txt': 'click>=8.0.0\n',

  'setup.py': `from setuptools import setup

setup(
    name="${name}",
    version="1.0.0",
    author="${author}",
    description="${description}",
    py_modules=["main"],
    install_requires=["click"],
    entry_points={"console_scripts": ["${name}=main:cli"]},
)
`,

  'README.md': lang === 'fa'
    ? `# ${name} CLI\n\n${description}\n\n## نصب\n\n\`\`\`bash\npip install -e .\n\`\`\`\n\n## دستورات\n\n\`\`\`bash\n${name} hello\n${name} --help\n\`\`\`\n`
    : `# ${name} CLI\n\n${description}\n\n## Install\n\n\`\`\`bash\npip install -e .\n\`\`\`\n\n## Commands\n\n\`\`\`bash\n${name} hello\n${name} --help\n\`\`\`\n`,
});

const shellTemplate = ({ name, author, github, description, lang }) => ({
  [`${name}.sh`]: `#!/bin/bash

VERSION="1.0.0"

${lang === 'fa' ? '# راهنما' : '# Help'}
show_help() {
  echo "Usage: ${name} <command> [options]"
  echo ""
  echo "Commands:"
  echo "  hello [name]   ${lang === 'fa' ? 'سلام می‌کنه' : 'Say hello'}"
  echo "  version        ${lang === 'fa' ? 'نسخه رو نشون می‌ده' : 'Show version'}"
  echo "  help           ${lang === 'fa' ? 'این راهنما' : 'Show this help'}"
}

cmd_hello() {
  local name="\${1:-${lang === 'fa' ? 'دوست' : 'World'}}"
  echo "${lang === 'fa' ? 'سلام' : 'Hello'}, $name!"
}

case "$1" in
  hello)   cmd_hello "$2" ;;
  version) echo "${name} v$VERSION" ;;
  help|"") show_help ;;
  *)       echo "${lang === 'fa' ? 'خطا' : 'Error'}: unknown command '$1'"; exit 1 ;;
esac
`,

  'install.sh': `#!/bin/bash
set -e
REPO="${github}/${name}"
INSTALL_DIR="\$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"

echo "📦 Installing ${name}..."
curl -fsSL "https://raw.githubusercontent.com/$REPO/main/${name}.sh" -o "$INSTALL_DIR/${name}"
chmod +x "$INSTALL_DIR/${name}"

if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
  echo "⚠️  Run: source ~/.bashrc"
fi

echo "✅ ${name} installed! Run: ${name} --help"
`,

  'README.md': lang === 'fa'
    ? `# ${name}\n\n${description}\n\n## نصب\n\n\`\`\`bash\ncurl -fsSL https://raw.githubusercontent.com/${github}/${name}/main/install.sh | bash\n\`\`\`\n\n## دستورات\n\n\`\`\`bash\n${name} hello\n${name} help\n\`\`\`\n`
    : `# ${name}\n\n${description}\n\n## Install\n\n\`\`\`bash\ncurl -fsSL https://raw.githubusercontent.com/${github}/${name}/main/install.sh | bash\n\`\`\`\n\n## Commands\n\n\`\`\`bash\n${name} hello\n${name} help\n\`\`\`\n`,
});

module.exports = { nodejsTemplate, pythonTemplate, shellTemplate };
