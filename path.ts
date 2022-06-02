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
