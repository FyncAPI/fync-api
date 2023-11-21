import { ObjectId } from "mongo";
import { db } from "@/db.ts";
import { z } from "zod";
import { scopes } from "@/utils/scope.ts";
import * as bcrypt from "bcrypt";

export const accessTokenParser = z.object({
  _id: z.instanceof(ObjectId).or(z.string()),
  accessToken: z.string(),
  tokenType: z.string(),
  clientId: z.string(),
  userId: z.instanceof(ObjectId).or(z.string()),
  expireAt: z.date(),
  scopes: z.array(z.string()),
});

export type AccessToken = z.infer<typeof accessTokenParser>;

export const AccessTokens = db.collection<AccessToken>("accessTokens");

AccessTokens.createIndexes({
  indexes: [
    {
      key: { expireAt: 1 },
      name: "expireAt",
      expireAfterSeconds: 60 * 60 * 24 * 30, // 30 days,
    },
  ],
});

export const createAccessToken = async (userId: string, code?: string) => {
  try {
    const accessToken =
      Deno.env.get("ENV") == "dev"
        ? await bcrypt.hash(code || userId.toString(), await bcrypt.genSalt(10))
        : bcrypt.hashSync(code || userId, bcrypt.genSaltSync(10));

    const tokenId = await AccessTokens.insertOne({
      accessToken,
      tokenType: "Bearer",
      clientId: "",
      userId,
      expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
      scopes: [
        scopes.read.friends,
        scopes.read.profile,
        scopes.read.posts,
        scopes.write.friendship,
        scopes.write.apps,
        scopes.write.friends,
      ],
    });

    return accessToken;
  } catch (error) {
    console.log(error);
    return null;
  }
};
