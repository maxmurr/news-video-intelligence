# Interactive News Video Intelligence

## Context

A client reviews news broadcasts that are typically 30 to 60 minutes long. They want a web application that
turns each broadcast into an interactive newspaper, so users can understand the main stories without
watching the full video and can still verify every answer against the original footage.

## The Client Request

A user should be able to provide a news video and, once it is ready, browse the main stories found within it. Each story should include a clear headline, a short summary, a representative image, and a direct way to open the relevant moment in the source video.

> **Example**
>
> Question: "Was there any news about wildfires? Please summarize it."
>
> Possible follow-ups: "Where did it happen?" "Was the cause mentioned?" "Show me the relevant clip."

Answers should make it easy to see where the information came from and jump to the supporting moment.
The conversation should retain context across follow-up questions.
The product should also behave sensibly when a topic appears more than once, story boundaries are
unclear, a question depends on an earlier message, or the video does not contain the requested information.

## Language

**Transcript chunk**:
The unit of retrieval — a sliding window of consecutive transcript lines (~30–45s of speech, with a small overlap into the next window) carrying its own `start`/`end` timestamp span. Embedded and stored for search; a search hit maps back to its span so the user can jump to that moment in the video.
_Avoid_: segment (reserved — see below), passage, excerpt.

**Retrieval**:
Selecting the transcript chunks most relevant to a question. The **desk assistant** (`/api/chat`) grounds answers in the top-k chunks retrieved by semantic (vector) similarity across the **whole library** — every broadcast's chunks — and attributes each to its source broadcast. Single-broadcast Q&A (`/api/chat/[fileId]`) still uses that broadcast's full transcript. See `docs/adr/0002`.

## Flagged ambiguities

- "segment" is reserved for **story segmentation** (splitting a transcript into stories). Do not use it for the retrieval unit — that is a **transcript chunk**.
