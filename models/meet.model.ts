import { ObjectId } from "mongo";
import { z } from "zod";
import { db } from "@/db.ts";

export type MeetSchema = z.infer<typeof meetParser>;

// also updte the frontend
export const meetParser = z.object({
  _id: z.instanceof(ObjectId).or(z.string()),
  userId: z.instanceof(ObjectId).or(z.string()),
  title: z.string(),
  description: z.string(),

  meetTime: z.date(),
  meetType: z.string(),
  meetTags: z.array(z.string()),
  meetImages: z.array(z.string()),
  meetMaxUser: z.number(),
  meetPublicType: z.enum(["friend", "friend of friend", "all"]),
  meetUsers: z.array(z.instanceof(ObjectId).or(z.string())),

  reactionEmoji: z.object({
    like: z.array(z.instanceof(ObjectId).or(z.string())),
    love: z.array(z.instanceof(ObjectId).or(z.string())),
    smile: z.array(z.instanceof(ObjectId).or(z.string())),
    sad: z.array(z.instanceof(ObjectId).or(z.string())),
    angry: z.array(z.instanceof(ObjectId).or(z.string())),
  }),

  createdAt: z.date(),
});

export const Meets = db.collection<MeetSchema>("meets");
