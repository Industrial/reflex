import type {
  CallExpression,
  ExportAllDeclaration,
  ExportNamedDeclaration,
  ImportDeclaration,
  StringLiteral,
} from 'https://esm.sh/@swc/core@1.2.171/types.d.ts';
import { Visitor } from 'https://esm.sh/@swc/core@1.2.171/Visitor.js';
import {
  dirname,
  normalize,
  resolve,
} from 'https://deno.land/std@0.140.0/path/mod.ts';

export type ImportVisitorProps = {
  specifier: string;
  directoryPath?: string;
  appSourcePrefix: string;
  vendorSourcePrefix: string;
  parsedImports: Record<string, string>;
  resolvedImports: Record<string, string>;
};

export class ImportVisitor extends Visitor {
  specifier: string;
  directoryPath?: string;
  appSourcePrefix: string;
  vendorSourcePrefix: string;

  parsedImports: Record<string, string>;
  resolvedImports: Record<string, string>;

  constructor({
    specifier,
    directoryPath,
    appSourcePrefix,
    vendorSourcePrefix,
    parsedImports,
    resolvedImports,
  }: ImportVisitorProps) {
    super();
    this.specifier = specifier;
    this.directoryPath = directoryPath;
    this.appSourcePrefix = appSourcePrefix;
    this.vendorSourcePrefix = vendorSourcePrefix;
    this.parsedImports = parsedImports;
    this.resolvedImports = resolvedImports;
  }

  private replaceStringLiteral(node: StringLiteral) {
    // Already resolved.
    if (
      node.value.startsWith(this.appSourcePrefix) ||
      node.value.startsWith(this.vendorSourcePrefix)
    ) {
      return node;
    }

    // Local import.
    if (node.value.startsWith('.')) {
      if (this.directoryPath) {
        node.value = resolve(`${this.appSourcePrefix}/${node.value}`);
        return node;
      }

      const { hostname, pathname } = new URL(this.specifier);
      const newpathname = normalize(`${dirname(pathname)}/${node.value}`);
      node.value = `${this.vendorSourcePrefix}/${hostname}${newpathname}`;
      return node;
    }

    // ImportMap import.
    const parsedImportsResult = this.parsedImports[node.value];
    if (parsedImportsResult) {
      node.value = `${this.vendorSourcePrefix}/${node.value}`;
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
    node.value = `${this.vendorSourcePrefix}/${hostname}${pathname}`;
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

  public override visitCallExpression(node: CallExpression) {
    if (node.callee.type === 'Import') {
      node.arguments = node.arguments.map((argument) => {
        if (argument.expression.type === 'StringLiteral') {
          argument.expression = this.replaceStringLiteral(
            argument.expression,
          );
        }

        return argument;
      });
    }
    return super.visitCallExpression(node);
  }
}
