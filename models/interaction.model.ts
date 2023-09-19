import { ObjectId } from "mongo";
import { z } from "zod";
import { db } from "@/db.ts";

export type InteractionSchema = z.infer<typeof interactionParser>;

export const interactionParser = z.object({
  _id: z.instanceof(ObjectId),
  app: z.instanceof(ObjectId),
  title: z.string(),
  description: z.string(),
  rewardDetail: z.string(),

  type: z.enum(["friendship", "event"]),
  tier: z.enum(["1", "2", "3"]),

  startDate: z.date(),
  endDate: z.date(),
  createdAt: z.date(),
});

export const Interactions = db.collection<InteractionSchema>("interactions");
