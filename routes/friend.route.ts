import { Router } from "oak";
import { createUserParser, userParser, Users } from "../models/user.model.ts";
import { ObjectId } from "mongo";
import { z } from "zod";
import { friendshipParser, Friendships } from "../models/friendship.model.ts";

export const friendsRouter = new Router();

friendsRouter.get("/", async (ctx) => {
  const friends = await Friendships.find().toArray();
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
    const res = await Friendships.updateOne(
      { _id: new ObjectId(ctx.params.id) },
      { $set: body }
    );
    ctx.response.body = res;
  }
});

friendsRouter.post("/addfriendship/:id", async (ctx) => {
  const res = await Friendships.updateOne(
    { _id: new ObjectId(ctx.params.id) },
    { $inc: { friendship: 1 } }
  );
  ctx.response.body = res;
});
