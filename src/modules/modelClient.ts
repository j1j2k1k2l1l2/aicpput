import { GenerationRequest } from '../types';
import { PythonBackendClient } from './pythonBackendClient';

export class ModelClientModule {
  private readonly backend = new PythonBackendClient();

  public async streamGenerate(
    request: GenerationRequest,
    _prompt: string,
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    await this.backend.streamGenerate(request.filePath, request.methods.map((m) => m.name), onChunk);
  }
}
