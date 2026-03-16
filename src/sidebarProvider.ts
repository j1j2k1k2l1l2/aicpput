import * as vscode from 'vscode';
import { CppParserModule } from './modules/cppParser';
import { CoverageRunnerModule } from './modules/coverageRunner';
import { ModelClientModule } from './modules/modelClient';
import { GenerationRequest, MethodInfo } from './types';

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'cpput.sidebar';

  private _view?: vscode.WebviewView;
  private fileMethodMap = new Map<string, MethodInfo[]>();
  private generatedByMethod = new Map<string, string>();
  private currentGeneratedMethod = '';

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly parser: CppParserModule,
    private readonly modelClient: ModelClientModule,
    private readonly coverage: CoverageRunnerModule,
  ) {}

  public resolveWebviewView(view: vscode.WebviewView): void {
    this._view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = this.getHtml();

    view.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case 'requestMethods':
          await this.refreshMethodIndex();
          break;
        case 'generate':
          await this.handleGenerate(msg.filePath as string, msg.methodName as string);
          break;
        case 'save':
          await this.handleSave();
          break;
        case 'runCoverage':
          await this.coverage.runCoverage();
          break;
      }
    });

    void this.refreshMethodIndex();
  }

  public async refreshMethodIndex(): Promise<void> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return;
    }

    const index = await this.parser.indexWorkspace(folders[0].uri.fsPath);
    this.fileMethodMap = new Map(index.map((entry) => [entry.filePath, entry.methods]));

    this._view?.webview.postMessage({
      type: 'methodsUpdated',
      data: index,
    });
  }

  private async handleGenerate(filePath: string, methodName: string): Promise<void> {
    if (!filePath) {
      vscode.window.showWarningMessage('请先选择一个源文件。');
      return;
    }

    const method = (this.fileMethodMap.get(filePath) ?? []).find((m) => m.name === methodName);

    if (!method) {
      vscode.window.showWarningMessage('请先选择一个方法。');
      return;
    }

    const req: GenerationRequest = { filePath, methods: [method], language: 'zh-CN' };
    this.currentGeneratedMethod = method.name;
    this.generatedByMethod.set(this.currentGeneratedMethod, '');

    try {
      await this.modelClient.streamGenerate(req, '', (chunk) => {
        const previous = this.generatedByMethod.get(this.currentGeneratedMethod) ?? '';
        this.generatedByMethod.set(this.currentGeneratedMethod, previous + chunk);
        this._view?.webview.postMessage({ type: 'stream', chunk });
      });
      this._view?.webview.postMessage({ type: 'done' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this._view?.webview.postMessage({ type: 'stream', chunk: `\n[生成失败] ${message}\n` });
      vscode.window.showErrorMessage(`流式生成失败：${message}`);
    }
  }

  private async handleSave(): Promise<void> {
    const methodContent = this.generatedByMethod.get(this.currentGeneratedMethod) ?? '';
    if (!methodContent.trim()) {
      vscode.window.showWarningMessage('当前没有可保存的测试内容。');
      return;
    }

    const uri = await vscode.window.showSaveDialog({
      saveLabel: '保存测试文件',
      filters: { 'C++ Test': ['cpp'] },
      defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri.with({ path: `${vscode.workspace.workspaceFolders[0].uri.path}/generated_${this.currentGeneratedMethod}_test.cpp` }),
    });

    if (!uri) {
      return;
    }

    await vscode.workspace.fs.writeFile(uri, Buffer.from(methodContent, 'utf-8'));
    await this.tryRegisterCTest(uri);
    vscode.window.showInformationMessage(`测试文件已保存: ${uri.fsPath}`);
  }

  private async tryRegisterCTest(testFileUri: vscode.Uri): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!workspaceRoot) {
      return;
    }

    const cmakeUri = vscode.Uri.joinPath(workspaceRoot, 'CMakeLists.txt');
    try {
      await vscode.workspace.fs.stat(cmakeUri);
    } catch {
      return;
    }

    let cmakeText = Buffer.from(await vscode.workspace.fs.readFile(cmakeUri)).toString('utf-8');
    const relativePath = vscode.workspace.asRelativePath(testFileUri, false).replace(/\\/g, '/');
    const safeTargetName = relativePath.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_');

    if (
      cmakeText.includes(`add_executable(${safeTargetName}`)
      || cmakeText.includes(`add_test(NAME ${safeTargetName}`)
      || cmakeText.includes(`gtest_discover_tests(${safeTargetName}`)
    ) {
      return;
    }

    const snippets: string[] = [];
    if (!/\benable_testing\s*\(/i.test(cmakeText)) {
      snippets.push('enable_testing()');
    }

    snippets.push('if(NOT TARGET GTest::gtest_main)');
    snippets.push('  find_package(GTest REQUIRED)');
    snippets.push('endif()');

    snippets.push(`add_executable(${safeTargetName} ${relativePath})`);
    snippets.push(`target_link_libraries(${safeTargetName} PRIVATE GTest::gtest_main)`);
    snippets.push(`add_test(NAME ${safeTargetName} COMMAND $<TARGET_FILE:${safeTargetName}>)`);

    const block = [
      '',
      '# ---- CppUT auto registration ----',
      ...snippets,
      '# ---- End CppUT auto registration ----',
      '',
    ].join('\n');

    cmakeText += block;
    await vscode.workspace.fs.writeFile(cmakeUri, Buffer.from(cmakeText, 'utf-8'));
    vscode.window.showInformationMessage(`已自动更新 CMakeLists.txt 并注册测试目标: ${safeTargetName}`);
  }

  private getHtml(): string {
    const nonce = `${Date.now()}`;
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: var(--vscode-font-family); padding: 8px; }
    select, button { width: 100%; margin-top: 8px; }
    #methods { border: 1px solid var(--vscode-editorWidget-border); margin-top: 8px; padding: 6px; max-height: 180px; overflow: auto; }
    #output { margin-top: 8px; width: 100%; height: 220px; white-space: pre-wrap; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); }
    .row { display: flex; gap: 6px; }
    .row button { flex: 1; }
  </style>
</head>
<body>
  <h3>CppUT Assistant</h3>
  <button id="refresh">刷新工程方法索引</button>
  <select id="fileSelect"></select>
  <div id="methods"></div>
  <div class="row">
    <button id="generate">流式生成测试</button>
    <button id="save">保存测试文件</button>
  </div>
  <button id="coverage">运行覆盖率流程</button>
  <textarea id="output" placeholder="模型输出将显示在这里"></textarea>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const fileSelect = document.getElementById('fileSelect');
    const methodsDiv = document.getElementById('methods');
    const output = document.getElementById('output');
    let cache = [];

    function renderFiles() {
      fileSelect.innerHTML = '';
      cache.forEach((entry) => {
        const opt = document.createElement('option');
        opt.value = entry.filePath;
        opt.textContent = entry.filePath;
        fileSelect.appendChild(opt);
      });
      renderMethods();
    }

    function renderMethods() {
      const current = cache.find((e) => e.filePath === fileSelect.value) || cache[0];
      methodsDiv.innerHTML = '';
      if (!current) return;
      current.methods.forEach((method, idx) => {
        const label = document.createElement('label');
        label.style.display = 'block';
        label.innerHTML = '<input type="radio" name="method" value="' + method.name + '" ' + (idx === 0 ? 'checked' : '') + ' /> ' + method.name + ' — ' + method.signature;
        methodsDiv.appendChild(label);
      });
      fileSelect.value = current.filePath;
    }

    document.getElementById('refresh').onclick = () => vscode.postMessage({ type: 'requestMethods' });
    fileSelect.onchange = () => renderMethods();
    document.getElementById('generate').onclick = () => {
      const selected = methodsDiv.querySelector('input[name="method"]:checked');
      const methodName = selected ? selected.value : '';
      output.value = '';
      vscode.postMessage({ type: 'generate', filePath: fileSelect.value, methodName });
    };
    document.getElementById('save').onclick = () => vscode.postMessage({ type: 'save' });
    document.getElementById('coverage').onclick = () => vscode.postMessage({ type: 'runCoverage' });

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'methodsUpdated') {
        cache = msg.data;
        renderFiles();
      }
      if (msg.type === 'stream') {
        output.value += msg.chunk;
      }
    });

    vscode.postMessage({ type: 'requestMethods' });
  </script>
</body>
</html>`;
  }
}
