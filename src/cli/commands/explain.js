'use strict';
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const log = require('../../utils/logger');
const { resolveRecipe, listRecipes } = require('../../core/engine/layers');

function indent(level) {
  return '  '.repeat(level);
}

function printLayer(layer, level) {
  const prefix = layer.filesDir
    ? chalk.green('+')
    : chalk.yellow('~');
  const kindLabel = layer.meta.kind
    ? chalk.dim(`[${layer.meta.kind}]`)
    : '';
  console.log(`${indent(level)}${prefix} ${chalk.bold(layer.meta.label || layer.name)} ${kindLabel}`);

  if (layer.meta.description) {
    console.log(`${indent(level + 1)}${chalk.dim(layer.meta.description)}`);
  }

  if (layer.filesDir) {
    console.log(`${indent(level + 1)}${chalk.dim('files/')} → ${chalk.dim(layer.filesDir)}`);
  }
  if (layer.moduleFilesDir) {
    console.log(`${indent(level + 1)}${chalk.dim('moduleFiles/')} → ${chalk.dim(layer.moduleFilesDir)}`);
  }
}

function printFileConditions(conditions, level) {
  if (!conditions || !Object.keys(conditions).length) {
    console.log(`${indent(level)}${chalk.dim('(no conditional files)')}`);
    return;
  }
  for (const [filePath, cond] of Object.entries(conditions)) {
    let displayCond = cond;
    if (typeof cond === 'string' && cond.startsWith('force-include:')) {
      displayCond = chalk.yellow('! ') + cond.slice('force-include:'.length);
    }
    console.log(`${indent(level)}${chalk.dim(filePath)}  ${chalk.cyan('↳')}  ${displayCond}`);
  }
}

async function explain(recipeName) {
  let resolved;

  try {
    resolved = await resolveRecipe(recipeName);
  } catch (err) {
    log.fail(err.message);
    console.log('');
    console.log(chalk.dim('Available recipes:'));
    const recipes = await listRecipes();
    for (const r of recipes) {
      console.log(`  ${chalk.cyan(r)}`);
    }
    process.exit(1);
  }

  console.log('');
  console.log(chalk.cyan('─'.repeat(65)));
  console.log(`  ${chalk.bold.white('Recipe')}  ${chalk.bold(resolved.merged.displayName)}`);
  console.log(`  ${chalk.dim('Name')}       ${chalk.dim(recipeName)}`);
  console.log(`  ${chalk.dim('Language')}   ${resolved.recipe.language}`);
  console.log(`  ${chalk.dim('Framework')}  ${resolved.recipe.framework}`);
  console.log(`  ${chalk.dim('Architecture')} ${resolved.recipe.architecture}`);
  console.log(chalk.cyan('─'.repeat(65)));

  console.log('');
  console.log(chalk.bold('Composition layers') + '  ' + chalk.dim('(resolved bottom-up — later layers override earlier ones)'));
  console.log('');

  for (let i = 0; i < resolved.layers.length; i++) {
    const layer = resolved.layers[i];
    const arrow = i === resolved.layers.length - 1 ? chalk.bold('└─') : chalk.bold('├─');
    console.log(`${chalk.dim(`[${i + 1}]`)} ${arrow} Layer: ${chalk.bold(layer.name)}`);
    printLayer(layer, 2);
  }

  console.log('');
  console.log(chalk.bold('Merged configuration'));
  console.log('');

  console.log(`${chalk.dim('Stack features')}   ${chalk.cyan(resolved.merged.stackFeatures || '(none)')}`);
  console.log(`${chalk.dim('Prerequisites')}   ${(resolved.merged.prerequisites || []).join(', ') || '(none)'}`);
  console.log(`${chalk.dim('Post-install')}    ${(resolved.merged.postInstall || []).join(', ') || '(none)'}`);
  console.log(`${chalk.dim('Git init')}        ${resolved.merged.gitInit ? chalk.green('yes') : chalk.dim('no')}`);

  if (resolved.merged.modules) {
    console.log(`${chalk.dim('Modules')}        ${chalk.green('enabled')}  (${resolved.merged.modules.message})`);
  } else {
    console.log(`${chalk.dim('Modules')}        ${chalk.dim('disabled')}`);
  }

  console.log('');
  console.log(chalk.bold('Resolved fileConditions') + '  ' + chalk.dim('(priority: recipe > top layer > … > base layer)'));
  console.log('');
  printFileConditions(resolved.merged.fileConditions, 1);

  console.log('');
}

module.exports = { explain };
