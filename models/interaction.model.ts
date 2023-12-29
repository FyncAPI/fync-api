import { ObjectId } from "mongo";
import { z } from "zod";
import { db } from "@/db.ts";

export type InteractionSchema = z.infer<typeof interactionParser>;

// also updte the frontend
export const interactionParser = z.object({
  _id: z.instanceof(ObjectId).or(z.string()),
  version: z.number(),
  app: z.instanceof(ObjectId).or(z.string()),
  title: z.string(),
  description: z.string(),
  rewardDetail: z.string(),
  urlSlug: z.string(),
  frequency: z.number().optional(),

  type: z.enum(["friendship", "event", "game"]),
  options: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ),

  startDate: z.date().optional(),
  endDate: z.date().optional(),
  createdAt: z.date(),
});

export const Interactions = db.collection<InteractionSchema>("interactions");
