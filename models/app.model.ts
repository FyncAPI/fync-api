import { ObjectId } from "mongo";
import { db } from "../db.ts";
import { z } from "zod";

export interface AppSchema {
  _id: ObjectId;
  name: string;
  description: string;
  image: string;
  url: string;
  userCount: number;
  createdAt: Date;
}

export const appParser = z.object({
  _id: z.instanceof(ObjectId),
  name: z.string(),
  description: z.string(),
  image: z.string(),
  url: z.string(),
  userCount: z.number(),
  createdAt: z.date(),
});

export const createAppParser = z.object({
  name: z.string(),
  description: z.string(),
  image: z.string(),
  url: z.string(),

  // userCount: z.number(),
});

export const Apps = db.collection<AppSchema>("apps");
