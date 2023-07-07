import { Router } from "oak";
import { createUserParser, userParser, Users } from "../models/user.model.ts";
import { ObjectId } from "mongo";
import { z } from "zod";
import { FriendRequests } from "../models/friendRequest.model.ts";
import { friendParser, Friends } from "../models/friend.model.ts";

export const friendsRouter = new Router();

friendsRouter.get("/", async (ctx) => {
  const friends = await Friends.find().toArray();
  ctx.response.body = friends || [];
});

friendsRouter.put("/:id", async (ctx) => {
  const body = await ctx.request.body({ type: "json" }).value;
  const res = friendParser.partial().safeParse(body);

  if (!res.success) {
    const error = res.error.flatten();

    ctx.response.body = {
      error: error.fieldErrors,
    };
    ctx.response.status = 400;
  } else {
    const res = await Friends.updateOne(
      { _id: new ObjectId(ctx.params.id) },
      { $set: body }
    );
    ctx.response.body = res;
  }
});

friendsRouter.post("/addfriendship/:id", async (ctx) => {
  const res = await Friends.updateOne(
    { _id: new ObjectId(ctx.params.id) },
    { $inc: { friendship: 1 } }
  );
  ctx.response.body = res;
});
friendsRouter.post("/addfriendship/:id/:count", async (ctx) => {
  if (!ctx.params.count) {
    ctx.response.body = {
      error: "No count provided",
    };
    return;
  }

  if (isNaN(parseInt(ctx.params.count))) {
    ctx.response.body = {
      error: "Count is not a number",
    };
    return;
  }
  const res = await Friends.updateOne(
    { _id: new ObjectId(ctx.params.id) },
    { $inc: { friendship: parseInt(ctx.params.count) } }
  );
  ctx.response.body = res;

  return;
});
