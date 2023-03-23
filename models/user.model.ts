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
  googleId: z.string().optional(),

  username: z.string(),
  name: z.string(),
  avatar: z.string().optional(),

  profilePicture: z.string().optional(),

  friends: z.array(FriendParser),
  email: z.string(),
  verified: z.boolean(),
  createdAt: z.date(),

  phoneNumber: z.string().optional(),
  birthday: z.string().optional(),

  apps: z.array(z.instanceof(ObjectId)),
  appUsers: z.instanceof(ObjectId).array(),
});

export type UserSchema = z.infer<typeof userParser>;

export const createUserParser = userParser.omit({
  _id: true,
  verified: true,
  createdAt: true,
  friends: true,
  apps: true,
});

export const createGuestUser = userParser.omit({
  _id: true,
  verified: true,
  createdAt: true,
  googleId: true,
  friends: true,
  apps: true,
  appUsers: true,
  avatar: true,
  profilePicture: true,
});

// export const guestUserParser = userParser.omit({});

// export type GuestUserSchema = z.infer<typeof guestUserParser>;

export const Users = db.collection<UserSchema>("users");
