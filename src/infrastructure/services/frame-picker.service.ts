import { generateText, Output } from 'ai';
import { unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';

import { downloadToFile, uploads } from '@/lib/files';
import { MODELS } from '@/lib/models';
import { formatStoryList } from '@/lib/schemas';
import { TIMESTAMP_PATTERN } from '@/lib/timestamps';
import { createFramePreview } from '@/lib/video';
import type { FramePick, IFramePickerService } from '@/src/application/services/frame-picker.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { NotFoundError } from '@/src/entities/errors/common';
import type { Headline } from '@/src/entities/models/headline';

// Frames this close to a story boundary are transition shots where the
// previous story's visuals are still on screen. The prompt tells the model to
// avoid them; the use case enforces the margin server-side.
const FRAME_BOUNDARY_MARGIN_SEC = 15;

export class FramePickerService implements IFramePickerService {
  constructor(private readonly instrumentationService: IInstrumentationService) {}

  /**
   * Runs the frame-picking model call against a small downscaled proxy of the
   * video, so the request stays within inline body limits. Timestamps map 1:1
   * back to the original.
   */
  async pickFrames(filename: string, headlines: Headline[]): Promise<FramePick[]> {
    return this.instrumentationService.startSpan(
      { name: 'FramePickerService > pickFrames', op: 'ai.run' },
      async () => {
        if (!(await uploads.exists(filename))) throw new NotFoundError(`File not found: ${filename}`);
        const videoPath = path.join(tmpdir(), `inv-preview-${randomUUID()}-${filename}`);
        let preview: Uint8Array;
        try {
          await downloadToFile(filename, videoPath);
          preview = await createFramePreview(videoPath);
        } finally {
          await unlink(videoPath).catch(() => {});
        }

        // Length is pinned so each frame pick lines up 1:1 with the headlines.
        const framePicksSchema = z.object({
          items: z
            .array(
              z.object({
                frameTime: z
                  .string()
                  .regex(TIMESTAMP_PATTERN)
                  .describe('MM:SS timestamp of the single most representative frame, within the story span'),
                reason: z.string().describe('One sentence on why this frame visually represents the story'),
              }),
            )
            .length(headlines.length),
        });

        const storyList = formatStoryList(headlines, h => h.headline);

        const result = await generateText({
          model: MODELS.frames,
          telemetry: { functionId: 'pick-frames', recordInputs: false },
          output: Output.object({ schema: framePicksSchema }),
          system:
            'You are a news video picture editor. For each story you are given, watch the video and pick the ' +
            'single frame that best represents that story visually: prefer relevant footage, graphics, or ' +
            'expressive moments over static talking heads when available. ' +
            `Never pick a frame within the first or last ${FRAME_BOUNDARY_MARGIN_SEC} seconds of a story span — those are transition ` +
            'shots where the presenter is still handing off from the previous topic. Search the middle of the ' +
            'span for the strongest visual, in this order of preference: (1) cutaway footage, on-location ' +
            'shots, graphics, or named people from the story; (2) the guest or expert who is speaking about ' +
            'the story; (3) only as a last resort, the studio host or presenter — the host introduces every ' +
            'story, so a host shot tells the viewer nothing about this one. Avoid frames that are blurry or ' +
            "mid-cut. The frame timestamp must lie within the story's time span. " +
            'Return exactly one pick per story, in the same order as the story list.',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: `Pick a representative frame for each of these stories:\n\n${storyList}` },
                { type: 'file', mediaType: 'video/mp4', data: preview },
              ],
            },
          ],
        });

        return result.output.items;
      },
    );
  }
}
