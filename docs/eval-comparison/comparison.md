# Eval comparison: adaptive vs fixed models

Comparison of two pipeline model configurations, scored by the Evalite suites in
`evals/`. Raw run exports live beside this file: [`adaptive.json`](./adaptive.json),
[`fixed.json`](./fixed.json).

## Configurations

Only the generative stages change. Embedding and rerank stay on Cohere in both.

| Stage      | Adaptive (per-stage)           | Fixed (single model)      |
| ---------- | ------------------------------ | ------------------------- |
| transcribe | `google/gemini-3.5-flash`      | `google/gemini-3.5-flash` |
| stories    | `google/gemini-3-flash`        | `google/gemini-3.5-flash` |
| headlines  | `google/gemini-3.1-flash-lite` | `google/gemini-3.5-flash` |
| frames     | `google/gemini-3.5-flash`      | `google/gemini-3.5-flash` |

Flip `FIXED_MODEL` in `lib/models.ts` to switch the whole pipeline to one model.

## Method

- Fixture: `test.mp4` (~14 min BBC "Iran War Today" briefing), one video.
- Judge: `anthropic/claude-sonnet-5` — a different family from the pipeline, to
  avoid self-preference. Raw 1–5, normalised to 0–1; pass threshold 3/5 (0.60).
- Harness runs suites **serially** (`fileParallelism: false`), so one run =
  one transcript → one story set → one headline set → one frame set, scored once.
- One run per configuration. **This is a single sample, not an average** — see
  Caveats before drawing model conclusions.

## Results

| Suite          | Adaptive                   | Fixed                         |
| -------------- | -------------------------- | ----------------------------- |
| Stories        | ✅ 0.80 (4/5), **1 story** | ✅ 0.80 (4/5), **3 stories**  |
| Headlines      | ✅ 0.80 (4/5), 1 item      | ✅ 0.80 (4/5), 3 items        |
| Frames         | ✅ 1.00 (raw 5), 1 frame   | ✅ 0.60 (raw 4,2,3), 3 frames |
| Task wall-time | 90 s                       | 247 s                         |

Both configurations pass every deterministic invariant and clear the judge
threshold on every stage.

### Stories

- **Adaptive → 1 story** covering `00:00–13:54` ("US and Iran Exchange Devastating
  Strikes"). Coherent but **under-segmented** — it collapses the broadcast's
  distinct topics (military escalation, Gulf civilian impact, Red Sea energy
  route, Iran's domestic crisis) into one segment. Judge still gave 4/5.
- **Fixed → 3 stories**: escalation/strikes `00:00–10:00`, Gulf security
  `10:00–12:50`, Red Sea route `12:50–14:10`. Better granularity, cleaner topic
  boundaries — though it misses the domestic-crisis segment. Judge 4/5.

Segmentation granularity is the largest visible difference, but it is
**run-to-run noise as much as model choice** (earlier adaptive runs produced 4–7
stories on the same fixture).

### Headlines

Identical judged quality (4/5 both). Every headline is grounded in the transcript
with no invented facts. Model choice does not move headline quality on this input.

### Frames

- **Adaptive**: single frame, raw 5 — a US military helicopter boarding a tanker,
  a strong match for the one story.
- **Fixed**: three frames, raw `[4, 2, 3]` — destroyed bridge (good), an unrelated
  studio talking-head (bad), night-vision Hormuz footage (topically adjacent).

Fixed's lower frame average is **confounded by count**: three stories mean three
frame picks and three chances for a weak one, versus one easy pick for adaptive.
This is not evidence of a worse frame model.

## Caveats

1. **n = 1 per config.** Segmentation, and everything downstream of it, is
   non-deterministic. One run cannot separate model signal from run variance.
2. **Frame and headline scores are downstream of story count.** More stories →
   more (and harder) frames/headlines. The frame averages are not like-for-like.
3. **Single fixture.** One 14-minute clip is not representative of the corpus.

## Verdict

- **No defensible quality winner from this data.** Judged quality ties at 4/5 on
  stories and headlines; the frame and story-count gaps are explained by
  nondeterminism and the count confound, not model capability.
- **Adaptive is cheaper here** (90 s vs 247 s), mostly because it produced fewer
  stories/frames this run — also a count artifact, not a fixed cost.
- **To get a real signal**: run each config N ≥ 5 times over multiple fixtures and
  compare score _distributions_, not single runs. Pin story count (or compare at
  equal count) before reading the frame scores.

## Why this is now measurable

Earlier comparison attempts failed with the same config passing one run and
failing the next. Three harness/pipeline fixes removed that variance:

- **Serial suites** (`evalite.config.ts`, `fileParallelism: false`) — suites share
  one Postgres; running them one at a time lets the first populate the cache and
  the rest read it, instead of each worker re-transcribing in parallel and racing
  the write.
- **ASR retry** (`transcribe-broadcast.use-case.ts`) — the transcription model
  intermittently returns empty output; regenerate a few times before failing the
  step, so one bad draw no longer sinks the run.
- **Line-snapped stories** (`detect-stories.use-case.ts`) — story boundaries snap
  to real transcript-line timestamps as a contiguous partition, so spans always
  align to seekable lines and the coverage/alignment invariants hold by
  construction.
