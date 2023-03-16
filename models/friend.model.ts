import { ObjectId } from "mongo";
import { db } from "../db.ts";
import { z } from "zod";

export interface FriendSchema {
  _id: ObjectId;
  name: string;
  type: "IRL" | "APP";
  tags: string[];
  description: string;
  mapsLink: string;
  date: Date;
  location: string;
  images: string[];
  videos?: string[];
  markdown: string;
  userId?: ObjectId;
}

export const FriendParser = z.object({
  _id: z.string() || z.instanceof(ObjectId),
  name: z.string(),
  type: z.enum(["IRL", "APP"]),
  tags: z.array(z.string()),
  description: z.string(),
  mapsLink: z.string(),
  date: z.date(),
  location: z.string(),
  images: z.array(z.string()),
  videos: z.array(z.string()),
  markdown: z.string(),
  userId: z.string() || z.instanceof(ObjectId) || z.undefined(),
});

export const Friends = db.collection<FriendSchema>("Friends");
