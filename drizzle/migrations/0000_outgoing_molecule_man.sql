CREATE TABLE "broadcasts" (
	"id" text PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"url" text NOT NULL,
	"size" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "broadcasts_filename_unique" UNIQUE("filename")
);
--> statement-breakpoint
CREATE TABLE "frames" (
	"id" text PRIMARY KEY NOT NULL,
	"broadcast_id" text NOT NULL,
	"idx" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"headline" text NOT NULL,
	"frame_time" text NOT NULL,
	"reason" text NOT NULL,
	"frame_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "headlines" (
	"id" text PRIMARY KEY NOT NULL,
	"broadcast_id" text NOT NULL,
	"idx" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"headline" text NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" text PRIMARY KEY NOT NULL,
	"broadcast_id" text NOT NULL,
	"run_id" text,
	"started_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "runs_broadcast_id_unique" UNIQUE("broadcast_id")
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" text PRIMARY KEY NOT NULL,
	"broadcast_id" text NOT NULL,
	"idx" integer NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcripts" (
	"id" text PRIMARY KEY NOT NULL,
	"broadcast_id" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transcripts_broadcast_id_unique" UNIQUE("broadcast_id")
);
--> statement-breakpoint
ALTER TABLE "frames" ADD CONSTRAINT "frames_broadcast_id_broadcasts_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."broadcasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "headlines" ADD CONSTRAINT "headlines_broadcast_id_broadcasts_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."broadcasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_broadcast_id_broadcasts_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."broadcasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_broadcast_id_broadcasts_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."broadcasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_broadcast_id_broadcasts_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."broadcasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "frames_broadcast_idx" ON "frames" USING btree ("broadcast_id");--> statement-breakpoint
CREATE UNIQUE INDEX "frames_broadcast_position" ON "frames" USING btree ("broadcast_id","idx");--> statement-breakpoint
CREATE INDEX "headlines_broadcast_idx" ON "headlines" USING btree ("broadcast_id");--> statement-breakpoint
CREATE UNIQUE INDEX "headlines_broadcast_position" ON "headlines" USING btree ("broadcast_id","idx");--> statement-breakpoint
CREATE INDEX "stories_broadcast_idx" ON "stories" USING btree ("broadcast_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stories_broadcast_position" ON "stories" USING btree ("broadcast_id","idx");