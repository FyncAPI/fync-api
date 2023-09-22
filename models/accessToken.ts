import { ObjectId } from "mongo";
import { db } from "@/db.ts";
import { z } from "zod";

export const accessTokenParser = z.object({
  _id: z.instanceof(ObjectId),
  accessToken: z.string(),
  tokenType: z.string(),
  clientId: z.string(),
  userId: z.instanceof(ObjectId),
  expireAt: z.date(),
  scopes: z.array(z.string()),
});

export type AccessTokenSchema = z.infer<typeof accessTokenParser>;

export const AccessTokens = db.collection<AccessTokenSchema>("accessTokens");

AccessTokens.createIndexes({
  indexes: [
    {
      key: { expireAt: 1 },
      name: "expireAt",
      expireAfterSeconds: 60 * 60 * 24 * 30, // 30 days,
    },
  ],
});
