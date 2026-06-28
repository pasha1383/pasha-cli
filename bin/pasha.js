#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const chalk = require('chalk');
const { create } = require('../lib/commands/create');

const pkg = require('../package.json');

const BANNER = `
\u001b[36m██████╗  █████╗ ███████╗██╗  ██╗ █████╗ \u001b[0m
\u001b[36m██╔══██╗██╔══██╗██╔════╝██║  ██║██╔══██╗\u001b[0m
\u001b[36m██████╔╝███████║███████╗███████║███████║\u001b[0m
\u001b[36m██╔═══╝ ██╔══██║╚════██║██╔══██║██╔══██║\u001b[0m
\u001b[36m██║     ██║  ██║███████║██║  ██║██║  ██║\u001b[0m
\u001b[36m╚═╝     ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝\u001b[0m
        by Parsa Shadkam — v${pkg.version}
`;

const program = new Command();

program
  .name('pasha')
  .description('pasha — ابزار ساخت CLI شخصی')
  .version(pkg.version)
  .addHelpText('beforeAll', BANNER);

program
  .command('create')
  .description('یه CLI شخصی جدید بساز')
  .action(async () => { await create(); });

program
  .command('hello [name]')
  .description('سلام می‌کنه!')
  .option('-f, --fancy', 'خروجی رنگی‌تر')
  .action((name = 'World', opts) => {
    if (opts.fancy) console.log(chalk.magenta('✨ Hey ' + name + '! خوش اومدی به pasha CLI ✨'));
    else console.log(chalk.green('👋 Hello, ' + name + '!'));
  });

program
  .command('info')
  .description('اطلاعات کامل CLI')
  .action(() => {
    console.log(BANNER);
    console.log(chalk.bold('📦 Package : ') + chalk.cyan('@pasha1383/pasha'));
    console.log(chalk.bold('🔖 Version : ') + chalk.cyan(pkg.version));
    console.log(chalk.bold('👤 Author  : ') + chalk.cyan('Parsa Shadkam'));
    console.log(chalk.bold('🌐 Node    : ') + chalk.cyan(process.version));
    console.log(chalk.bold('💻 OS      : ') + chalk.cyan(process.platform));
  });

program.parse();
