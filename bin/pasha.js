#!/usr/bin/env node

'use strict';

const { Command } = require('commander');
const chalk = require('chalk');
const { create } = require('../lib/commands/create');

const program = new Command();

const BANNER = `
\u001b[36m██████╗  █████╗ ███████╗██╗  ██╗ █████╗ \u001b[0m
\u001b[36m██╔══██╗██╔══██╗██╔════╝██║  ██║██╔══██╗\u001b[0m
\u001b[36m██████╔╝███████║███████╗███████║███████║\u001b[0m
\u001b[36m██╔═══╝ ██╔══██║╚════██║██╔══██║██╔══██║\u001b[0m
\u001b[36m██║     ██║  ██║███████║██║  ██║██║  ██║\u001b[0m
\u001b[36m╚═╝     ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝\u001b[0m
        by Parsa Shadkam — v1.1.0
`;

program
  .name('pasha')
  .description('pasha CLI — ابزار ساخت CLI شخصی')
  .version('1.1.0')
  .addHelpText('beforeAll', BANNER);

program
  .command('create')
  .description('یه CLI شخصی جدید بساز')
  .action(async () => {
    await create();
  });

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
  .description('اطلاعات کامل CLI')
  .action(() => {
    console.log(BANNER);
    console.log('📦 Package : @pasha1383/pasha');
    console.log('🔖 Version : 1.1.0');
    console.log('👤 Author  : Parsa Shadkam');
    console.log('🌐 Node    : ' + process.version);
    console.log('💻 OS      : ' + process.platform);
  });

program.parse();
