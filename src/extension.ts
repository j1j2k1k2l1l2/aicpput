import * as vscode from 'vscode';
import { CppParserModule } from './modules/cppParser';
import { CoverageRunnerModule } from './modules/coverageRunner';
import { KnowledgeGraphModule } from './modules/knowledgeGraph';
import { MemoryStore } from './modules/memory';
import { ModelClientModule } from './modules/modelClient';
import { TestGeneratorModule } from './modules/testGenerator';
import { SidebarProvider } from './sidebarProvider';

export function activate(context: vscode.ExtensionContext): void {
  const parser = new CppParserModule();
  const sidebar = new SidebarProvider(
    context,
    parser,
    new ModelClientModule(),
    new TestGeneratorModule(),
    new KnowledgeGraphModule(),
    new MemoryStore(),
    new CoverageRunnerModule(),
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebar),
    vscode.commands.registerCommand('cpput.refreshMethods', () => sidebar.refreshMethodIndex()),
  );
}

export function deactivate(): void {
  // noop
}
