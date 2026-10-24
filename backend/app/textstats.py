"""Style facts measured in code, not by the LLM (LLMs count badly)."""

import re

FIRST_PERSON = {"i", "me", "my", "mine", "i'm", "i've", "i'd", "i'll", "myself"}


def stats(text: str) -> dict:
    words = text.split()
    sentences = [s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s]
    paragraphs = [p for p in re.split(r"\n\s*\n", text.strip()) if p]
    lines = text.splitlines()
    return {
        "words": len(words),
        "avg_sentence_words": round(len(words) / max(len(sentences), 1), 1),
        "avg_paragraph_words": round(len(words) / max(len(paragraphs), 1), 1),
        "questions": text.count("?"),
        "em_dashes": text.count("—"),
        "emojis": len(re.findall(r"[\U0001F300-\U0001FAFF☀-➿]", text)),
        "hashtags": len(re.findall(r"#\w+", text)),
        "list_lines": sum(1 for l in lines if re.match(r"\s*([-*•]|\d+[.)])\s", l)),
        "first_person_ratio": round(sum(w.lower().strip(".,!?\"'") in FIRST_PERSON for w in words) / max(len(words), 1), 3),
    }
