import { Router } from "oak";
import { createUserParser, userParser, Users } from "../models/user.model.ts";
import { ObjectId } from "mongo";
import { z } from "zod";
import { FriendRequests } from "../models/friendRequest.model.ts";
import { Friends } from "../models/friend.model.ts";

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
      const user = await Users.findOne({ _id: new ObjectId(ctx.params.id) });
      ctx.response.body = user?.friends || [];
    } catch (e) {
      console.log(e);
      ctx.response.body = { message: "invalid user id" };
    }
  })
  .post("/:id/add-friend", async (ctx) => {
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

      const friendRequest = await FriendRequests.findOne({
        adder: user._id,
        accepter: friend._id,
      });

      if (friendRequest) {
        ctx.response.body = { message: "friend request already exists" };
        return;
      }

      const newFriendRequest = await FriendRequests.insertOne({
        adder: user._id,
        accepter: friend._id,
        status: "pending",
        createdAt: new Date(),
      });

      if (!newFriendRequest) {
        ctx.response.body = { message: "error creating friend request" };
        return;
      }
      // update user and friend to have the new friend request
      await Users.updateMany(
        { $or: [{ _id: user._id }, { _id: friend._id }] },
        {
          $push: {
            friendRequests: newFriendRequest,
          },
        }
      );

      ctx.response.body = newFriendRequest;
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

      const friendRequest = await FriendRequests.findOne({
        adder: friend._id,
        accepter: user._id,
      });

      if (!friendRequest) {
        ctx.response.body = { message: "friend request does not exist" };
        return;
      }

      if (friendRequest.status !== "pending") {
        ctx.response.body = { message: "friend request is not pending" };
        return;
      }

      await FriendRequests.updateOne(
        { _id: friendRequest._id },
        { $set: { status: "accepted" } }
      );

      const friendship = await Friends.insertOne({
        adder: user._id,
        accepter: friend._id,

        createdAt: new Date(),
        friendship: 0,
        images: [],
        videos: [],
      });

      await Users.updateMany(
        { $or: [{ _id: user._id }, { _id: friend._id }] },
        {
          $push: {
            friends: friendship,
          },
        }
      );

      ctx.response.body = friendRequest;
    } catch (e) {
      console.log(e);
      ctx.response.body = { message: "invalid user id" };
    }
  });
