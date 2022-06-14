import { resolve } from './deps.ts';

export const externalToInternalURL = (
  externalURL: string,
  vendorSourcePrefix: string,
): string => {
  const url = new URL(externalURL);
  return `${vendorSourcePrefix}/${url.hostname}${url.pathname}`;
};

export const internalToExternalURL = (
  internalURL: string,
  vendorSourcePrefix: string,
): string => {
  const url = new URL(internalURL);
  const pathname = url.pathname.replace(`${vendorSourcePrefix}/`, '');
  return `https://${pathname}`;
};

export const isPathAnURL = (path: string): boolean => {
  try {
    new URL(path);
    return true;
  } catch (_error: unknown) {
    return false;
  }
};

export const fetchSourceFromPath = async (path: string) => {
  if (isPathAnURL(path)) {
    return await (await fetch(path)).text();
  } else {
    return await Deno.readTextFile(path);
  }
};

export const resolveLocalPath = (path: string) => {
  if (path.startsWith('.')) {
    return resolve(`${Deno.cwd()}/${path}`);
  } else {
    return resolve(path);
  }
};

// Takes a path and returns a URL or locally resolved path starting with file://.
export function resolvePathToURL(path: string): string {
  let resolvedPath: string;
  const isURL = isPathAnURL(path);

  if (isURL) {
    resolvedPath = path;
  } else {
    resolvedPath = `file://${resolveLocalPath(path)}`;
  }

  return resolvedPath;
}
