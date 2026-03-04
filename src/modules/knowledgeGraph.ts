import { MethodInfo } from '../types';

export class KnowledgeGraphModule {
  public enrichPromptContext(methods: MethodInfo[]): string {
    if (methods.length === 0) {
      return '知识图谱上下文：暂无。';
    }
    const nodes = methods.map((m) => `- ${m.name} (${m.filePath}:${m.line})`).join('\n');
    return `知识图谱上下文（占位实现）：\n${nodes}`;
  }
}
