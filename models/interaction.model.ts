import { ObjectId } from "mongo";
import { z } from "zod";

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
