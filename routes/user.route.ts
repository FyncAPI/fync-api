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
import { Friendships, FriendshipSchema } from "../models/friendship.model.ts";
import { populateById, populateByIds } from "../db.ts";
import { validateAddFriendRequest } from "../utils/friend.ts";
import { queryTranslator } from "../utils/user.ts";

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
    const stages = queryTranslator(ctx.request.url.searchParams);
    const user = await Users.aggregate([
      {
        $match: {
          _id: new ObjectId(ctx.params.id),
        },
      },
      ...stages,
    ]).toArray();

    // const user = await Users.findOne({ _id: new ObjectId(ctx.params.id) });
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
        data: (users[0] as UserSchema).friends,
      };
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
    /**
     * 1. check if the user exists
     * 2. create friendship document
     * 3. remove the friend from the user's outwardFriendRequests
     * 4. add the friend to the user's friends
     * 5. remove the user from the friend's inwardFriendRequests
     * 6. add the user to the friend's friends
     */
    try {
      const body = await ctx.request.body({ type: "json" }).value;
      const friendId = new ObjectId(body.friendId);

      const user = await Users.findOne({ _id: new ObjectId(ctx.params.id) });
      console.log(user, "user accept friend");

      if (!user) {
        ctx.response.body = { message: "invalid user id" };
        return;
      }

      if (!user.inwardFriendRequests?.find((id) => id.equals(friendId))) {
        console.log(
          user.inwardFriendRequests?.find((id) => id.equals(friendId))
        );
        ctx.response.body = {
          message: "user has no friend request from this friend",
        };
        return;
      }

      const friend = await Users.findOne({
        _id: new ObjectId(body.friendId),
      });

      if (!friend) {
        ctx.response.body = { message: "invalid friend id" };
        return;
      }

      if (!friend.outwardFriendRequests?.find((id) => id.equals(user._id))) {
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
        { _id: user._id },
        {
          $pull: { outwardFriendRequests: friend._id },
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
  })
  .post("/:id/decline-friend", async (ctx) => {
    /**
     * 1. check if the user exists
     * 2. remove the friend from the user's inwardFriendRequests
     */
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

      // Remove friend from user's inwardFriendRequests
      await Users.updateOne(
        { _id: user._id },
        { $pull: { inwardFriendRequests: friend._id } }
      );

      await Users.updateOne(
        { _id: friend._id },
        {
          $pull: { outwardFriendRequests: user._id },
          $addToSet: { declinedFriendRequests: user._id },
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
  })
  .post("/:id/remove-friend", async (ctx) => {
    try {
      const id = ctx.params.id;
      const body = await ctx.request.body({ type: "json" }).value;

      const friendId = body.friendId;

      const friendship = await Friendships.findOne({
        $or: [
          { adder: new ObjectId(id), accepter: new ObjectId(friendId) },
          { adder: new ObjectId(friendId), accepter: new ObjectId(id) },
        ],
      });

      if (!friendship || friendship.removed) {
        ctx.response.body = { message: "friendship does not exist" };
        return;
      }

      const updatedFriendship = await Friendships.updateOne(
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
