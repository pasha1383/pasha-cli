'use strict';
const { Command } = require('commander');
const pkg = require('../../package.json');
const { create } = require('./commands/create');
const { doctor } = require('./commands/doctor');
const log = require('../utils/logger');
const io = require('../ui/io');
const { error: errorScreen } = require('../ui/screens/error');

const program = new Command();

program
  .name('pasha')
  .description('Project scaffold generator — pick a stack, we build the rest')
  .version(pkg.version);

program
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
  .option('--project-name <name>', 'Project name')
  .option('--author <name>', 'Author full name')
  .option('--github <user>', 'GitHub username')
  .option('--description <desc>', 'Short project description')
  .option('--agent-docs', 'Enable AGENT.md generation')
  .option('--no-agent-docs', 'Disable AGENT.md generation')
  .option('--skip-install', 'Skip npm install / post-install steps')
  .option('--skip-git', 'Skip git init prompt')
  .option('--dry-run', 'Print file tree without writing')
  .option('-p, --preset <path>', 'Load answers from a preset JSON file')
  .option('--save-preset <path>', 'Save answers to a preset JSON file')
  .option('-r, --resume', 'Resume from a previous session')
  .option('--plain', 'Plain mode: no TUI, sequential prompts, no colours')
  .option('--no-animation', 'Disable animations')
  .action(async (opts) => {
    try {
      if (opts.plain) {
        io.setPlainMode(true);
        try { require('chalk').level = 0; } catch (_e) {}
      }
      await create(opts);
    } catch (err) {
      if (err.name === 'ExitPromptError') {
        console.log('\nCancelled.');
        process.exit(0);
      }
      errorScreen('Something went wrong', err);
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
  .command('add <what> [name]')
  .description('Add a module or feature to an existing project')
  .action(async (what, name) => {
    try {
      if (what === 'module') {
        const { add } = require('./commands/add');
        await add({ args: name ? [name] : [] });
      } else if (what === 'feature') {
        log.info("'pasha add feature' will be available in a future release.");
      } else {
        log.fail(`Unknown add target: "${what}". Use "module" or "feature".`);
      }
    } catch (err) {
      log.fail(err.message);
      process.exit(1);
    }
  });

program
  .command('explain <recipe>')
  .description('Show the resolved layer tree for a recipe')
  .action(async (recipe) => {
    const { explain } = require('./commands/explain');
    await explain(recipe);
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

program
  .command('update')
  .description('Check for and install the latest version of pasha')
  .option('--check', 'Only check whether an update is available, without installing it')
  .action(async (opts) => {
    try {
      const { update } = require('./commands/update');
      await update(opts);
    } catch (err) {
      log.fail(err.message);
      process.exit(1);
    }
  });

program
  .command('completion <shell>')
  .description('Print a shell completion script (bash, zsh, or fish)')
  .action(async (shell) => {
    try {
      const { completion } = require('./commands/completion');
      await completion(shell);
    } catch (err) {
      log.fail(err.message);
      process.exit(1);
    }
  });

module.exports = { program };
