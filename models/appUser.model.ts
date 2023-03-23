import { ObjectId } from "mongo";
import { db } from "../db.ts";
import { z } from "zod";

export const appUserParser = z.object({
  _id: z.instanceof(ObjectId),
  app: z.instanceof(ObjectId),

  fyncId: z.instanceof(ObjectId),
  appUserId: z.string(),

  appInteraction: z.object({
    friendshipCount: z.number(),
    eventCount: z.number(),
    lastInteraction: z.date(),
  }),
  createdAt: z.date(),
});

export type AppUserSchema = z.infer<typeof appUserParser>;

export const createAppUserParser = appUserParser.omit({
  _id: true,
  createdAt: true,
});

export const AppUsers = db.collection<AppUserSchema>("appUsers");
