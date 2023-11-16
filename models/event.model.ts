import { ObjectId } from "mongo";
import { db } from "../db.ts";
import { z } from "zod";

export interface EventSchema {
  _id: ObjectId;
  name: string;
  type: "IRL" | "APP";
  tags: string[];
  description: string;
  mapsLink: string;
  date: Date;
  location: string;
  images: string[];
  videos?: string[];
  markdown: string;
}

export const eventParser = z.object({
  _id: z.instanceof(ObjectId).or(z.string()),
  name: z.string(),
  type: z.enum(["IRL", "APP"]),
  tags: z.array(z.string()),
  description: z.string(),
  mapsLink: z.string(),
  date: z.date(),
  location: z.string(),
  images: z.array(z.string()),
  videos: z.array(z.string()),
  markdown: z.string(),
  interactions: z.array(z.instanceof(ObjectId).or(z.string())),
});

export const Events = db.collection<EventSchema>("events");
