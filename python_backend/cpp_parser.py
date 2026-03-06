from __future__ import annotations

import re
from pathlib import Path
from typing import Iterable, List

from .types import FileMethodIndex, MethodInfo

CPP_EXTENSIONS = {".cpp", ".cc", ".cxx", ".hpp", ".hh", ".h"}
IGNORE_DIRS = {".git", "node_modules", "build", ".vscode", "out", "dist", "__pycache__"}
METHOD_REGEX = re.compile(
    r"^\s*(?:template\s*<[^>]+>\s*)?(?:[\w:<>~*&\s]+)\s+([A-Za-z_][\w:]*)\s*\(([^;{}]*)\)\s*(?:const)?\s*(?:noexcept)?\s*(?:\{|$)",
    re.MULTILINE,
)


class CppParserModule:
    def index_workspace(self, root_path: str) -> List[FileMethodIndex]:
        root = Path(root_path)
        files = self._collect_cpp_files(root)
        index: List[FileMethodIndex] = []
        for file_path in files:
            methods = self.extract_methods_from_file(file_path)
            if methods:
                index.append(FileMethodIndex(filePath=str(file_path), methods=methods))
        return index

    def extract_methods_from_file(self, file_path: Path) -> List[MethodInfo]:
        try:
            text = file_path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            return []

        methods: List[MethodInfo] = []
        for match in METHOD_REGEX.finditer(text):
            signature = match.group(0).strip()
            name = match.group(1)
            line = text.count("\n", 0, match.start()) + 1
            methods.append(MethodInfo(name=name, signature=signature, filePath=str(file_path), line=line))
        return methods

    def _collect_cpp_files(self, root: Path) -> List[Path]:
        if not root.exists():
            return []
        result: List[Path] = []
        for path in self._walk(root):
            if path.suffix in CPP_EXTENSIONS:
                result.append(path)
        return result

    def _walk(self, root: Path) -> Iterable[Path]:
        for entry in root.iterdir():
            if entry.is_dir():
                if entry.name in IGNORE_DIRS:
                    continue
                yield from self._walk(entry)
            elif entry.is_file():
                yield entry
