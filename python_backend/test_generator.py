from __future__ import annotations

from .types import GenerationRequest


class TestGeneratorModule:
    def build_prompt(self, request: GenerationRequest, additional_context: str) -> str:
        method_text = "\n".join(
            f"目标测试源函数是 {method.name} ，函数签名是 {method.signature}" for method in request.methods
        )

        anchor = request.methods[0].name if request.methods else "unknown"
        return "\n".join(
            [
                "你是c++测试专家，你的任务是根据提供的目标测试源函数信息，使用googletest作为基础测试框架编写测试用例。",
                method_text,
                "",
                "编写单元测试用例使用如下格式：",
                f"以下是对源函数 {anchor} ，cpput专家编写的开头，请在返回结果中保留这一部分：",
                "#include <gtest/gtest.h>\n// TODO: include target headers",
                "",
                "根据上面的上下文信息，使用中文完成以下任务：",
                "充分分析函数作用和分支内容信息（保证行覆盖率，分支覆盖率）",
                "使用cpp专家编写的测试开头为目标方法编写测试用例，并且保证覆盖率",
                "将所有测试用例写入一个完整的cpp文件中，并且编译通过",
                "无需在测试文件中保留主函数",
                "",
                additional_context,
            ]
        )
