from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import List, Dict, Any


@dataclass
class MethodInfo:
    name: str
    signature: str
    filePath: str
    line: int

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class FileMethodIndex:
    filePath: str
    methods: List[MethodInfo]

    def to_dict(self) -> Dict[str, Any]:
        return {"filePath": self.filePath, "methods": [m.to_dict() for m in self.methods]}


@dataclass
class GenerationRequest:
    filePath: str
    methods: List[MethodInfo]
    language: str = "zh-CN"
