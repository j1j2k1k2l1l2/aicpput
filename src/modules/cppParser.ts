import * as vscode from 'vscode';
import { FileMethodIndex, MethodInfo } from '../types';
import { PythonBackendClient } from './pythonBackendClient';

export class CppParserModule {
  private readonly backend = new PythonBackendClient();

  public async indexWorkspace(rootPath: string): Promise<FileMethodIndex[]> {
    return this.backend.indexWorkspace(rootPath);
  }

  public async getMethodsForActiveFile(): Promise<MethodInfo[]> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return [];
    }

    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return [];
    }

    const index = await this.backend.indexWorkspace(folders[0].uri.fsPath);
    return index.find((entry) => entry.filePath === editor.document.uri.fsPath)?.methods ?? [];
  }
}
