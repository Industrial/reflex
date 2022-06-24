import type {
  ExportAllDeclaration,
  ExportNamedDeclaration,
  ImportDeclaration,
  StringLiteral,
} from '../deps.ts';
import { dirname, resolve, Visitor } from '../deps.ts';
import { debug } from '../log.ts';

export type ImportVisitorProps = {
  filePath: string;
  sourceDirectoryPath?: string;
  appSourcePrefix: string;
  vendorSourcePrefix: string;
  parsedImports: Record<string, string>;
  resolvedImports: Record<string, string>;
};

export class ImportVisitor extends Visitor {
  filePath: string;
  sourceDirectoryPath?: string;
  appSourcePrefix: string;
  vendorSourcePrefix: string;

  parsedImports: Record<string, string>;
  resolvedImports: Record<string, string>;

  constructor({
    filePath,
    sourceDirectoryPath,
    appSourcePrefix,
    vendorSourcePrefix,
    parsedImports,
    resolvedImports,
  }: ImportVisitorProps) {
    debug('ImportVisitor#constructor');

    super();
    this.filePath = filePath;
    this.sourceDirectoryPath = sourceDirectoryPath;
    this.appSourcePrefix = appSourcePrefix;
    this.vendorSourcePrefix = vendorSourcePrefix;
    this.parsedImports = parsedImports;
    this.resolvedImports = resolvedImports;
  }

  private replaceStringLiteral(node: StringLiteral) {
    // Already resolved.
    if (
      node.value.startsWith(`${location.origin}${this.appSourcePrefix}`) ||
      node.value.startsWith(`${location.origin}${this.vendorSourcePrefix}`)
    ) {
      return node;
    }

    // Local import.
    if (node.value.startsWith('.')) {
      if (!this.sourceDirectoryPath) {
        throw new Error(`No sourceDirectoryPath defined`);
      }

      const specifierPath = resolve(this.sourceDirectoryPath, this.filePath);
      const specifierDirectoryPath = dirname(specifierPath);
      const normalized = resolve(specifierDirectoryPath, node.value);

      if (!normalized.startsWith(this.sourceDirectoryPath)) {
        throw new Error(
          `While compiling '${this.filePath}': Local import must be in app source. ('${node.value}' in '${specifierPath}')`,
        );
      }

      const withoutBasePath = normalized.replace(
        this.sourceDirectoryPath,
        '',
      );

      node.value =
        `${location.origin}${this.appSourcePrefix}${withoutBasePath}`;
      return node;
    }

    // ImportMap import.
    const parsedImportsResult = this.parsedImports[node.value];
    if (parsedImportsResult) {
      node.value = `${location.origin}${this.vendorSourcePrefix}/${node.value}`;
      return node;
    }

    // External import.
    const result = Object.keys(this.resolvedImports).find((key) => {
      return key.endsWith(node.value);
    });
    if (!result) {
      return node;
    }
    const { hostname, pathname } = new URL(result);
    node.value =
      `${location.origin}${this.vendorSourcePrefix}/${hostname}${pathname}`;
    return node;
  }

  public override visitImportDeclaration(node: ImportDeclaration) {
    node.source = this.replaceStringLiteral(node.source);
    return super.visitImportDeclaration(node);
  }

  public override visitExportNamedDeclaration(node: ExportNamedDeclaration) {
    if (node.source) {
      node.source = this.replaceStringLiteral(node.source);
    }
    return super.visitExportNamedDeclaration(node);
  }

  public override visitExportAllDeclaration(node: ExportAllDeclaration) {
    if (node.source) {
      node.source = this.replaceStringLiteral(node.source);
    }
    return super.visitExportAllDeclaration(node);
  }
}
