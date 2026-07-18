import { generateText } from 'ai';

import { MODELS } from '@/lib/models';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ITranscriptionService } from '@/src/application/services/transcription.service.interface';

export class TranscriptionService implements ITranscriptionService {
  constructor(private readonly instrumentationService: IInstrumentationService) {}

  async transcribeAudio(audio: Uint8Array): Promise<string> {
    return this.instrumentationService.startSpan(
      { name: 'TranscriptionService > transcribeAudio', op: 'ai.run' },
      async () => {
        const result = await generateText({
          model: MODELS.transcribe,
          system:
            'You are a transcription engine. You output verbatim transcripts and nothing else. ' +
            'Never add introductions, headers, or commentary. Your response must start directly with the first timestamp.',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Transcribe the spoken audio. Start a new line with a plain MM:SS timestamp (for example 01:23 — no parentheses or brackets) roughly every 10 seconds, and preserve speaker turns.',
                },
                { type: 'file', mediaType: 'audio/mpeg', data: audio },
              ],
            },
          ],
        });
        return result.text;
      },
    );
  }
}
