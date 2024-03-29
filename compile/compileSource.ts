import {
  parseSync,
  printSync,
  transformSync,
  Visitor,
  wasmWeb,
} from '../deps.ts';
import { debug } from '../log.ts';

await wasmWeb('https://cdn.esm.sh/@swc/wasm-web@1.2.189/wasm-web_bg.wasm');

const parserOptions = {
  syntax: 'typescript',
  tsx: true,
  dynamicImport: true,
};

export async function compileSource(
  source: string,
  visitor?: Visitor,
): Promise<string> {
  debug('compileSource');

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
}
