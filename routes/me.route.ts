import { Router } from "oak/mod.ts";
import { authorize } from "@/middleware/authorize.ts";
import { scopes } from "@/utils/scope.ts";
import { Users } from "@/models/user.model.ts";
import { matchId, populateArray } from "@/utils/db.ts";

export const meRouter = new Router();

meRouter
  .get("/profile", authorize(scopes.read.profile), async (ctx) => {
    console.log(ctx.state.token);
    // ctx.response.body = ctx.state.token;
    const user = await Users.findOne({ _id: ctx.state.token.userId });

    if (!user) {
      ctx.response.status = 404;
      ctx.response.body = { message: "User not found" };
      return;
    }

    ctx.response.body = user;
  })
  .get("/friends", authorize(scopes.read.friends), async (ctx) => {
    const friends = await Users.aggregate([
      ...matchId(ctx.state.token.userId),
      ...populateArray("users", "friends.user", "_id", "friends"),
      ...populateArray("friendships", "friends.friendship", "_id", "friends"),
    ]).toArray();
  });
