import { ObjectId } from "mongo";
import { db } from "@/db.ts";
import { z } from "zod";

export type FriendshipSchema = z.infer<typeof friendshipParser>;

export const friendshipParser = z.object({
  _id: z.instanceof(ObjectId),
  adder: z.instanceof(ObjectId),
  accepter: z.instanceof(ObjectId),
  removed: z.boolean().optional(),

  friendship: z.number(),

  images: z.array(z.string()),
  videos: z.array(z.string()),

  // sameApps: z.array(z.instanceof(ObjectId)),

  createdAt: z.date(),
});

export const Friendships = db.collection<FriendshipSchema>("friendships");
