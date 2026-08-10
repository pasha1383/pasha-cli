'use strict';
const path = require('path');
const fs = require('fs-extra');
const { makeIncludeCheck } = require('./conditions');

const TEMPLATES_ROOT = path.join(__dirname, '../../../templates');
const LAYERS_ROOT = path.join(TEMPLATES_ROOT, 'layers');
const RECIPES_ROOT = path.join(TEMPLATES_ROOT, 'recipes');

function sanitizeLayerName(name) {
  if (typeof name !== 'string' || name.trim() === '') return null;
  return name.replace(/\.\./g, '').replace(/\/\//g, '/');
}

async function loadLayer(name) {
  const safeName = sanitizeLayerName(name);
  if (!safeName) return null;

  const dir = path.join(LAYERS_ROOT, safeName);
  const jsonPath = path.join(dir, 'layer.json');

  if (!(await fs.pathExists(jsonPath))) return null;

  const meta = await fs.readJson(jsonPath);
  const filesDir = path.join(dir, 'files');
  const filesExist = await fs.pathExists(filesDir);
  const moduleFilesDir = path.join(dir, 'moduleFiles');
  const moduleFilesExist = await fs.pathExists(moduleFilesDir);

  return {
    name: safeName,
    dir,
    meta,
    filesDir: filesExist ? filesDir : null,
    moduleFilesDir: moduleFilesExist ? moduleFilesDir : null,
  };
}

async function resolveRecipeLayers(recipeName) {
  const recipePath = path.join(RECIPES_ROOT, `${recipeName}.json`);
  if (!(await fs.pathExists(recipePath))) {
    throw new Error(`Recipe not found: "${recipeName}"`);
  }

  const recipe = await fs.readJson(recipePath);
  const layers = [];

  for (const layerName of recipe.layers) {
    const layer = await loadLayer(layerName);
    if (!layer) {
      throw new Error(`Layer not found: "${layerName}" (referenced by recipe "${recipeName}")`);
    }
    layers.push(layer);
  }

  return { recipe, layers };
}

function composeFileConditions(recipe, layers) {
  const merged = {};

  for (const layer of layers) {
    const fc = layer.meta.fileConditions || {};
    for (const [filePath, cond] of Object.entries(fc)) {
      if (filePath.startsWith('!')) {
        const realPath = filePath.slice(1);
        merged[realPath] = 'force-include:' + String(cond);
        continue;
      }
      merged[filePath] = cond;
    }
  }

  if (recipe.fileConditions) {
    for (const [filePath, cond] of Object.entries(recipe.fileConditions)) {
      if (filePath.startsWith('!')) {
        const realPath = filePath.slice(1);
        merged[realPath] = 'force-include:' + String(cond);
        continue;
      }
      merged[filePath] = cond;
    }
  }

  return merged;
}

function composePrerequisites(recipe, layers) {
  const set = new Set();
  for (const layer of layers) {
    const pre = layer.meta.prerequisites || [];
    for (const p of pre) set.add(p);
  }
  for (const p of recipe.prerequisites || []) set.add(p);
  return [...set];
}

function composePostInstall(recipe, layers) {
  const set = new Set();
  for (const layer of layers) {
    const pi = layer.meta.postInstall || [];
    for (const s of pi) set.add(s);
  }
  for (const s of recipe.postInstall || []) set.add(s);
  return [...set];
}

function composeStackFeatures(recipe, layers) {
  for (const layer of layers) {
    if (layer.meta.stackFeatures) return layer.meta.stackFeatures;
  }
  return null;
}

function composeModules(layers) {
  for (const layer of layers) {
    if (layer.meta.modules) return layer.meta.modules;
  }
  return null;
}

function composeDisplayName(recipe, layers) {
  if (recipe.label) return recipe.label;
  const parts = layers.map((l) => l.meta.label || l.name);
  return parts.join(' + ');
}

async function resolveRecipe(recipeName) {
  const { recipe, layers } = await resolveRecipeLayers(recipeName);

  return {
    recipe,
    layers,
    merged: {
      fileConditions: composeFileConditions(recipe, layers),
      prerequisites: composePrerequisites(recipe, layers),
      postInstall: composePostInstall(recipe, layers),
      stackFeatures: composeStackFeatures(recipe, layers),
      modules: composeModules(layers),
      displayName: composeDisplayName(recipe, layers),
      gitInit: recipe.gitInit !== undefined ? recipe.gitInit : layers.some((l) => l.meta.gitInit === true),
    },
  };
}

async function listRecipes() {
  const entries = await fs.readdir(RECIPES_ROOT);
  const recipeNames = [];
  for (const entry of entries) {
    if (entry.endsWith('.json')) {
      recipeNames.push(entry.replace(/\.json$/, ''));
    }
  }
  return recipeNames;
}

module.exports = {
  resolveRecipe,
  resolveRecipeLayers,
  loadLayer,
  composeFileConditions,
  composePrerequisites,
  composePostInstall,
  listRecipes,
  RECIPES_ROOT,
  LAYERS_ROOT,
};
