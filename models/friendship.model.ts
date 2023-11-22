import { ObjectId } from "mongo";
import { db } from "@/db.ts";
import { z } from "zod";

export type FriendshipSchema = z.infer<typeof friendshipParser>;

export const friendshipParser = z.object({
  _id: z.instanceof(ObjectId).or(z.string()),
  adder: z.string().or(z.instanceof(ObjectId).or(z.string())),
  accepter: z.string().or(z.instanceof(ObjectId).or(z.string())),
  removed: z.boolean().optional(),

  friendship: z.number(),
  interactions: z.array(z.instanceof(ObjectId).or(z.string())),

  images: z.array(z.string()),
  videos: z.array(z.string()),

  // sameApps: z.array(z.instanceof(ObjectId).or(z.string())),

  createdAt: z.date(),
});

export const Friendships = db.collection<FriendshipSchema>("friendships");
