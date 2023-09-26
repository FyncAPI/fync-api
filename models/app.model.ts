import { ObjectId } from "mongo";
import { db } from "../db.ts";
import { z } from "zod";

export type AppSchema = z.infer<typeof appParser>;

export const appParser = z.object({
  _id: z.instanceof(ObjectId),
  name: z.string(),
  description: z.string(),

  clientId: z.string(),
  clientSecret: z.string(),

  appStoreId: z.string().optional(),
  androidPackageName: z.string().optional(),
  url: z.string().optional(),

  redirectUrl: z.string().optional(),

  image: z.string().optional(),
  users: z.array(z.instanceof(ObjectId)),
  events: z.array(z.instanceof(ObjectId)),
  interactions: z.array(z.instanceof(ObjectId)),

  createdAt: z.date(),
});

// export const createAppParser = appParser.omit({
//   _id: true,
//   createdAt: true,
//   users: true,
//   events: true,
//   interactions: true,
//   clientId: true,
//   clientSecret: true,
// });
export const createAppParser = appParser.pick({
  name: true,
  description: true,
  url: true,
});

export const Apps = db.collection<AppSchema>("apps");
