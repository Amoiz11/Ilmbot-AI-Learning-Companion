import re
from typing import List

# Conservative academic-note chunks for future RAG (embeddings come in a later phase).
TARGET_CHUNK_CHARS = 900
CHUNK_OVERLAP_CHARS = 150
MIN_CHUNK_CHARS = 40


def chunk_text(text: str) -> List[str]:
    """
    Split extracted PDF text into ordered overlapping chunks.
    Prefers paragraph boundaries, then falls back to word-aware hard splits.
    """
    if not text or not text.strip():
        return []

    normalized = re.sub(r"\r\n?", "\n", text)
    normalized = re.sub(r"[ \t]+", " ", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized).strip()

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", normalized) if p.strip()]
    if not paragraphs:
        paragraphs = [normalized]

    chunks: List[str] = []
    current = ""

    def flush_current() -> None:
        nonlocal current
        piece = current.strip()
        if len(piece) >= MIN_CHUNK_CHARS:
            chunks.append(piece)
        elif piece and not chunks:
            chunks.append(piece)
        elif piece and chunks:
            combined = f"{chunks[-1]} {piece}".strip()
            if len(combined) <= TARGET_CHUNK_CHARS + CHUNK_OVERLAP_CHARS:
                chunks[-1] = combined
            else:
                chunks.append(piece)
        current = ""

    for para in paragraphs:
        if len(para) > TARGET_CHUNK_CHARS:
            if current:
                flush_current()
            chunks.extend(_split_long_block(para))
            continue

        candidate = f"{current}\n\n{para}".strip() if current else para
        if len(candidate) <= TARGET_CHUNK_CHARS:
            current = candidate
        else:
            flush_current()
            current = para

    if current:
        flush_current()

    return _apply_overlap(chunks)


def _split_long_block(block: str) -> List[str]:
    words = block.split()
    pieces: List[str] = []
    current: List[str] = []
    current_len = 0

    for word in words:
        extra = len(word) + (1 if current else 0)
        if current and current_len + extra > TARGET_CHUNK_CHARS:
            pieces.append(" ".join(current))
            current = [word]
            current_len = len(word)
        else:
            current.append(word)
            current_len += extra

    if current:
        pieces.append(" ".join(current))
    return pieces


def _apply_overlap(chunks: List[str]) -> List[str]:
    if len(chunks) <= 1 or CHUNK_OVERLAP_CHARS <= 0:
        return chunks

    overlapped: List[str] = [chunks[0]]
    for i in range(1, len(chunks)):
        prev = overlapped[-1]
        overlap = prev[-CHUNK_OVERLAP_CHARS:] if len(prev) > CHUNK_OVERLAP_CHARS else prev
        overlap = overlap.lstrip()
        next_chunk = chunks[i]
        if overlap and not next_chunk.startswith(overlap):
            merged = f"{overlap} {next_chunk}".strip()
            overlapped.append(merged)
        else:
            overlapped.append(next_chunk)
    return overlapped
