'use strict';

class TemplateRenderError extends Error {
  constructor(message, { templatePath, line, column } = {}) {
    super(message);
    this.name = 'TemplateRenderError';
    this.templatePath = templatePath || null;
    this.line = line || null;
    this.column = column || null;
  }
}

module.exports = { TemplateRenderError };
