import { resolveLocalPath } from '../path.ts';

export type ImportMap = {
  imports: Record<string, string>;
};

let importMap: ImportMap;
export const getImportMap = async (): Promise<ImportMap> => {
  if (importMap) {
    return importMap;
  }
  const path = resolveLocalPath('./importMap.json');

  const decoder = new TextDecoder();
  const file = await Deno.readFile(path);

  importMap = JSON.parse(decoder.decode(file)) as ImportMap;

  return importMap;
};
