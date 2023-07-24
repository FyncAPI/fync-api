import { Router } from "oak";
import { createUserParser, userParser, Users } from "../models/user.model.ts";
import { ObjectId } from "mongo";
import { friendshipParser, Friendships } from "../models/friendship.model.ts";
import { populateById } from "@/db.ts";

export const friendshipRouter = new Router();

friendshipRouter.get("/", async (ctx) => {
  // check params if aggregate users
  const pop = ctx.request.url.searchParams.get("populate");
  const friends = await Friendships.find().toArray();
  ctx.response.body = friends || [];
});

friendshipRouter.get("/:id", async (ctx) => {
  const friend = await Friendships.aggregate([
    {
      $match: { _id: new ObjectId(ctx.params.id) },
    },
    ...populateById("users", "adder"),
    ...populateById("users", "accepter"),
  ]).toArray();
  console.log(friend, ctx.params.id, "friendship");

  ctx.response.body = friend;
});

friendshipRouter.put("/:id", async (ctx) => {
  const body = await ctx.request.body({ type: "json" }).value;
  const res = friendshipParser.partial().safeParse(body);

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

friendshipRouter.post("/addfriendship/:id", async (ctx) => {
  const res = await Friendships.updateOne(
    { _id: new ObjectId(ctx.params.id) },
    { $inc: { friendship: 1 } }
  );
  ctx.response.body = res;
});
