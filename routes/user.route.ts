import { Router } from "oak";
import {
  createUserParser,
  userParser,
  Users,
  UserSchema,
} from "../models/user.model.ts";
import { ObjectId } from "mongo";
import { z } from "zod";
// import { FriendRequests } from "../models/friendRequest.model.ts";
import { Friends, FriendshipSchema } from "../models/friendship.model.ts";
import { populateById, populateByIds } from "../db.ts";
import { validateAddFriendRequest } from "../utils/friend.ts";

export const usersRouter = new Router();

usersRouter.use(async (ctx, next) => {
  console.log(ctx.request.headers);
  await next();
  /* Do some cool logging stuff here */
});
usersRouter
  .get("/", async (ctx) => {
    const users = await Users.find().toArray();
    ctx.response.body = users || [];
  })
  .get("/:id", async (ctx) => {
    const user = await Users.findOne({ _id: new ObjectId(ctx.params.id) });
    ctx.response.body = user;
  })
  .get("/name/:name", async (ctx) => {
    if (!ctx.params.name) {
      ctx.response.body = {
        error: "No name provided",
      };
      return;
    }
    const user = await Users.findOne({ name: ctx.params.name });
    ctx.response.body = user;
  })
  .get("/username/:username", async (ctx) => {
    if (!ctx.params.username) {
      ctx.response.body = {
        error: "No username provided",
      };
      return;
    }
    const user = await Users.findOne({ username: ctx.params.username });
    ctx.response.body = user;
  })
  .post("/", async (ctx) => {
    const body = await ctx.request.body({ type: "json" }).value;

    const result = createUserParser.safeParse(body);
    // console.log(body instanceof UserSchema);

    if (!result.success) {
      const error = result.error.format();
      ctx.response.body = error;
    } else {
      const user = await Users.insertOne({
        ...body,
        friends: [],
        verified: false,
        createdAt: new Date(),
      });
      ctx.response.body = user;
    }
  })
  .put("/:id", async (ctx) => {
    const body = await ctx.request.body({ type: "json" }).value;
    const result = userParser.partial().safeParse(body);

    if (!result.success) {
      const error = result.error.format();

      ctx.response.body = error;
    } else {
      const user = await Users.updateOne(
        { _id: new ObjectId(ctx.params.id) },
        { $set: body }
      );
      ctx.response.body = user;
    }
  })
  .delete("/:id", async (ctx) => {
    const user = await Users.deleteOne({ _id: new ObjectId(ctx.params.id) });
    ctx.response.body = user;
  });

usersRouter
  .get("/:id/friends", async (ctx) => {
    try {
      const users = await Users.aggregate([
        {
          $match: { _id: new ObjectId(ctx.params.id) },
        },
        ...populateByIds("friends", "friends"),
        // ...populateById("users", "friends.accepter"),
        {
          $lookup: {
            from: "users",
            localField: "friends.accepter",
            foreignField: "_id",
            as: "friends.accepter",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "friends.adder",
            foreignField: "_id",
            as: "friends.adder",
          },
        },
      ]).toArray();
      console.log(users[0]);

      const user = userParser.parse(users[0]);
      console.log(user, "user with friends");
      // const friends = user.friends.map((friend) => {
      //   return friendObjects.find(
      //     (friendObject) =>
      //       friendObject._id.equals(friend.accepter) ||
      //       friendObject._id.equals(friend.requester)
      //   );
      // });

      ctx.response.body = []; //|| friends || [];
    } catch (e) {
      console.log(e);
      ctx.response.body = { message: "invalid user id" };
    }
  })
  .get("/:id/friend-requests/in", async (ctx) => {
    try {
      const users = await Users.aggregate([
        {
          $match: { _id: new ObjectId(ctx.params.id) },
        },
        ...populateByIds("inwardFriendRequests", "users"),
      ]).toArray();

      if (users.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { message: "User not found" };
        return;
      }

      const friends = z
        .array(userParser)
        .parse((users[0] as UserSchema).inwardFriendRequests);

      ctx.response.body = friends || [];
    } catch (e) {
      console.log(e);
      ctx.response.status = 400;
      ctx.response.body = { message: "Invalid user ID" };
    }
  })
  .get("/:id/friend-requests/out", async (ctx) => {
    try {
      const users = await Users.aggregate([
        {
          $match: { _id: new ObjectId(ctx.params.id) },
        },
        ...populateByIds("outwardFriendRequests", "users"),
      ]).toArray();

      if (users.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { message: "User not found" };
        return;
      }

      const friendRequests = (users[0] as UserSchema).outwardFriendRequests;

      ctx.response.body = friendRequests || [];
    } catch (e) {
      console.log(e);
      ctx.response.status = 400;
      ctx.response.body = { message: "Invalid user ID" };
    }
  })
  .get("/:id/friend-requests/declined", async (ctx) => {
    try {
      const users = await Users.aggregate([
        {
          $match: { _id: new ObjectId(ctx.params.id) },
        },
        ...populateByIds("declinedFriendRequests", "users"),
      ]).toArray();

      if (users.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { message: "User not found" };
        return;
      }

      const friends = z
        .array(userParser)
        .parse((users[0] as UserSchema).declinedFriendRequests);

      ctx.response.body = friends || [];
    } catch (e) {
      console.log(e);
      ctx.response.status = 400;
      ctx.response.body = { message: "Invalid user ID" };
    }
  })
  .get("/:id/friend-requests/canceled", async (ctx) => {
    try {
      const users = await Users.aggregate([
        {
          $match: { _id: new ObjectId(ctx.params.id) },
        },
        ...populateByIds("canceledFriendRequests", "users"),
      ]).toArray();

      if (users.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { message: "User not found" };
        return;
      }

      const friends = z
        .array(userParser)
        .parse((users[0] as UserSchema).canceledFriendRequests);

      ctx.response.body = friends || [];
    } catch (e) {
      console.log(e);
      ctx.response.status = 400;
      ctx.response.body = { message: "Invalid user ID" };
    }
  })
  .post("/:id/add-friend", async (ctx) => {
    try {
      const body = await ctx.request.body({ type: "json" }).value;
      console.log(ctx.params.id, body.friendId);

      const user = await Users.findOne({ _id: new ObjectId(ctx.params.id) });
      console.log(user, body.friendId == ctx.params.id);

      const { valid, message } = validateAddFriendRequest(user, body.friendId);

      if (!valid) {
        ctx.response.status = 400;
        ctx.response.body = { message };
        return;
      }

      const friend = await Users.findOne({
        _id: new ObjectId(body.friendId),
      });

      if (!friend) {
        ctx.response.status = 404;
        ctx.response.body = { message: "friend not found" };
        return;
      }

      // update the user.outwardFriendRequests to push the friend id
      await Users.updateOne(
        { _id: new ObjectId(ctx.params.id) },
        {
          $push: {
            outwardFriendRequests: {
              $each: [friend._id],
            },
          },
        }
      );

      await Users.updateOne(
        { _id: new ObjectId(body.friendId) },
        {
          $push: {
            inwardFriendRequests: {
              $each: [user!._id],
            },
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
  })
  .post("/:id/accept-friend", async (ctx) => {
    try {
      const body = await ctx.request.body({ type: "json" }).value;

      const user = await Users.findOne({ _id: new ObjectId(ctx.params.id) });

      if (!user) {
        ctx.response.body = { message: "invalid user id" };
        return;
      }
      const friend = await Users.findOne({
        _id: new ObjectId(body.friendId),
      });

      if (!friend) {
        ctx.response.body = { message: "invalid friend id" };
        return;
      }

      // const friendRequest = await FriendRequests.findOne({
      //   adder: friend._id,
      //   accepter: user._id,
      // });

      // if (!friendRequest) {
      //   ctx.response.body = { message: "friend request does not exist" };
      //   return;
      // }

      // if (friendRequest.status !== "pending") {
      //   ctx.response.body = { message: "friend request is not pending" };
      //   return;
      // }

      // await FriendRequests.updateOne(
      //   { _id: friendRequest._id },
      //   { $set: { status: "accepted" } }
      // );

      // const friendship = await Friends.insertOne({
      //   adder: user._id,
      //   accepter: friend._id,

      //   createdAt: new Date(),
      //   friendship: 0,
      //   images: [],
      //   videos: [],
      // });

      // await Users.updateMany(
      //   { $or: [{ _id: user._id }, { _id: friend._id }] },
      //   {
      //     $push: {
      //       friends: friendship,
      //     },
      //   }
      // );

      ctx.response.body = "wtf";
    } catch (e) {
      console.log(e);
      ctx.response.body = { message: "invalid user id" };
    }
  })
  .post("/:id/decline-friend", async (ctx) => {
    try {
      const body = await ctx.request.body({ type: "json" }).value;
      console.log(body, "bd'n'-'/n/n/n");

      const userId = ctx.params.id;
      const friendId = body.friendId;

      // check if the user exists

      const user = await Users.findOne({ _id: new ObjectId(userId) });
      if (!user) {
        ctx.response.body = { message: "invalid user id" };
        return;
      }

      // check if the friend exists
      if (!user.inwardFriendRequests?.includes(friendId)) {
        ctx.response.body = { message: "invalid friend id" };
        return;
      }
    } catch (e) {
      console.log(e);
      ctx.response.body = { message: "invalid user id" };
    }
  })
  .post("/:id/remove-friend", async (ctx) => {
    try {
      const id = ctx.params.id;
      const body = await ctx.request.body({ type: "json" }).value;

      const friendId = body.friendId;

      const friendship = await Friends.findOne({
        $or: [
          { adder: new ObjectId(id), accepter: new ObjectId(friendId) },
          { adder: new ObjectId(friendId), accepter: new ObjectId(id) },
        ],
      });

      if (!friendship || friendship.removed) {
        ctx.response.body = { message: "friendship does not exist" };
        return;
      }

      const updatedFriendship = await Friends.updateOne(
        {
          $or: [
            { adder: new ObjectId(id), accepter: new ObjectId(friendId) },
            { adder: new ObjectId(friendId), accepter: new ObjectId(id) },
          ],
        },
        { $set: { removed: true } }
      );

      console.log(updatedFriendship, "updatedFriendship");
      console.log(friendship, "friendship", id, friendId);

      if (!updatedFriendship) {
        ctx.response.body = { message: "error removing friend" };
        return;
      }

      await Users.updateMany(
        { $or: [{ _id: new ObjectId(id) }, { _id: new ObjectId(friendId) }] },
        {
          $pull: {
            friends: { _id: friendship._id },
          },
        }
      );

      ctx.response.body = updatedFriendship;
    } catch (e) {
      console.log(e);
      ctx.response.body = { message: "invalid user id" };
    }
  });
