import { Router } from "oak/mod.ts";
import { authorize } from "@/middleware/authorize.ts";
import { scopes } from "@/utils/scope.ts";
import { UserSchema, Users } from "@/models/user.model.ts";
import { matchId, populateArray } from "@/utils/db.ts";
import { Friendships } from "@/models/friendship.model.ts";
import { ObjectId } from "mongo";
import { validateAddFriendRequest } from "@/utils/friend.ts";

export const v1Router = new Router();

// get my profile
// get my friends
// get my friend requests
// get my friend requests sent
// get my friend requests received
// get my friend requests declined
// add friend
// remove friend
// accept friend request
// decline friend request
// cancel friend request
// get friend requests

// get my apps
// show apps data

v1Router.get("/users/@me", authorize(scopes.read.profile), async (ctx) => {
  console.log(ctx.state.token);
  // ctx.response.body = ctx.state.token;
  const user = await Users.findOne({ _id: ctx.state.token.userId });

  if (!user) {
    ctx.response.status = 404;
    ctx.response.body = { message: "User not found" };
    return;
  }

  ctx.response.body = user;
});

v1Router.get("/users/:id", authorize(scopes.read.profile), async (ctx) => {
  console.log(ctx.state.token);
  // ctx.response.body = ctx.state.token;
  const user = await Users.findOne({ _id: new ObjectId(ctx.params.id) });

  if (!user) {
    ctx.response.status = 404;
    console.log("user not found");
    ctx.response.body = { message: "User not found" };
    return;
  }

  ctx.response.body = user;
});
v1Router.get("/friends/@me", authorize(scopes.read.friends), async (ctx) => {
  try {
    console.log(ctx.state.token.userId);
    const users = await Users.aggregate([
      {
        $match: { _id: new ObjectId(ctx.state.token.userId) },
      },
      {
        $unwind: "$friends",
      },
      {
        $lookup: {
          from: "friendships",
          localField: "friends.friendship",
          foreignField: "_id",
          as: "friends.friendship",
        },
      },
      {
        $unwind: "$friends.friendship",
      },
      {
        $lookup: {
          from: "users",
          localField: "friends.user",
          foreignField: "_id",
          as: "friends.user",
        },
      },
      {
        $unwind: "$friends.user",
      },
      {
        $group: {
          _id: "$_id",
          // Include any other fields from the users document you need in your final output
          friends: {
            $push: "$friends",
          },
        },
      },
    ]).toArray();

    console.log(users[0]);

    ctx.response.body = {
      success: true,
      data: (users[0] as UserSchema).friends || [],
    };
  } catch (e) {
    console.log(e);
    ctx.response.status = 400;
    ctx.response.body = { error: "invalid user id" };
  }
});
v1Router.get("/users", async (ctx) => {
  const search = ctx.request.url.searchParams.get("q");

  const users = await Users.find(
    search
      ? {
          $or: [
            { username: { $regex: search, $options: "i" } }, // 'i' for case-insensitive
            { name: { $regex: search, $options: "i" } },
          ],
        }
      : {},
    {
      projection: { password: 0 },
    }
  ).toArray();
  ctx.response.body = users || [];
});

v1Router.post(
  "/users/:id/add-friend",
  authorize(scopes.write.friends),
  async (ctx) => {
    const userId = new ObjectId(ctx.state.token.userId);
    try {
      const friendId = ctx.params.id;
      const user = await Users.findOne({ _id: userId });

      const { valid, message } = validateAddFriendRequest(user, friendId);

      if (!valid) {
        ctx.response.status = 400;
        ctx.response.body = { message };
        return;
      }

      const friend = await Users.findOne({
        _id: new ObjectId(friendId),
      });

      if (!friend) {
        ctx.response.status = 404;
        ctx.response.body = { message: "friend not found" };
        return;
      }

      // update the user.outwardFriendRequests to push the friend id
      await Users.updateOne(
        { _id: userId },
        {
          $addToSet: {
            outwardFriendRequests: new ObjectId(friendId),
          },
        }
      );

      await Users.updateOne(
        { _id: new ObjectId(friendId) },
        {
          $addToSet: {
            inwardFriendRequests: user!._id,
          },
        }
      );

      ctx.response.body = {
        success: true,
        message: "friend request sent",
      };
    } catch (e) {
      console.log(e);
      ctx.response.body = { message: "invalid user id" };
    }
  }
);
