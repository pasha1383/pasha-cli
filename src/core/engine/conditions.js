'use strict';

const AND = '&&';
const OR = '||';
const ALWAYS_TRUE = '!always';

function parseCondition(expr) {
  if (typeof expr !== 'string') {
    throw new Error(`Condition must be a string, got ${typeof expr}`);
  }

  const trimmed = expr.trim();

  if (trimmed === 'true') return () => true;
  if (trimmed === 'false') return () => false;
  if (trimmed === ALWAYS_TRUE) return () => true;

  if (trimmed.includes(AND)) {
    const parts = trimmed.split(AND).map((s) => s.trim());
    if (parts.some((p) => p === '')) {
      throw new SyntaxError(`Empty condition in "${trimmed}"`);
    }
    const fns = parts.map(parseCondition);
    return (ctx) => fns.every((fn) => fn(ctx));
  }

  if (trimmed.includes(OR)) {
    const parts = trimmed.split(OR).map((s) => s.trim());
    if (parts.some((p) => p === '')) {
      throw new SyntaxError(`Empty condition in "${trimmed}"`);
    }
    const fns = parts.map(parseCondition);
    return (ctx) => fns.some((fn) => fn(ctx));
  }

  if (trimmed.startsWith('!')) {
    const inner = trimmed.slice(1).trim();
    if (inner === '') {
      throw new SyntaxError(`Empty negation in "${trimmed}"`);
    }
    const fn = parseCondition(inner);
    return (ctx) => !fn(ctx);
  }

  const token = trimmed;

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token)) {
    throw new SyntaxError(
      `"${token}" is not a valid condition token. ` +
      `Tokens must be flag names (letters, digits, underscores) or boolean literals (true/false).`
    );
  }

  return (ctx) => Boolean(ctx[token]);
}

function makeIncludeCheck(conditions = {}, ctx = {}) {
  const entries = Object.entries(conditions);
  return function shouldInclude(relPath) {
    for (const [prefix, cond] of entries) {
      const normalized = prefix.replace(/\/+$/, '');
      if (relPath === normalized || relPath.startsWith(normalized + '/')) {
        if (typeof cond === 'boolean') return cond;
        if (typeof cond === 'string') {
          const fn = parseCondition(cond);
          if (!fn(ctx)) return false;
        } else {
          throw new Error(
            `fileConditions value for "${prefix}" must be a string or boolean, got ${typeof cond}`
          );
        }
      }
    }
    return true;
  };
}

module.exports = { makeIncludeCheck, parseCondition };
