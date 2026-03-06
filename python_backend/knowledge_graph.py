from __future__ import annotations

from typing import List

from .types import MethodInfo


class KnowledgeGraphModule:
    def enrich_prompt_context(self, methods: List[MethodInfo]) -> str:
        if not methods:
            return "知识图谱上下文：暂无。"
        nodes = "\n".join(f"- {m.name} ({m.filePath}:{m.line})" for m in methods)
        return f"知识图谱上下文（Python占位实现）：\n{nodes}"
