import { z } from 'zod';

import { TIMESTAMP_PATTERN } from '@/lib/timestamps';

/**
 * MM:SS or H:MM:SS, the one timestamp grammar the pipeline produces. Kept in
 * sync with the pipeline by importing the pattern rather than re-declaring it,
 * so a story/headline/frame row can never persist a shape the rest of the app
 * would reject.
 */
export const timestampSchema = z.string().regex(TIMESTAMP_PATTERN);
