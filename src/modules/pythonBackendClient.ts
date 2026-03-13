import * as path from 'path';
import * as readline from 'readline';
import { spawn } from 'child_process';
import * as vscode from 'vscode';
import { FileMethodIndex } from '../types';

export class PythonBackendClient {
  private readonly rootDir = path.resolve(__dirname, '../../');

  private getPythonEnv(): NodeJS.ProcessEnv {
    const config = vscode.workspace.getConfiguration('CppUT');
    const endpoint = "https://api.deepseek.com"
    const apiKey = "sk-5fae0db50f0244dba0cadf28bdd6b8d5"

    return {
      ...process.env,
      PYTHONUTF8: '1',
      PYTHONIOENCODING: 'utf-8',
      CPPUT_API_ENDPOINT: process.env.CPPUT_API_ENDPOINT || endpoint,
      CPPUT_API_KEY: process.env.CPPUT_API_KEY || apiKey,
    };
  }

  public async indexWorkspace(rootPath: string): Promise<FileMethodIndex[]> {
    const output = await this.runJsonCommand(['index', '--root', rootPath]);
    return output as FileMethodIndex[];
  }

  public async streamGenerate(
    filePath: string,
    methodNames: string[],
    onChunk: (chunk: string) => void,
  ): Promise<string> {
    const python = process.env.CPPUT_PYTHON_BIN || 'python';
    const args = ['-m', 'python_backend.service', 'generate', '--file', filePath, '--methods', JSON.stringify(methodNames)];

    return await new Promise<string>((resolve, reject) => {
      const child = spawn(python, args, { cwd: this.rootDir, env: this.getPythonEnv() });
      const rl = readline.createInterface({ input: child.stdout });
      let fullText = '';
      let stderr = '';

      rl.on('line', (line) => {
        if (!line.trim()) {
          return;
        }
        try {
          const msg = JSON.parse(line) as { type: string; data?: string; message?: string };
          if (msg.type === 'chunk' && typeof msg.data === 'string') {
            onChunk(msg.data);
            fullText += msg.data;
          } else if (msg.type === 'done' && typeof msg.data === 'string') {
            fullText = msg.data;
          } else if (msg.type === 'error') {
            reject(new Error(msg.message || 'Python backend error'));
          }
        } catch {
          onChunk(line + '\n');
          fullText += line + '\n';
        }
      });

      child.stderr.on('data', (buf) => {
        stderr += String(buf);
      });

      child.on('error', (err) => reject(err));
      child.on('close', (code) => {
        rl.close();
        if (code === 0) {
          resolve(fullText);
          return;
        }
        reject(new Error(stderr || `Python backend exited with code ${code}`));
      });
    });
  }

  private async runJsonCommand(args: string[]): Promise<unknown> {
    const python = process.env.CPPUT_PYTHON_BIN || 'python';
    const cmdArgs = ['-m', 'python_backend.service', ...args];

    return await new Promise<unknown>((resolve, reject) => {
      const child = spawn(python, cmdArgs, { cwd: this.rootDir, env: this.getPythonEnv() });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (buf) => {
        stdout += String(buf);
      });
      child.stderr.on('data', (buf) => {
        stderr += String(buf);
      });
      child.on('error', (err) => reject(err));
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(stderr || `Python backend exited with code ${code}`));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(e);
        }
      });
    });
  }
}
