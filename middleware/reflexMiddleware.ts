import { Middleware } from 'https://deno.land/x/oak@v10.6.0/mod.ts';

import { appSourceMiddleware } from './appSourceMiddleware.ts';
import { resolveLocalPath } from '../path.ts';
import { serverSideRenderMiddleware } from './serverSideRenderMiddleware.tsx';
import { staticFileMiddleware } from './staticFileMiddleware.ts';
import { vendorSourceMiddleware } from './vendorSourceMiddleware.ts';
import { DocumentElement } from '../types.ts';

export type ReflexMiddlewareProps = {
  Document: DocumentElement;
  appDirPath?: string;
  appSourcePrefix?: string;
  cacheDirectoryPath?: string;
  importMapPath?: string;
  modifyStream?: (applicationStream: ReadableStream) => ReadableStream;
  vendorSourcePrefix?: string;
};

export const reflexMiddleware = async ({
  Document,
  appDirPath = resolveLocalPath('./app'),
  appSourcePrefix = '/.x',
  cacheDirectoryPath = './.cache',
  importMapPath = resolveLocalPath('./importMap.json'),
  modifyStream,
  vendorSourcePrefix = '/.v',
}: ReflexMiddlewareProps) => {
  const startTime = Date.now();

  const appSource = await appSourceMiddleware({
    appDirPath,
    appSourcePrefix,
    importMapPath,
    vendorSourcePrefix,
  });

  const serverSideRender = serverSideRenderMiddleware({
    Document,
    vendorSourcePrefix,
    modifyStream,
  });

  const staticFile = staticFileMiddleware();

  const vendorSource = await vendorSourceMiddleware({
    appSourcePrefix,
    cacheDirectoryPath,
    importMapPath,
    vendorSourcePrefix,
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

  const endTime = Date.now();
  const duration = endTime - startTime;
  console.log(`Reflex middleware loaded in ${duration}ms`);

  return middleware;
};
