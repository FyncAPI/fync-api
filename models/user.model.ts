import { ObjectId } from "mongo";
import { db } from "../db.ts";
import { z } from "zod";
import { friendParser } from "./friend.model.ts";

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
  provider: z.array(z.enum(["google", "facebook", "email"])).optional(),

  username: z.string(),
  name: z.string(),
  avatar: z.string().optional(),
  age: z.number().optional(),

  profilePicture: z.string().optional(),

  friends: z.array(friendParser),
  email: z.string(),
  password: z.string().optional(),
  verified: z.boolean(),
  createdAt: z.date(),

  phoneNumber: z.string().optional(),
  birthdate: z.string().optional(),

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

export const createEmailUserParser = z.object({
  username: z.string(),
  name: z.string(),
  email: z.string(),
  password: z.string(),
  profilePicture: z.string().optional(),
  avatar: z.string().optional(),
  birthday: z.string().optional(),
});

export const createGuestUser = userParser.pick({
  username: true,
  name: true,
  email: true,
  age: true,
  phoneNumber: true,

  profilePicture: true,
  avatar: true,
  birthday: true,
});

// export const guestUserParser = userParser.omit({});

// export type GuestUserSchema = z.infer<typeof guestUserParser>;

export const Users = db.collection<UserSchema>("users");
