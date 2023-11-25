import { ObjectId } from "mongo";
import { z } from "zod";
import { db } from "@/db.ts";

export type InteractionSchema = z.infer<typeof interactionParser>;

export const interactionParser = z.object({
  _id: z.instanceof(ObjectId).or(z.string()),
  version: z.number(),
  app: z.instanceof(ObjectId).or(z.string()),
  title: z.string(),
  description: z.string(),
  rewardDetail: z.string(),

  type: z.enum(["friendship", "event", "game", "life"]),
  options: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ),

  startDate: z.date(),
  endDate: z.date(),
  createdAt: z.date(),
});

export const Interactions = db.collection<InteractionSchema>("interactions");
