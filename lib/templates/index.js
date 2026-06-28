'use strict';

const nodejsTemplate = ({ name, author, github, description, lang, color }) => {
  const colors = { cyan: '36', green: '32', magenta: '35', yellow: '33' };
  const colorCode = colors[color] || '36';
  const greet = lang === 'fa' ? 'سلام' : 'Hello';
  const stranger = lang === 'fa' ? 'دوست' : 'World';

  return {
    'bin/index.js': `#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const chalk = require('chalk');
const pkg = require('../package.json');

const COLOR = chalk['${color}'] || chalk.cyan;

const BANNER = \`
\${COLOR('${name.toUpperCase()} CLI')}
\${chalk.gray('v' + pkg.version + ' — by ${author}')}
\`;

const program = new Command();

program
  .name('${name}')
  .description('${description}')
  .version(pkg.version)
  .addHelpText('beforeAll', BANNER);

// hello
program
  .command('hello [name]')
  .description('${lang === 'fa' ? 'سلام می‌کنه' : 'Say hello'}')
  .option('-f, --fancy', '${lang === 'fa' ? 'خروجی رنگی' : 'Colorful output'}')
  .action((target = '${stranger}', opts) => {
    const msg = \`${greet}, \${target}!\`;
    console.log(opts.fancy ? COLOR('✨ ' + msg + ' ✨') : chalk.green(msg));
  });

// info
program
  .command('info')
  .description('${lang === 'fa' ? 'اطلاعات CLI' : 'Show CLI info'}')
  .action(() => {
    console.log(BANNER);
    console.log(chalk.bold('📦 Package : ') + COLOR('${name}'));
    console.log(chalk.bold('🔖 Version : ') + COLOR(pkg.version));
    console.log(chalk.bold('👤 Author  : ') + COLOR('${author}'));
    console.log(chalk.bold('🌐 Node    : ') + COLOR(process.version));
    console.log(chalk.bold('💻 OS      : ') + COLOR(process.platform));
  });

// config
const fs = require('fs');
const os = require('os');
const CONFIG_PATH = require('path').join(os.homedir(), '.${name}rc');

const readConfig = () => {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch { return {}; }
};

const writeConfig = (data) => {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
};

program
  .command('config')
  .description('${lang === 'fa' ? 'تنظیمات' : 'Manage config'}')
  .argument('<action>', 'set | get | list')
  .argument('[key]', '${lang === 'fa' ? 'کلید' : 'key'}')
  .argument('[value]', '${lang === 'fa' ? 'مقدار' : 'value'}')
  .action((action, key, value) => {
    const cfg = readConfig();
    if (action === 'set' && key && value) {
      cfg[key] = value;
      writeConfig(cfg);
      console.log(COLOR(\`✅ \${key} = \${value}\`));
    } else if (action === 'get' && key) {
      console.log(cfg[key] ?? chalk.gray('${lang === 'fa' ? 'یافت نشد' : 'not found'}'));
    } else if (action === 'list') {
      const entries = Object.entries(cfg);
      if (!entries.length) { console.log(chalk.gray('${lang === 'fa' ? 'خالیه' : 'empty'}')); return; }
      entries.forEach(([k, v]) => console.log(COLOR(k) + ' = ' + v));
    }
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
      ? `# ${name} CLI\n\n${description}\n\n## نصب\n\`\`\`bash\nnpm install -g @${github}/${name}\n\`\`\`\n\n## دستورات\n\`\`\`bash\n${name} hello\n${name} hello پارسا --fancy\n${name} info\n${name} config set key value\n${name} config get key\n${name} config list\n${name} --version\n\`\`\`\n\n---\nساخته شده با ❤️ توسط ${author}\n`
      : `# ${name} CLI\n\n${description}\n\n## Install\n\`\`\`bash\nnpm install -g @${github}/${name}\n\`\`\`\n\n## Commands\n\`\`\`bash\n${name} hello\n${name} hello John --fancy\n${name} info\n${name} config set key value\n${name} config get key\n${name} config list\n${name} --version\n\`\`\`\n\n---\nMade with ❤️ by ${author}\n`,

    '.github/workflows/publish.yml': `name: Publish to npm\n\non:\n  push:\n    tags:\n      - 'v*'\n\njobs:\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '22'\n          registry-url: 'https://registry.npmjs.org'\n      - run: npm install\n      - run: npm publish --access public\n        env:\n          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}\n`,

    'install.sh': `#!/bin/bash\nset -e\nREPO="${github}/${name}"\nINSTALL_DIR="/usr/local/bin"\nTMP_DIR=$(mktemp -d)\necho "📦 Installing ${name}..."\nif ! command -v node &> /dev/null; then echo "❌ Node.js not found!"; exit 1; fi\ncurl -fsSL "https://raw.githubusercontent.com/$REPO/main/bin/index.js" -o "$TMP_DIR/index.js"\ncurl -fsSL "https://raw.githubusercontent.com/$REPO/main/package.json" -o "$TMP_DIR/package.json"\ncd "$TMP_DIR" && npm install --production --silent\nsudo tee "$INSTALL_DIR/${name}" > /dev/null << WRAPPER\n#!/bin/bash\nNODE_PATH="$TMP_DIR/node_modules" node "$TMP_DIR/index.js" "\\$@"\nWRAPPER\nsudo chmod +x "$INSTALL_DIR/${name}"\necho "✅ ${name} installed! Run: ${name} --help"\n`,
  };
};

const pythonTemplate = ({ name, author, github, description, lang }) => ({
  'main.py': `#!/usr/bin/env python3\nimport click\nimport json\nimport os\n\nCONFIG_PATH = os.path.expanduser('~/.${name}rc')\n\ndef read_config():\n    try:\n        with open(CONFIG_PATH) as f: return json.load(f)\n    except: return {}\n\ndef write_config(data):\n    with open(CONFIG_PATH, 'w') as f: json.dump(data, f, indent=2)\n\n@click.group()\n@click.version_option('1.0.0')\ndef cli():\n    """${description}"""\n    pass\n\n@cli.command()\n@click.argument('name', default='${lang === 'fa' ? 'دوست' : 'World'}')\n@click.option('--fancy', is_flag=True)\ndef hello(name, fancy):\n    """${lang === 'fa' ? 'سلام می‌کنه' : 'Say hello'}"""\n    msg = f'${lang === 'fa' ? 'سلام' : 'Hello'}, {name}!'\n    click.echo(click.style('✨ ' + msg + ' ✨', fg='magenta') if fancy else click.style(msg, fg='green'))\n\n@cli.group()\ndef config():\n    """${lang === 'fa' ? 'تنظیمات' : 'Manage config'}"""\n    pass\n\n@config.command('set')\n@click.argument('key')\n@click.argument('value')\ndef config_set(key, value):\n    cfg = read_config(); cfg[key] = value; write_config(cfg)\n    click.echo(f'✅ {key} = {value}')\n\n@config.command('get')\n@click.argument('key')\ndef config_get(key):\n    click.echo(read_config().get(key, '${lang === 'fa' ? 'یافت نشد' : 'not found'}'))\n\n@config.command('list')\ndef config_list():\n    cfg = read_config()\n    if not cfg: click.echo('${lang === 'fa' ? 'خالیه' : 'empty'}'); return\n    for k, v in cfg.items(): click.echo(f'{k} = {v}')\n\nif __name__ == '__main__': cli()\n`,
  'requirements.txt': 'click>=8.0.0\n',
  'setup.py': `from setuptools import setup\nsetup(name='${name}',version='1.0.0',author='${author}',description='${description}',py_modules=['main'],install_requires=['click'],entry_points={'console_scripts':['${name}=main:cli']})\n`,
  'README.md': lang === 'fa'
    ? `# ${name}\n\n${description}\n\n## نصب\n\`\`\`bash\npip install -e .\n\`\`\`\n\n## دستورات\n\`\`\`bash\n${name} hello\n${name} config set key val\n${name} config list\n\`\`\`\n`
    : `# ${name}\n\n${description}\n\n## Install\n\`\`\`bash\npip install -e .\n\`\`\`\n\n## Commands\n\`\`\`bash\n${name} hello\n${name} config set key val\n${name} config list\n\`\`\`\n`,
});

const shellTemplate = ({ name, author, github, description, lang }) => ({
  [`${name}.sh`]: `#!/bin/bash\nVERSION="1.0.0"\nCONFIG_FILE="$HOME/.${name}rc"\n\nshow_help() {\n  echo "Usage: ${name} <command>"\n  echo "Commands:"\n  echo "  hello [name]         ${lang === 'fa' ? 'سلام می‌کنه' : 'Say hello'}"\n  echo "  info                 ${lang === 'fa' ? 'اطلاعات' : 'Show info'}"\n  echo "  config set key val   ${lang === 'fa' ? 'تنظیم کنه' : 'Set config'}"\n  echo "  config get key       ${lang === 'fa' ? 'بخونه' : 'Get config'}"\n  echo "  version              ${lang === 'fa' ? 'نسخه' : 'Version'}"\n}\n\ncmd_hello() { echo "${lang === 'fa' ? 'سلام' : 'Hello'}, \${1:-${lang === 'fa' ? 'دوست' : 'World'}}!"; }\ncmd_info() { echo "${name} v$VERSION — ${author}"; echo "OS: $(uname -s)"; }\ncmd_config_set() { echo "\$2=\$3" >> "$CONFIG_FILE"; echo "✅ \$2 = \$3"; }\ncmd_config_get() { grep "^\$2=" "$CONFIG_FILE" 2>/dev/null | cut -d= -f2 || echo "${lang === 'fa' ? 'یافت نشد' : 'not found'}"; }\n\ncase "\$1" in\n  hello)   cmd_hello "\$2" ;;\n  info)    cmd_info ;;\n  config)  case "\$2" in set) cmd_config_set "\$@";; get) cmd_config_get "\$@";; *) echo "config set|get";; esac ;;\n  version) echo "${name} v$VERSION" ;;\n  help|"") show_help ;;\n  *)       echo "Unknown: \$1"; exit 1 ;;\nesac\n`,
  'install.sh': `#!/bin/bash\nset -e\nINSTALL_DIR="$HOME/.local/bin"\nmkdir -p "$INSTALL_DIR"\ncurl -fsSL "https://raw.githubusercontent.com/${github}/${name}/main/${name}.sh" -o "$INSTALL_DIR/${name}"\nchmod +x "$INSTALL_DIR/${name}"\necho "✅ ${name} installed!"\n`,
  'README.md': lang === 'fa'
    ? `# ${name}\n\n${description}\n\n## نصب\n\`\`\`bash\ncurl -fsSL https://raw.githubusercontent.com/${github}/${name}/main/install.sh | bash\n\`\`\`\n`
    : `# ${name}\n\n${description}\n\n## Install\n\`\`\`bash\ncurl -fsSL https://raw.githubusercontent.com/${github}/${name}/main/install.sh | bash\n\`\`\`\n`,
});

module.exports = { nodejsTemplate, pythonTemplate, shellTemplate };
