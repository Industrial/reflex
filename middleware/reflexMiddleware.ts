import { CacheMethod } from '../cache.ts';
import { composeMiddleware } from '../deps.ts';
import { appSourceMiddleware } from './appSourceMiddleware.ts';
import { resolveLocalPath } from '../path.ts';
import {
  DocumentElement,
  RenderFunction,
  serverSideRenderMiddleware,
} from './serverSideRenderMiddleware.tsx';
import { staticFileMiddleware } from './staticFileMiddleware.ts';
import { vendorSourceMiddleware } from './vendorSourceMiddleware.ts';
import { ensureImportMap, ensureResolvedImports } from '../importmap/mod.ts';
import { debug } from '../log.ts';

export type ReflexMiddlewareProps = {
  Document: DocumentElement;
  appSourcePrefix?: string;
  cacheDirectoryPath?: string;
  cacheMethod?: CacheMethod;
  render?: RenderFunction;
  sourceDirectoryPath?: string;
  vendorSourcePrefix?: string;
};

export const reflexMiddleware = ({
  Document,
  appSourcePrefix = '/.x',
  cacheDirectoryPath = '.cache',
  cacheMethod = 'memory',
  render,
  sourceDirectoryPath = resolveLocalPath('./app'),
  vendorSourcePrefix = '/.v',
}: ReflexMiddlewareProps) => {
  debug('reflexMiddleware');

  (async () => {
    try {
      await ensureImportMap();
      await ensureResolvedImports({
        cacheDirectoryPath,
        cacheMethod,
      });
    } catch (error) {
      console.error(error);
    }
  })();

  return composeMiddleware([
    vendorSourceMiddleware({
      appSourcePrefix,
      cacheDirectoryPath,
      cacheMethod,
      sourceDirectoryPath,
      vendorSourcePrefix,
    }),
    appSourceMiddleware({
      appSourcePrefix,
      cacheDirectoryPath,
      cacheMethod,
      sourceDirectoryPath,
      vendorSourcePrefix,
    }),
    staticFileMiddleware(),
    serverSideRenderMiddleware({
      Document,
      vendorSourcePrefix,
      render,
    }),
  ]);
};
