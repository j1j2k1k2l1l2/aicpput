from __future__ import annotations

from pathlib import Path

from .types import GenerationRequest


class TestGeneratorModule:
    def build_prompt(
        self,
        request: GenerationRequest,
        additional_context: str,
        workspace_headers: list[str] | None = None,
    ) -> str:
        target_method = request.methods[0] if request.methods else None
        anchor = target_method.name if target_method else "unknown"
        signature = target_method.signature if target_method else "unknown"
        target_file = Path(request.filePath)
        base_dir = target_file.parent

        header_lines: list[str] = []
        for header in workspace_headers or []:
            header_path = Path(header)
            try:
                rel = header_path.relative_to(base_dir)
                display = str(rel).replace("\\", "/")
            except ValueError:
                display = str(header_path).replace("\\", "/")
            header_lines.append(f"- {display}")

        if not header_lines:
            header_lines.append("- （未找到头文件）")

        return "\n".join(
            [
                "你是 C++ 单元测试专家，使用 GoogleTest 生成测试代码。",
                f"当前仅允许测试一个目标函数：{anchor}",
                f"目标函数签名：{signature}",
                f"目标源文件：{target_file.name}",
                "",
                "请严格遵循以下输出规则：",
                "1) 只输出可直接保存的 C++ 测试代码，不要解释、不要分析、不要中文描述。",
                "2) 不要使用 Markdown 代码块围栏（禁止 ```cpp / ```）。",
                f"3) 只允许围绕函数 {anchor} 生成测试，不要包含其它函数的测试。",
                "4) 输出必须是一个完整可编译的 .cpp 测试文件（无需 main）。",
                "5) 请覆盖主要分支与边界条件。",
                "6) 必须把 `// TODO: include target headers` 替换为真实的 include 语句。",
                "7) 优先包含声明目标函数的头文件；若无合适头文件，可直接 include 目标源文件。",
                "",
                "当前目录（含子目录）可用头文件列表：",
                *header_lines,
                "",
                "测试文件开头必须保留：",
                "#include <gtest/gtest.h>\n// TODO: include target headers",
                "",
                "仅返回 C++ 测试代码：",
                additional_context,
            ]
        )
