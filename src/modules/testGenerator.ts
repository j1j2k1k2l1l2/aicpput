import { GenerationRequest } from '../types';

export class TestGeneratorModule {
  public buildPrompt(request: GenerationRequest, additionalContext: string): string {
    const targetMethod = request.methods[0];
    const anchor = targetMethod?.name ?? 'unknown';
    const signature = targetMethod?.signature ?? 'unknown';

    return [
      '你是 C++ 单元测试专家，使用 GoogleTest 生成测试代码。',
      `当前仅允许测试一个目标函数：${anchor}`,
      `目标函数签名：${signature}`,
      '',
      '请严格遵循以下输出规则：',
      '1) 只输出可直接保存的 C++ 测试代码，不要解释、不要分析、不要中文描述。',
      '2) 不要使用 Markdown 代码块围栏（禁止 ```cpp / ```）。',
      `3) 只允许围绕函数 ${anchor} 生成测试，不要包含其它函数的测试。`,
      '4) 输出必须是一个完整可编译的 .cpp 测试文件（无需 main）。',
      '5) 请覆盖主要分支与边界条件。',
      '',
      '测试文件开头必须保留：',
      '#include <gtest/gtest.h>\n// TODO: include target headers',
      '',
      '仅返回 C++ 测试代码：',
      additionalContext,
    ].join('\n');
  }
}
