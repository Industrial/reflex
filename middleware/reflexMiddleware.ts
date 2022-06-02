import { Middleware } from 'https://deno.land/x/oak@v10.6.0/mod.ts';

import { appSource } from './appSource.ts';
import { serverSideRender } from './serverSideRender.tsx';
import { staticFile } from './staticFile.ts';
import { vendorSource } from './vendorSource.ts';

export type ReflexMiddlewareProps = {
  appSourcePrefix: string;
  vendorSourcePrefix: string;
};

export const reflexMiddleware = ({
  appSourcePrefix,
  vendorSourcePrefix,
}: ReflexMiddlewareProps) => {
  const appSourceMiddleware = appSource({ appSourcePrefix });
  const serverSideRenderMiddleware = serverSideRender({ vendorSourcePrefix });
  const staticFileMiddleware = staticFile();
  const vendorSourceMiddleware = vendorSource({ vendorSourcePrefix });

  const middleware: Middleware = async (ctx, next) => {
    await vendorSourceMiddleware(ctx, async () => {
      await appSourceMiddleware(ctx, async () => {
        await staticFileMiddleware(ctx, async () => {
          await serverSideRenderMiddleware(ctx, next);
        });
      });
    });
  };

  return middleware;
};
