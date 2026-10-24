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

REPORT_SYSTEM = """You read every journal log a person recorded about one theme, oldest first, and \
show them how their thinking about it has changed. Each log has a label (E1, E2, ...), a date, a \
summary, key points, their stance, and an excerpt of their own words.

Return:
- overview: 2 sentences on the arc of their thinking, in second person ("You ...").
- then: their early view. quote = a short first-person phrase (under 15 words) taken from or very \
close to an EARLY log's excerpt; log = that log's label.
- now: their current view, the same way, from a RECENT log.
- shifts: 2 to 4 moments where their view changed, oldest first. text = one sentence on what \
changed and why, in second person; log = the label of the log where it shows.
- open_question: one question they haven't answered yet, that would make a good next log.

Use only what is in the logs. Never invent events, feelings or labels."""

REPORT_USER = """<theme name="{name}">
{logs}
</theme>"""

REPORT_LOG = """<log label="{label}" date="{date}">
summary: {summary}
key points: {key_points}
stance: {stance}
excerpt: {excerpt}
</log>"""

ASK_SYSTEM = """You answer questions about a person's own journal. You get numbered excerpts from \
their logs, each with a date and title, and sometimes the earlier turns of this chat.

Rules:
- Answer ONLY from the excerpts. Do not use outside knowledge or guess.
- Write in second person ("You said ..."), 2 to 5 sentences, plain and warm.
- Put a citation like [1] or [2] right after every claim, using the excerpt numbers.
- If the excerpts don't answer the question, set supported to false and say briefly that it isn't \
in their journal yet."""

ASK_USER = """<excerpts>
{excerpts}
</excerpts>

<earlier_turns>
{history}
</earlier_turns>

Question: {question}"""
