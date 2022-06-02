import { ElementType } from 'https://esm.sh/react@18.1.0';
import { Middleware } from 'https://deno.land/x/oak@v10.6.0/mod.ts';

import { appSourceMiddleware } from './appSourceMiddleware.ts';
import { resolveLocalPath } from '../path.ts';
import { serverSideRenderMiddleware } from './serverSideRenderMiddleware.tsx';
import { staticFileMiddleware } from './staticFileMiddleware.ts';
import { vendorSourceMiddleware } from './vendorSourceMiddleware.ts';

export type ReflexMiddlewareProps = {
  Document: ElementType;
  appSourcePrefix?: string;
  importMapPath?: string;
  vendorSourcePrefix?: string;
};

export const reflexMiddleware = async ({
  Document,
  appSourcePrefix = '/.x',
  importMapPath = resolveLocalPath('./importMap.json'),
  vendorSourcePrefix = '/.v',
}: ReflexMiddlewareProps) => {
  const appSource = await appSourceMiddleware({
    appSourcePrefix,
    vendorSourcePrefix,
    importMapPath,
  });

  const serverSideRender = serverSideRenderMiddleware({
    Document,
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
