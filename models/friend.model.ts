import { ObjectId } from "mongo";
import { db } from "@/db.ts";
import { z } from "zod";

export type FriendSchema = z.infer<typeof friendParser>;

export const friendParser = z.object({
  _id: z.instanceof(ObjectId),
  adder: z.instanceof(ObjectId),
  accepter: z.instanceof(ObjectId),

  friendship: z.number(),

  images: z.array(z.string()),
  videos: z.array(z.string()),

  // sameApps: z.array(z.instanceof(ObjectId)),

  createdAt: z.date(),
});

export const Friends = db.collection<FriendSchema>("Friends");
