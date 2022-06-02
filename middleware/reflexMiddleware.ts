import { Middleware } from 'https://deno.land/x/oak@v10.6.0/mod.ts';
import { resolveLocalPath } from '../path.ts';

import { appSourceMiddleware } from './appSourceMiddleware.ts';
import { serverSideRenderMiddleware } from './serverSideRenderMiddleware.tsx';
import { staticFileMiddleware } from './staticFileMiddleware.ts';
import { vendorSourceMiddleware } from './vendorSourceMiddleware.ts';

export type ReflexMiddlewareProps = {
  appSourcePrefix: string;
  vendorSourcePrefix: string;
  importMapPath?: string;
};

export const reflexMiddleware = async ({
  appSourcePrefix,
  vendorSourcePrefix,
  importMapPath = resolveLocalPath('./importMap.json'),
}: ReflexMiddlewareProps) => {
  const appSource = await appSourceMiddleware({
    appSourcePrefix,
    vendorSourcePrefix,
    importMapPath,
  });
  const serverSideRender = serverSideRenderMiddleware({
    vendorSourcePrefix,
  });
  const staticFile = staticFileMiddleware();
  const vendorSource = await vendorSourceMiddleware({
    appSourcePrefix,
    vendorSourcePrefix,
    importMapPath,
  });

  const middleware: Middleware = async (ctx, next) => {
    await vendorSource(ctx, async () => {
      await appSource(ctx, async () => {
        await staticFile(ctx, async () => {
          await serverSideRender(ctx, next);
        });
      });
    });
  };

  return middleware;
};
