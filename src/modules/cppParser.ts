import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { FileMethodIndex, MethodInfo } from '../types';

const CPP_EXTENSIONS = new Set(['.cpp', '.cc', '.cxx', '.hpp', '.hh', '.h']);
const METHOD_REGEX = /^\s*(?:template\s*<[^>]+>\s*)?(?:[\w:<>~*&\s]+)\s+([A-Za-z_][\w:]*)\s*\(([^;{}]*)\)\s*(?:const)?\s*(?:noexcept)?\s*(?:\{|$)/gm;

export class CppParserModule {
  public async indexWorkspace(rootPath: string): Promise<FileMethodIndex[]> {
    const files = await this.collectCppFiles(rootPath);
    const index: FileMethodIndex[] = [];

    for (const filePath of files) {
      const methods = await this.extractMethodsFromFile(filePath);
      if (methods.length > 0) {
        index.push({ filePath, methods });
      }
    }

    return index;
  }

  public async getMethodsForActiveFile(): Promise<MethodInfo[]> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return [];
    }
    return this.extractMethodsFromFile(editor.document.uri.fsPath);
  }

  private async collectCppFiles(dirPath: string): Promise<string[]> {
    const result: string[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (['.git', 'node_modules', 'build', '.vscode'].includes(entry.name)) {
          continue;
        }
        result.push(...(await this.collectCppFiles(fullPath)));
      } else if (CPP_EXTENSIONS.has(path.extname(entry.name))) {
        result.push(fullPath);
      }
    }

    return result;
  }

  private async extractMethodsFromFile(filePath: string): Promise<MethodInfo[]> {
    let text: string;
    try {
      text = await fs.readFile(filePath, 'utf-8');
    } catch {
      return [];
    }

    const methods: MethodInfo[] = [];
    METHOD_REGEX.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = METHOD_REGEX.exec(text)) !== null) {
      const signature = match[0].trim();
      const name = match[1];
      const line = text.slice(0, match.index).split('\n').length;
      methods.push({ name, signature, filePath, line });
    }

    return methods;
  }
}
