'use strict';
const { Command } = require('commander');
const pkg = require('../../package.json');
const { create } = require('./commands/create');
const { doctor } = require('./commands/doctor');
const log = require('../utils/logger');

const program = new Command();

program
  .name('pasha')
  .description('Project scaffold generator — pick a stack, we build the rest')
  .version(pkg.version);

program
  .command('create', { isDefault: true })
  .description('Scaffold a new project')
  .option('-r, --resume', 'Resume from a previous session')
  .option('-p, --preset <path>', 'Load answers from a preset JSON file')
  .option('--save-preset <path>', 'Save answers to a preset JSON file')
  .option('-y, --yes', 'Use defaults for all prompts (non-interactive)')
  .option('-l, --language <lang>', 'Target language')
  .option('-f, --framework <fw>', 'Target framework')
  .option('-a, --architecture <arch>', 'Target architecture')
  .option('--orm <orm>', 'ORM selection')
  .option('--database <db>', 'Database selection')
  .option('--validation <val>', 'Validation selection')
  .option('--broker <broker>', 'Message broker')
  .option('--redis', 'Enable Redis')
  .option('--no-redis', 'Disable Redis')
  .option('--extras <list>', 'Comma-separated extras')
  .option('--modules <list>', 'Comma-separated module names')
  .option('--dry-run', 'Print file tree without writing')
  .action(async (opts) => {
    try {
      await create(opts);
    } catch (err) {
      if (err.name === 'ExitPromptError') {
        console.log('\nCancelled.');
        process.exit(0);
      }
      log.fail(err.message);
      process.exit(err.exitCode || 1);
    }
  });

program
  .command('doctor')
  .description('Check and install system prerequisites')
  .action(async () => {
    try { await doctor(); }
    catch (err) { log.fail(err.message); process.exit(1); }
  });

program
  .command('add <what>')
  .description('Add a module or feature to an existing project')
  .action(async (what) => {
    log.info(`'pasha add' will be available in a future release.`);
  });

program
  .command('list')
  .description('List available languages, frameworks, and architectures')
  .action(async () => {
    const { loadManifest, getLanguages, getFrameworks, getArchitectures } = require('../core/catalog/manifest');
    const m = await loadManifest();
    for (const l of getLanguages(m)) {
      log.info(l.name);
      for (const f of getFrameworks(m, l.value)) {
        console.log(`  ${f.name}`);
        for (const a of getArchitectures(m, l.value, f.value)) {
          console.log(`    · ${a.name}`);
        }
      }
    }
  });

module.exports = { program };
