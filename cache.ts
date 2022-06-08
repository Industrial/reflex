export async function ensureCacheDirectory(
  cacheDirectoryPath: string,
  appSourcePrefix: string,
  vendorSourcePrefix: string,
): Promise<void> {
  await Deno.mkdir(cacheDirectoryPath, { recursive: true });
  await Deno.mkdir(`${cacheDirectoryPath}${appSourcePrefix}`, {
    recursive: true,
  });
  await Deno.mkdir(`${cacheDirectoryPath}${vendorSourcePrefix}`, {
    recursive: true,
  });
}
