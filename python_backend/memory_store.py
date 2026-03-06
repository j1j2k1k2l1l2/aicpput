from __future__ import annotations

from collections import defaultdict
from typing import Dict, List


class MemoryStore:
    def __init__(self) -> None:
        self._map: Dict[str, List[str]] = defaultdict(list)

    def append(self, session_id: str, chunk: str) -> None:
        self._map[session_id].append(chunk)

    def read(self, session_id: str) -> str:
        return "".join(self._map.get(session_id, []))

    def clear(self, session_id: str) -> None:
        if session_id in self._map:
            del self._map[session_id]
