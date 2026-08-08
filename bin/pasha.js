#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const chalk = require('chalk');
const { create } = require('../lib/commands/create');
const { doctor } = require('../lib/commands/doctor');
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
  .description('Project scaffold generator — pick a stack, we build the rest')
  .version(pkg.version)
  .addHelpText('beforeAll', BANNER)
  .option('--resume', 'Resume from a previous session')
  .option('--doctor', 'Check system prerequisites')
  .action(async (opts) => {
    if (opts.doctor) {
      await doctor();
      return;
    }
    await create({ resume: opts.resume });
  });

program.parse();
