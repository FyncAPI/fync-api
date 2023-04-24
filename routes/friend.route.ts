import { Router } from "oak";
import { createUserParser, userParser, Users } from "../models/user.model.ts";
import { ObjectId } from "mongo";
import { z } from "zod";
import { FriendRequests } from "../models/friendRequest.model.ts";
import { Friends } from "../models/friend.model.ts";

export const friendsRouter = new Router();

friendsRouter.get("/", async (ctx) => {
  const friends = await Friends.find().toArray();
  ctx.response.body = friends || [];
});
