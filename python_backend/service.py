from __future__ import annotations

import argparse
import json
import sys
import uuid
import logging
from pathlib import Path
from typing import List

from .cpp_parser import CppParserModule
from .knowledge_graph import KnowledgeGraphModule
from .memory_store import MemoryStore
from .model_client import ModelClientModule
from .test_generator import TestGeneratorModule
from .types import GenerationRequest, MethodInfo


def cmd_index(root: str) -> int:
    parser = CppParserModule()
    result = [entry.to_dict() for entry in parser.index_workspace(root)]
    print(json.dumps(result, ensure_ascii=False))
    return 0


def cmd_generate(file_path: str, method_names: List[str]) -> int:
    parser = CppParserModule()
    model = ModelClientModule()
    generator = TestGeneratorModule()
    kg = KnowledgeGraphModule()
    memory = MemoryStore()
    logging.info("后端启动成功")
    all_methods = parser.extract_methods_from_file(Path(file_path))
    target_name = method_names[0] if method_names else ""
    selected = [m for m in all_methods if m.name == target_name]
    if not selected:
        print(json.dumps({"type": "error", "message": "未找到指定方法"}, ensure_ascii=False))
        return 1

    req = GenerationRequest(filePath=file_path, methods=selected)
    prompt = generator.build_prompt(req, kg.enrich_prompt_context(selected))

    session = str(uuid.uuid4())
    memory.clear(session)

    def on_chunk(chunk: str) -> None:
        memory.append(session, chunk)
        print(json.dumps({"type": "chunk", "data": chunk}, ensure_ascii=False), flush=True)

    model.stream_generate(req, prompt, on_chunk)
    

    print(json.dumps({"type": "done", "data": memory.read(session)}, ensure_ascii=False), flush=True)
    return 0


def main() -> int:
    argp = argparse.ArgumentParser(description="CppUT Python backend service")
    sub = argp.add_subparsers(dest="command", required=True)

    index_p = sub.add_parser("index")
    index_p.add_argument("--root", required=True)

    gen_p = sub.add_parser("generate")
    gen_p.add_argument("--file", required=True)
    gen_p.add_argument("--methods", required=True, help="JSON array of method names")

    args = argp.parse_args()

    try:
        if args.command == "index":
            return cmd_index(args.root)
        if args.command == "generate":
            methods = json.loads(args.methods)
            if not isinstance(methods, list):
                raise ValueError("--methods 必须是数组")
            return cmd_generate(args.file, [str(m) for m in methods])
    except Exception as exc:
        print(json.dumps({"type": "error", "message": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
