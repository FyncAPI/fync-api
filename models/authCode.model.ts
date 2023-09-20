import { ObjectId } from "mongo";
import { db } from "@/db.ts";
import { z } from "zod";

export const authCodeParser = z.object({
  _id: z.instanceof(ObjectId),
  clientId: z.string(),
  userId: z.instanceof(ObjectId),
  expireAt: z.date(),
  scopes: z.array(z.string()),
  used: z.boolean(),
});

export type AppUserSchema = z.infer<typeof authCodeParser>;

export const AuthCodes = db.collection<AppUserSchema>("authCodes");

AuthCodes.createIndexes({
  indexes: [
    {
      key: { expireAt: 1 },
      name: "expireAt",
      expireAfterSeconds: 0,
    },
  ],
});
