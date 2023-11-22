import { ObjectId } from "mongo";
import { db } from "../db.ts";
import { z } from "zod";

export const appUserParser = z.object({
  _id: z.instanceof(ObjectId).or(z.string()),
  app: z.instanceof(ObjectId).or(z.string()),

  fyncId: z.instanceof(ObjectId).or(z.string()),
  appUserId: z.string(),
  friends: z.array(z.instanceof(ObjectId).or(z.string())),

  createdAt: z.date(),
});

export type AppUserSchema = z.infer<typeof appUserParser>;

export const createAppUserParser = appUserParser.omit({
  _id: true,
  createdAt: true,
});

export const AppUsers = db.collection<AppUserSchema>("appUsers");
