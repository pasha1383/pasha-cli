#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');

const program = new Command();

const BANNER = `
\u001b[36m██████╗  █████╗ ███████╗██╗  ██╗ █████╗ \u001b[0m
\u001b[36m██╔══██╗██╔══██╗██╔════╝██║  ██║██╔══██╗\u001b[0m
\u001b[36m██████╔╝███████║███████╗███████║███████║\u001b[0m
\u001b[36m██╔═══╝ ██╔══██║╚════██║██╔══██║██╔══██║\u001b[0m
\u001b[36m██║     ██║  ██║███████║██║  ██║██║  ██║\u001b[0m
\u001b[36m╚═╝     ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝\u001b[0m
        by Parsa Shadkam — v1.0.0
`;

program
  .name('pasha')
  .description('pasha CLI — ابزار شخصی پارسا شادکام')
  .version('1.0.0')
  .addHelpText('beforeAll', BANNER);

program
  .command('hello [name]')
  .description('سلام می‌کنه!')
  .option('-f, --fancy', 'خروجی رنگی‌تر')
  .action((name = 'World', opts) => {
    if (opts.fancy) {
      console.log('\x1b[35m✨ Hey ' + name + '! خوش اومدی به pasha CLI ✨\x1b[0m');
    } else {
      console.log('\x1b[32m👋 Hello, ' + name + '!\x1b[0m');
    }
  });

program
  .command('info')
  .description('اطلاعات کامل‌تر از CLI')
  .action(() => {
    console.log(BANNER);
    console.log('📦 Package : pasha');
    console.log('🔖 Version : 1.0.0');
    console.log('👤 Author  : Parsa Shadkam');
    console.log('🌐 Node    : ' + process.version);
    console.log('💻 OS      : ' + process.platform);
  });

program.parse();
