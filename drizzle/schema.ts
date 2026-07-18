/**
 * Drizzle table definitions. Columns mirror the zod models in
 * `src/entities/models` — the entities layer owns the shapes the app passes
 * around, and these tables own how they persist.
 *
 * The aggregate is a broadcast (one uploaded news video), keyed by its upload
 * filename. Its pipeline artifacts — transcript, stories, headlines, frames,
 * run record — live in child tables that used to be JSON files under `public/`.
 * Foreign keys cascade so deleting a broadcast clears everything derived from
 * it. Story/headline/frame rows carry an `idx` so a stage's ordered output
 * survives the round-trip through the database.
 */
import { relations } from 'drizzle-orm';
import { index, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';

const primaryId = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => nanoid());

const createdAt = () => timestamp('created_at').notNull().defaultNow();

const updatedAt = () =>
  timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date());

const broadcastId = () =>
  text('broadcast_id')
    .notNull()
    .references(() => broadcasts.id, { onDelete: 'cascade' });

export const broadcasts = pgTable('broadcasts', {
  id: primaryId(),
  filename: text('filename').notNull().unique(),
  url: text('url').notNull(),
  size: integer('size').notNull(),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const transcripts = pgTable('transcripts', {
  id: primaryId(),
  broadcastId: broadcastId().unique(),
  text: text('text').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const stories = pgTable(
  'stories',
  {
    id: primaryId(),
    broadcastId: broadcastId(),
    idx: integer('idx').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    createdAt: createdAt(),
  },
  table => [
    index('stories_broadcast_idx').on(table.broadcastId),
    uniqueIndex('stories_broadcast_position').on(table.broadcastId, table.idx),
  ],
);

export const headlines = pgTable(
  'headlines',
  {
    id: primaryId(),
    broadcastId: broadcastId(),
    idx: integer('idx').notNull(),
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    headline: text('headline').notNull(),
    summary: text('summary').notNull(),
    createdAt: createdAt(),
  },
  table => [
    index('headlines_broadcast_idx').on(table.broadcastId),
    uniqueIndex('headlines_broadcast_position').on(table.broadcastId, table.idx),
  ],
);

export const frames = pgTable(
  'frames',
  {
    id: primaryId(),
    broadcastId: broadcastId(),
    idx: integer('idx').notNull(),
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    headline: text('headline').notNull(),
    frameTime: text('frame_time').notNull(),
    reason: text('reason').notNull(),
    frameUrl: text('frame_url').notNull(),
    createdAt: createdAt(),
  },
  table => [
    index('frames_broadcast_idx').on(table.broadcastId),
    uniqueIndex('frames_broadcast_position').on(table.broadcastId, table.idx),
  ],
);

export const runs = pgTable('runs', {
  id: primaryId(),
  broadcastId: broadcastId().unique(),
  runId: text('run_id'),
  startedAt: timestamp('started_at').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const broadcastsRelations = relations(broadcasts, ({ one, many }) => ({
  transcript: one(transcripts, { fields: [broadcasts.id], references: [transcripts.broadcastId] }),
  run: one(runs, { fields: [broadcasts.id], references: [runs.broadcastId] }),
  stories: many(stories),
  headlines: many(headlines),
  frames: many(frames),
}));

export const transcriptsRelations = relations(transcripts, ({ one }) => ({
  broadcast: one(broadcasts, { fields: [transcripts.broadcastId], references: [broadcasts.id] }),
}));

export const storiesRelations = relations(stories, ({ one }) => ({
  broadcast: one(broadcasts, { fields: [stories.broadcastId], references: [broadcasts.id] }),
}));

export const headlinesRelations = relations(headlines, ({ one }) => ({
  broadcast: one(broadcasts, { fields: [headlines.broadcastId], references: [broadcasts.id] }),
}));

export const framesRelations = relations(frames, ({ one }) => ({
  broadcast: one(broadcasts, { fields: [frames.broadcastId], references: [broadcasts.id] }),
}));

export const runsRelations = relations(runs, ({ one }) => ({
  broadcast: one(broadcasts, { fields: [runs.broadcastId], references: [broadcasts.id] }),
}));
