import {
  default as wasmWeb,
  parseSync,
  printSync,
  transformSync,
} from 'https://esm.sh/@swc/wasm-web@1.2.189/wasm-web.js';
import { Visitor } from 'https://esm.sh/@swc/core@1.2.171/Visitor.js';

await wasmWeb('https://cdn.esm.sh/@swc/wasm-web@1.2.189/wasm-web_bg.wasm');

const parserOptions = {
  syntax: 'typescript',
  tsx: true,
  dynamicImport: true,
};
export const compileSource = async (
  source: string,
  visitor?: Visitor,
): Promise<string> => {
  const transformResult = await transformSync(source, {
    jsc: {
      parser: parserOptions,
      target: 'es2022',
    },
  });
  const ast = await parseSync(transformResult.code, parserOptions);
  if (visitor) {
    visitor.visitProgram(ast);
  }
  const { code } = printSync(ast, { minify: true });
  return code;
};
