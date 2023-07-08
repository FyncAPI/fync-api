import { z } from "zod";
import { ObjectId } from "mongo";
import { db } from "../db.ts";

export const friendRequestParser = z.object({
  _id: z.instanceof(ObjectId),
  adder: z.string(),
  accepter: z.string(),

  status: z.enum(["pending", "accepted", "declined", "canceled"]),

  createdAt: z.date(),
});

export type FriendRequestSchema = z.infer<typeof friendRequestParser>;

export const FriendRequests =
  db.collection<FriendRequestSchema>("friendRequests");
