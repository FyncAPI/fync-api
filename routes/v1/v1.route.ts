import { Router } from "oak/mod.ts";
import { authorize } from "@/middleware/authorize.ts";
import { scopes } from "@/utils/scope.ts";
import { UserSchema, Users } from "@/models/user.model.ts";
import { matchId, populateArray } from "@/utils/db.ts";
import { Friendships } from "@/models/friendship.model.ts";
import { ObjectId } from "mongo";
import { validateAddFriendRequest } from "@/utils/friend.ts";
import { populateByIds } from "@/db.ts";
import { queryTranslator } from "@/utils/user.ts";
import { v1 } from "std/uuid/mod.ts";

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
  const userId = new ObjectId(ctx.state.token.userId);
  // ctx.response.body = ctx.state.token;
  const user = await Users.findOne({ _id: userId });

  if (!user) {
    ctx.response.status = 404;
    ctx.response.body = { message: "User not found" };
    return;
  }

  ctx.response.body = user;
});

v1Router.get("/users/:id", authorize(scopes.read.profile), async (ctx) => {
  console.log(ctx.state.token);
  const stages = queryTranslator(ctx.request.url.searchParams);
  const user = await Users.aggregate([
    {
      $match: {
        _id: new ObjectId(ctx.params.id),
      },
    },
    ...stages,
    {
      $project: {
        password: 0,
      },
    },
  ]).toArray();

  if (!user[0]) {
    ctx.response.status = 404;
    console.log("user not found");
    ctx.response.body = { message: "User not found" };
    return;
  }
  console.log(user[0]);

  ctx.response.body = user[0];
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

v1Router.get(
  "/friend-requests/@me/in",
  authorize(scopes.read.friends),
  async (ctx) => {
    const userId = new ObjectId(ctx.state.token.userId);
    try {
      const users = await Users.aggregate([
        {
          $match: { _id: userId },
        },
        ...populateByIds("users", "inwardFriendRequests"),
      ]).toArray();
      console.log(users, "inwardadsfdssdf");

      if (users.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { message: "User not found" };
        return;
      }
      ctx.response.body = {
        success: true,
        data: (users[0] as UserSchema).inwardFriendRequests,
      };
    } catch (e) {
      console.log(e, "error incomingsjfads");
      ctx.response.status = 400;
      ctx.response.body = { message: "Invalid user ID", error: e };
    }
  }
);

// v1Router.get(
//   "/friend-requests/@me/out",
//   authorize(scopes.read.friends),
//   async (ctx) => {
//     const userId = new ObjectId(ctx.state.token.userId);
//     try {
//       const users = await Users.aggregate([
//         {
//           $match: { _id: userId },
//         },
//         ...populateByIds("users", "outwardFriendRequests"),
//       ]).toArray();
//       console.log(users, "outwardx");

//       if (users.length === 0) {
//         ctx.response.status = 404;
//         ctx.response.body = { message: "User not found" };
//         return;
//       }

//       const friendRequests = (users[0] as UserSchema).outwardFriendRequests;

//       ctx.response.body = friendRequests || [];
//     } catch (e) {
//       console.log(e);
//       ctx.response.status = 400;
//       ctx.response.body = { message: "Invalid user ID" };
//     }
//   }
// );
v1Router.get(
  "/friend-requests/@me",
  authorize(scopes.read.friends),
  async (ctx) => {
    const userId = new ObjectId(ctx.state.token.userId);
    try {
      const users = await Users.aggregate([
        {
          $match: { _id: userId },
        },
        ...populateByIds("users", "outwardFriendRequests"),
        ...populateByIds("users", "inwardFriendRequests"),
      ]).toArray();
      console.log(users, "uus");

      if (users.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { message: "User not found" };
        return;
      }

      const outwards = (users[0] as UserSchema).outwardFriendRequests;
      const inwards = (users[0] as UserSchema).inwardFriendRequests;
      console.log(outwards, inwards, "outwardx");

      ctx.response.body = {
        outwardFriendRequests: outwards,
        inwardFriendRequests: inwards,
      };
    } catch (e) {
      console.log(e);
      ctx.response.status = 400;
      ctx.response.body = { message: "Invalid user ID" };
    }
  }
);

v1Router.get("/friends/@me", authorize(scopes.read.friends), async (ctx) => {
  const friendRequests =
    ctx.request.url.searchParams.get("friendRequests") === "true";

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

    console.log(users[0]?.friends, "fr");

    ctx.response.body = {
      success: true,
      data: (users[0] as UserSchema)?.friends || [],
    };
  } catch (e) {
    console.log(e);
    ctx.response.status = 400;
    ctx.response.body = { error: "invalid user id" };
  }
});
v1Router.post(
  "/accept-friend/:id",
  authorize(scopes.write.friends),
  async (ctx) => {
    // ctx.response.status = 208;
    // ctx.response.body = { message: "accept friend" };
    // return;
    try {
      const friendId = new ObjectId(ctx.params.id);
      const userId = new ObjectId(ctx.state.token.userId);

      console.log(userId, friendId, "user accept friend");
      const user = await Users.findOne({ _id: userId });
      console.log(user, "user accept friend");

      if (!user) {
        ctx.response.body = { message: "invalid user id" };
        return;
      }

      if (!user.inwardFriendRequests?.find((id) => friendId.equals(id))) {
        ctx.response.body = {
          message: "user has no friend request from this friend",
        };
        return;
      }

      const friend = await Users.findOne({
        _id: friendId,
      });

      if (!friend) {
        ctx.response.body = { message: "invalid friend id" };
        return;
      }

      if (!friend.outwardFriendRequests?.find((id) => userId.equals(id))) {
        ctx.response.body = { message: "invalid friend id" };
        return;
      }

      // Create friendship document
      const friendship = await Friendships.insertOne({
        accepter: user._id,
        adder: friend._id,
        friendship: 0,
        images: [],
        videos: [],

        createdAt: new Date(),
      });

      // Update user and friend documents
      await Users.updateOne(
        { _id: userId },
        {
          $pull: { outwardFriendRequests: friendId },
          $addToSet: {
            friends: {
              user: friend._id,
              friendship: friendship,
            },
          },
        }
      );

      await Users.updateOne(
        { _id: friend._id },
        {
          $pull: { inwardFriendRequests: user._id },
          $addToSet: { friends: { user: user._id, friendship: friendship } },
        }
      );

      ctx.response.body = {
        success: true,
        message: "friend request accepted",
        data: {
          friendship: friendship,
        },
      };
    } catch (e) {
      console.log(e);
      ctx.response.status = 400;
      ctx.response.body = { message: "invalid user id", error: e };
    }
  }
);
v1Router.post(
  "/:id/decline-friend",
  authorize(scopes.write.friends),
  async (ctx) => {
    try {
      const friendId = new ObjectId(ctx.params.id);
      const userId = new ObjectId(ctx.state.token.userId);

      const user = await Users.findOne({ _id: userId });

      if (!user) {
        ctx.response.body = { message: "invalid user id" };
        return;
      }

      const friend = await Users.findOne({
        _id: friendId,
      });

      if (!friend) {
        ctx.response.body = { message: "invalid friend id" };
        return;
      }

      // Remove friend from user's inwardFriendRequests
      await Users.updateOne(
        { _id: user._id },
        {
          $pull: { inwardFriendRequests: friend._id },
          $addToSet: { declinedFriendRequests: user._id },
        }
      );

      await Users.updateOne(
        { _id: friend._id },
        {
          $pull: { outwardFriendRequests: user._id },
        }
      );

      ctx.response.body = {
        success: true,
        message: "friend request declined",
      };
    } catch (e) {
      console.log(e);
      ctx.response.body = { message: "invalid user id" };
    }
  }
);
v1Router.post(
  "/:id/cancel-friend",
  authorize(scopes.write.friends),
  async (ctx) => {
    try {
      const friendId = new ObjectId(ctx.params.id);
      const userId = new ObjectId(ctx.state.token.userId);

      const user = await Users.findOne({ _id: userId });

      if (!user) {
        ctx.response.body = { message: "invalid user id" };
        return;
      }

      const friend = await Users.findOne({
        _id: friendId,
      });

      if (!friend) {
        ctx.response.body = { message: "invalid friend id" };
        return;
      }

      // Remove friend from user's outwardFriendRequests
      await Users.updateOne(
        { _id: user._id },
        { $pull: { outwardFriendRequests: friend._id } }
      );

      await Users.updateOne(
        { _id: friend._id },
        {
          $pull: { inwardFriendRequests: user._id },
        }
      );

      ctx.response.body = {
        success: true,
        message: "friend request canceled",
      };
    } catch (e) {
      console.log(e);
      ctx.response.body = { message: "invalid user id" };
    }
  }
);
