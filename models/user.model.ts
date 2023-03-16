import { ObjectId } from "mongo";
import { db } from "../db.ts";
import { z } from "zod";

export interface UserSchema {
  _id: ObjectId;
  username: string;
  avatar: string;
  profilePicture: string;
  friends: ObjectId[];
  email: string;
  verified?: boolean;
  createdAt: Date;
}

export const userParser = z.object({
  _id: z.string() || z.instanceof(ObjectId),
  username: z.string(),
  avatar: z.string(),
  profilePicture: z.string(),
  friends: z.array(z.string() || z.instanceof(ObjectId)),
  email: z.string(),
  verified: z.boolean(),
  createdAt: z.date(),
});

export const createUserParser = z.object({
  username: z.string(),
  avatar: z.string().optional(),
  profilePicture: z.string(),
  email: z.string(),
});

export const Users = db.collection<UserSchema>("users");
