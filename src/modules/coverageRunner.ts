import * as vscode from 'vscode';

export class CoverageRunnerModule {
  public async runCoverage(): Promise<void> {
    const terminal = vscode.window.createTerminal('CppUT Coverage');
    terminal.show(true);

    const commands = [
      'if [ -f CMakeLists.txt ]; then cmake -S . -B build && cmake --build build; fi',
      'if [ -d build ]; then cd build; fi',
      'ctest --output-on-failure || true',
      'if command -v gcovr >/dev/null 2>&1; then gcovr -r .. --html --html-details -o coverage.html; fi',
      'echo "Coverage workflow finished. Check build/coverage.html if generated."',
    ];

    terminal.sendText(commands.join(' && '));
  }
}
