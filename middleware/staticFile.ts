import { Middleware } from 'https://deno.land/x/oak@v10.6.0/mod.ts';

export const staticFile = () => {
  const middleware: Middleware = async (ctx, next) => {
    const path = await ctx.send({
      root: `${Deno.cwd()}/public`,
    });
    if (path) {
      return;
    }
    await next();
  };

  return middleware;
};
