import { Middleware } from 'https://deno.land/x/oak@v10.6.0/mod.ts';

import { appSourceMiddleware } from './appSourceMiddleware.ts';
import { serverSideRenderMiddleware } from './serverSideRenderMiddleware.tsx';
import { staticFileMiddleware } from './staticFileMiddleware.ts';
import { vendorSourceMiddleware } from './vendorSourceMiddleware.ts';

export type ReflexMiddlewareProps = {
  appSourcePrefix: string;
  vendorSourcePrefix: string;
};

export const reflexMiddleware = ({
  appSourcePrefix,
  vendorSourcePrefix,
}: ReflexMiddlewareProps) => {
  const appSource = appSourceMiddleware({ appSourcePrefix });
  const serverSideRender = serverSideRenderMiddleware({ vendorSourcePrefix });
  const staticFile = staticFileMiddleware();
  const vendorSource = vendorSourceMiddleware({ vendorSourcePrefix });

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
