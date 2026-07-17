import { createTextStreamResponse, streamText, toTextStream } from 'ai';
import { readCachedArtifact, requestedFilename, writeArtifactAtomic } from '@/lib/artifacts';
import { isValidTranscript, resolveUpload, transcribeRequest, transcriptPath } from '@/lib/pipeline';
import { pipelineErrorResponse } from '@/lib/stage-response';
import { normalizeTranscript } from '@/lib/timestamps';
import { extractSpeechAudio } from '@/lib/video';

export async function POST(req: Request) {
  const filename = await requestedFilename(req);
  if (!filename) {
    return Response.json({ error: 'Invalid filename. Expected a .mp4 file in uploads.' }, { status: 400 });
  }

  const transcriptFile = transcriptPath(filename);

  const cached = await readCachedArtifact(transcriptFile);
  if (cached !== null) {
    return new Response(cached, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Transcript-Cache': 'hit' },
    });
  }

  let audio: Buffer;
  try {
    audio = await extractSpeechAudio(await resolveUpload(filename));
  } catch (error) {
    const mapped = pipelineErrorResponse(error);
    if (mapped) return mapped;
    throw error;
  }

  // Stream the transcript to the client as it is generated; the workflow's
  // buffered variant (transcribeVideo) shares the same request options.
  const result = streamText(transcribeRequest(audio));

  // Persist once the stream completes. Only cache output that looks like a
  // transcript — a refusal or preamble cached here would poison every
  // downstream stage until someone manually deletes the file.
  void (async () => {
    try {
      const trimmed = normalizeTranscript(await result.text).trim();
      if (!isValidTranscript(trimmed)) {
        console.error(
          `Transcript for ${filename} does not start with a timestamp; not caching. Got: ${trimmed.slice(0, 80)}`,
        );
        return;
      }
      await writeArtifactAtomic(transcriptFile, trimmed);
    } catch (error) {
      console.error(`Failed to persist transcript for ${filename}:`, error);
    }
  })();

  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
    headers: { 'X-Transcript-Cache': 'miss' },
  });
}
