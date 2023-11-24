import { ObjectId } from "mongo";
import { db } from "../db.ts";
import { z } from "zod";

// export const appParser = z.object({
//   _id: z.instanceof(ObjectId).or(z.string()),
//   name: z.string(),
//   description: z.string(),

//   clientId: z.string(),
//   clientSecret: z.string(),

//   appStoreId: z.string().optional(),
//   androidPackageName: z.string().optional(),
//   url: z
//     .string()
//     .regex(/^(http:\/\/|https:\/\/)[^\s/$.?#].[^\s]*$/)
//     .optional(),

//   redirects: z.array(z.string().url()).optional(),

//   image: z.string().optional(),
//   users: z.array(z.string()),
//   events: z.array(z.string()),
//   interactions: z.array(z.string()),

//   createdAt: z.date(),
// });

// export const createAppParser = appParser.pick({
//   name: true,
//   description: true,
//   url: true,
// });
// export type AppSchema = z.infer<typeof appParser>;

// export const Apps = db.collection<AppSchema>("apps");

export const appParser = z.object({
  _id: z.instanceof(ObjectId).or(z.string()),
  name: z.string(),
  description: z.string(),

  clientId: z.string(),
  clientSecret: z.string(),

  discordClientId: z.string().optional(),
  discordClientSecret: z.string().optional(),
  discordRedirectUri: z.string().optional(),
  discordScopes: z.array(z.string()).optional(),

  appStoreId: z.string().optional(),
  androidPackageName: z.string().optional(),
  url: z
    .string()
    .regex(/^(http:\/\/|https:\/\/)[^\s/$.?#].[^\s]*$/)
    .optional(),

  redirects: z.array(z.string().url()).optional(),

  image: z.string().optional(),
  users: z.array(z.string()),
  events: z.array(z.string()),
  interactions: z.array(z.string()),

  createdAt: z.date(),
});

export const createAppParser = appParser.pick({
  name: true,
  description: true,
  url: true,
});
// extract the inferred type
export type App = z.infer<typeof appParser>;
export const Apps = db.collection<App>("apps");
