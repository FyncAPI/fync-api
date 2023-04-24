import { ObjectId } from "mongo";
import { db } from "../db.ts";
import { z } from "zod";
import { friendParser } from "./friend.model.ts";

export const devParser = z.object({
  _id: z.instanceof(ObjectId),
  userId: z.object({
    _id: z.instanceof(ObjectId),
    name: z.string(),
    email: z.string(),
  }),
  website: z.string(),
  apps: z.array(z.instanceof(ObjectId)),
  apiKeys: z.array(z.string()),
  createdAt: z.date(),
});

export type DevSchema = z.infer<typeof devParser>;

export const Devs = db.collection<DevSchema>("Devs");
