import { ObjectId } from "mongo";
import { db } from "../db.ts";
import { z } from "zod";

export const devParser = z.object({
  _id: z.instanceof(ObjectId),
  userId: z.instanceof(ObjectId),
  website: z.string().optional(),
  apps: z.array(z.instanceof(ObjectId)),
  apiKeys: z.array(z.string()).optional(),
  createdAt: z.date(),
});

export type DevSchema = z.infer<typeof devParser>;

export const Devs = db.collection<DevSchema>("devs");
