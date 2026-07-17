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
