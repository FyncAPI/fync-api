import { Router } from "oak";
import { createUserParser, userParser, Users } from "../models/user.model.ts";
import { ObjectId } from "mongo";
import { z } from "zod";
import { FriendRequests } from "../models/friendRequest.model.ts";
import { Friends, FriendSchema } from "../models/friend.model.ts";
import { populateById, populateByIds } from "../db.ts";

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
      ]).toArray();
      const friends = (users[0]?.friends as FriendSchema[]).map(
        async (fs: FriendSchema) => {
          const friendId =
            (fs.accepter as string) === ctx.params.id
              ? fs.requester
              : fs.accepter;
          console.log(friendId, "fried");
          const friend = await Users.findOne({ _id: new ObjectId(friendId) });
          return friend;
        }
      );
      console.log(friends);
      ctx.response.body = users[0].friends || [];
    } catch (e) {
      console.log(e);
      ctx.response.body = { message: "invalid user id" };
    }
  })
  .get("/:id/friend-requests", async (ctx) => {
    try {
      const users = await Users.aggregate([
        {
          $match: { _id: new ObjectId(ctx.params.id) },
        },
        ...populateByIds("friendRequests", "friendRequests"),
      ]).toArray();

      console.log(users[0]);
      ctx.response.body = users[0].friendRequests;
    } catch (e) {
      console.log(e);
      ctx.response.body = { message: "invalid user id" };
    }
  })
  .post("/:id/add-friend", async (ctx) => {
    try {
      const body = await ctx.request.body({ type: "json" }).value;
      console.log(ctx.params.id, body.friendId);

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
      console.log(body, "bd'n'-'/n/n/n");

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

      ctx.response.body = friendship;
    } catch (e) {
      console.log(e);
      ctx.response.body = { message: "invalid user id" };
    }
  })
  .post("/:id/reject-friend", async (ctx) => {
    try {
      const body = await ctx.request.body({ type: "json" }).value;
      console.log(body, "bd'n'-'/n/n/n");

      const userId = ctx.params.id;
      const friendRequestId = body.friendRequestId;

      //
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
