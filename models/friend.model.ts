import { ObjectId } from "mongo";
import { db } from "@/db.ts";
import { z } from "zod";

export type FriendSchema = z.infer<typeof friendParser>;

export const friendParser = z.object({
  _id: z.instanceof(ObjectId),
  adder: z.string(),
  accepter: z.string(),

  friendship: z.number(),

  images: z.array(z.string()),
  videos: z.array(z.string()),

  markdown: z.string(),
  userId: z.instanceof(ObjectId).optional(),
});

export const Friends = db.collection<FriendSchema>("Friends");
