import { Middleware } from 'koa';
import { AppError } from '../errors/app-error';

export const errorHandler: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    if (err instanceof AppError) {
      ctx.status = err.statusCode;
      ctx.body = { error: err.message };
      return;
    }

    console.error(err);
    ctx.status = 500;
    ctx.body = { error: 'Internal server error' };
  }
};

export const notFoundHandler: Middleware = async (ctx) => {
  ctx.status = 404;
  ctx.body = { error: `Cannot ${ctx.method} ${ctx.originalUrl}` };
};
