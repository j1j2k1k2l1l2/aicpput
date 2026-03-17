import * as vscode from 'vscode';

export class CoverageRunnerModule {
  private static readonly CTEST_TIMEOUT_SECONDS = 30;
  private static readonly WINDOWS_TEST_CONFIG = 'Debug';

  public async runCoverage(): Promise<void> {
    const terminal = vscode.window.createTerminal('CppUT Coverage');
    terminal.show(true);

    if (process.platform === 'win32') {
      const timeout = CoverageRunnerModule.CTEST_TIMEOUT_SECONDS;
      const config = CoverageRunnerModule.WINDOWS_TEST_CONFIG;
      const command = [
     //   'if (Test-Path CMakeLists.txt) { cmake -S . -B build; if ($LASTEXITCODE -eq 0) { cmake --build build } }',
        `if (Test-Path CMakeLists.txt) { cmake -S . -B build; if ($LASTEXITCODE -eq 0) { cmake --build build --config ${config} } }`,
      //  'if (Test-Path CMakeLists.txt) { cmake -S . -B build; if ($LASTEXITCODE -eq 0) { cmake --build build --config Debug } }',
        'if (Test-Path build) { Set-Location build }',
     //   'ctest --output-on-failure',
     //   'ctest -C Debug --output-on-failure --timeout ${CoverageRunnerModule.CTEST_TIMEOUT_SECONDS}; if ($LASTEXITCODE -ne 0) { ctest --output-on-failure }',
         `ctest -C ${config} --output-on-failure --timeout ${timeout}`,
        'if ($LASTEXITCODE -ne 0) { ctest -C ${config} --output-on-failure }',
        'if (Get-Command gcovr -ErrorAction SilentlyContinue) { gcovr -r .. --html --html-details -o coverage.html }',
        'Write-Host "Coverage workflow finished. Check build/coverage.html if generated."',
      ].join('; ');
      terminal.sendText(command);
      return;
    }

    const command = [
      'if [ -f CMakeLists.txt ]; then cmake -S . -B build && cmake --build build; fi',
      'if [ -d build ]; then cd build; fi',
      'ctest --output-on-failure --timeout ${CoverageRunnerModule.CTEST_TIMEOUT_SECONDS} || true',
      'if command -v gcovr >/dev/null 2>&1; then gcovr -r .. --html --html-details -o coverage.html; fi',
      'echo "Coverage workflow finished. Check build/coverage.html if generated."',
    ].join(' && ');

    terminal.sendText(command);
  }
}
