import { ObjectId } from "mongo";
import { db } from "../db.ts";
import { z } from "zod";
import { FriendParser } from "./friend.model.ts";

// export interface UserSchema {
//   _id: ObjectId;
//   username: string;
//   name: string;
//   avatar: string;
//   profilePicture: string;
//   friends: ObjectId[];
//   email: string;
//   verified?: boolean;
//   createdAt: Date;
// }

export const userParser = z.object({
  _id: z.instanceof(ObjectId),
  username: z.string(),
  name: z.string(),
  avatar: z.string(),
  profilePicture: z.string(),

  friends: z.array(FriendParser),
  email: z.string(),
  verified: z.boolean(),
  createdAt: z.date(),

  apps: z.array(
    z.object({
      appId: z.instanceof(ObjectId),
      appUserId: z.instanceof(ObjectId),
    })
  ),
});

export type UserSchema = z.infer<typeof userParser>;

export const createUserParser = userParser.omit({
  _id: true,
  verified: true,
  createdAt: true,
});

export const Users = db.collection<UserSchema>("users");
