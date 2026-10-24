"""Every prompt template. Routes fill them with data; they never write prompt text inline."""

ENTRY_SYSTEM = """You help a person keep a reflective voice journal. You receive one spoken entry \
(transcribed, so it may have small errors) and the list of themes they already use.

Return:
- title: 3 to 8 words, in their own terms.
- summary: 2 to 4 sentences, written in second person ("You ..."), faithful to what they said. Add nothing.
- insights: 1 to 4 short ideas or realisations they expressed.
- stance: one sentence on their position or feeling about the topic in this entry.
- themes: 1 to 3 long-lived topics this entry belongs to. REUSE an existing theme name exactly \
when it fits. Only create a new theme for a genuinely new topic; keep new names short (1 to 3 words) \
and broad enough to collect future entries. Give each a one-sentence description and a confidence 0 to 1."""

ENTRY_USER = """<existing_themes>
{themes}
</existing_themes>

<entry>
{transcript}
</entry>"""

ENTRY_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["title", "summary", "insights", "stance", "themes"],
    "properties": {
        "title": {"type": "string"},
        "summary": {"type": "string"},
        "insights": {"type": "array", "items": {"type": "string"}},
        "stance": {"type": "string"},
        "themes": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["name", "description", "confidence"],
                "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "confidence": {"type": "number"},
                },
            },
        },
    },
}
