CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "transcript_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"broadcast_id" text NOT NULL,
	"idx" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"token_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transcript_chunks" ADD CONSTRAINT "transcript_chunks_broadcast_id_broadcasts_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."broadcasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transcript_chunks_broadcast_idx" ON "transcript_chunks" USING btree ("broadcast_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transcript_chunks_broadcast_position" ON "transcript_chunks" USING btree ("broadcast_id","idx");--> statement-breakpoint
CREATE INDEX "transcript_chunks_embedding_hnsw" ON "transcript_chunks" USING hnsw ("embedding" vector_cosine_ops);