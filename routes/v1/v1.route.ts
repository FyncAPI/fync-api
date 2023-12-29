import { Router } from "oak/mod.ts";
import { authorize } from "@/middleware/authorize.ts";
import { scopes } from "@/utils/scope.ts";
import { UserSchema, Users } from "@/models/user.model.ts";
import { Apps } from "../../models/app.model.ts";
import {
  InteractionSchema,
  Interactions,
  interactionParser,
} from "../../models/interaction.model.ts";
import { MeetSchema, Meets, meetParser } from "../../models/meet.model.ts";
import { matchId, populateArray } from "@/utils/db.ts";
import { Friendships } from "@/models/friendship.model.ts";
import { ObjectId, Filter } from "mongo";
import { validateAddFriendRequest } from "@/utils/friend.ts";
import { populateByIds } from "@/db.ts";
import { queryTranslator } from "@/utils/user.ts";
import { AuthCodes } from "@/models/authCode.model.ts";
import { AppUsers } from "@/models/appUser.model.ts";

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

v1Router.get("/users/@me", authorize(scopes.profile.read), async (ctx) => {
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

v1Router.get("/users/:id", authorize(scopes.profile.read), async (ctx) => {
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
      ? ({
          $or: [
            {
              username: {
                $regex: search,
                $options: "i",
              },
            },
            { name: { $regex: search, $options: "i" } },
          ],
        } as any)
      : {},
    {
      projection: { password: 0 },
    }
  ).toArray();
  ctx.response.body = users || [];
});

v1Router.post("/auth/flow/discord/:cid", async (ctx) => {
  const clientId = ctx.params.cid;
  const body = await ctx.request.body({ type: "json" }).value;
  // email: profile.email,
  // discordId: profile.id,
  // username: profile.username,
  // name: profile.global_name || "",
  // profilePicture:
  //   `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`,

  const app = await Apps.findOne({ clientId: clientId });
  if (!app) {
    ctx.response.status = 404;
    ctx.response.body = { message: "App not found" };
    return;
  }
  const user = await Users.findOne({
    $or: [{ email: body.email }, { discordId: body.discordId }],
  });

  if (user) {
    // do the auth and send back code
    const authCodeId = await AuthCodes.insertOne({
      clientId,
      userId: user._id,
      expireAt: new Date(Date.now() + 1000 * 60 * 10),
      scopes: body.scopes,
      used: false,
    });

    ctx.response.body = {
      code: authCodeId,
    };
  } else {
    const userId = await Users.insertOne({
      email: body.email,
      discordId: body.discordId,
      username: body.username,
      name: body.name,
      profilePicture: body.profilePicture,
      createdAt: new Date(),
      apps: [new ObjectId(app!._id)],
      friends: [],
      outwardFriendRequests: [],
      inwardFriendRequests: [],
      declinedFriendRequests: [],
      appUsers: [],
      verified: false,
    });

    const appUser = await AppUsers.insertOne({
      app: new ObjectId(app!._id),
      fyncId: userId,
      friends: [],

      createdAt: new Date(),
    });

    const updatedUser = await Users.updateOne(
      { _id: userId },
      { $push: { appUsers: appUser } }
    );

    const authCodeId = await AuthCodes.insertOne({
      clientId,
      userId: userId,
      expireAt: new Date(Date.now() + 1000 * 60 * 10),
      scopes: body.scopes,
      used: false,
    });

    ctx.response.body = {
      code: authCodeId,
    };
  }
});
v1Router.post(
  "/users/:id/add-friend",
  authorize(scopes.friend.write),
  async (ctx) => {
    const userId = new ObjectId(ctx.state.token.userId);
    try {
      const friendId = ctx.params.id;
      const user = await Users.findOne({ _id: userId });

      const friend = await Users.findOne({
        _id: new ObjectId(friendId),
      });

      if (!friend) {
        ctx.response.status = 404;
        ctx.response.body = { message: "friend not found" };
        return;
      }

      const { valid, message } = validateAddFriendRequest(user, friendId);

      if (!valid) {
        ctx.response.status = 400;
        ctx.response.body = { message };
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
  authorize(scopes.friend.read),
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

v1Router.get(
  "/friend-requests/@me",
  authorize(scopes.friend.read),
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

v1Router.get("/friends/@me", authorize(scopes.friend.read), async (ctx) => {
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
  "/users/:id/accept-friend",
  authorize(scopes.friend.write),
  async (ctx) => {
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

      if (user.friends?.find((friend) => friend.user.equals(friendId))) {
        ctx.response.body = {
          message: "user already friends with this friend",
        };
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
      const newFriendship = {
        accepter: user._id,
        adder: friend._id,
        friendship: 0,
        interactions: [],
        images: [],
        videos: [],
        createdAt: new Date(),
      };
      const friendship = await Friendships.insertOne(newFriendship);

      // Update user and friend documents
      await Users.updateOne(
        { _id: userId },
        {
          $pull: {
            inwardFriendRequests: friend._id,
          },
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
          $pull: { outwardFriendRequests: user._id },
          $addToSet: { friends: { user: user._id, friendship: friendship } },
        }
      );

      ctx.response.body = {
        _id: friendship,
        ...newFriendship,
      };
    } catch (e) {
      console.log(e);
      ctx.response.status = 400;
      ctx.response.body = { message: "invalid user id", error: e };
    }
  }
);
v1Router.post(
  "/users/:id/decline-friend",
  authorize(scopes.friend.write),
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
  "/users/:id/cancel-friend",
  authorize(scopes.friend.write),
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
v1Router.post(
  "/apps/:id/create-interaction",
  authorize(scopes.dev.admin),
  async (ctx) => {
    try {
      const app_id = new ObjectId(ctx.params.id);

      const app = await Apps.findOne({
        _id: app_id,
      });
      console.log(app);

      if (!app) {
        ctx.response.body = { message: "invalid app id" };
        return;
      }

      const interactionId = await Interactions.insertOne({
        version: 1,
        app: app._id,
        title: "",
        description: "",
        rewardDetail: "",

        type: "friendship",
        options: [],
        frequency: 1,
        urlSlug: Math.random().toString(36).substring(2, 10),

        startDate: new Date(),
        endDate: new Date(),
        createdAt: new Date(),
      });
      console.log("created interaction", interactionId);

      await Apps.updateOne(
        {
          _id: app_id,
        },
        {
          $addToSet: {
            interaction: {
              _id: interactionId,
              rarity: 1,
            },
          },
        }
      );

      ctx.response.body = {
        success: true,
        message: "Success",
      };
    } catch (e) {
      console.log(e);
      ctx.response.body = { message: "invalid app id" };
    }
  }
);
v1Router.put(
  "/apps/:id/update-interaction",
  authorize(scopes.dev.admin),
  async (ctx) => {
    const body = await ctx.request.body({ type: "json" }).value;

    console.log(body);
    const result = interactionParser.partial().safeParse(body);
    console.log(result, "updating interaction");

    if (!result.success) {
      const error = result.error.format();
      ctx.response.body = error;
    } else {
      console.log(result.data, "result data");
      const res = await Interactions.updateOne(
        { _id: new ObjectId(ctx.params.id) },
        { $set: result.data }
      );
      if (!res.matchedCount) {
        ctx.response.body = { message: "Interaction not found" };
        return;
      }
      console.log(res, "res");
      const interaction = await Interactions.findOne({
        _id: new ObjectId(ctx.params.id),
      });
      ctx.response.body = interaction;
    }
  }
);
v1Router.get(
  "/apps/:id/interactions",
  authorize(scopes.dev.admin),
  async (ctx) => {
    try {
      const app_id = new ObjectId(ctx.params.id);

      const interactions = await Interactions.find({
        app: app_id,
      }).toArray();

      console.log("interactions", interactions);

      ctx.response.body = {
        success: true,
        data: interactions,
      };
    } catch (e) {
      console.log(e);
      ctx.response.body = { message: "invalid app id" };
    }
  }
);
v1Router.post(
  "/interaction/:id/add/:id1/:id2",
  authorize(scopes.interaction.write),
  async (ctx) => {
    try {
      const interaction_id = new ObjectId(ctx.params.id);
      const user1_id = new ObjectId(ctx.params.id1);
      const user2_id = new ObjectId(ctx.params.id2);

      const interaction = await Interactions.findOne({ _id: interaction_id });

      if (!interaction) {
        ctx.response.body = { message: "invalid interaction id" };
        return;
      }

      const user1 = await Users.findOne({ _id: user1_id });

      if (!user1) {
        ctx.response.body = { message: "invalid user1 id" };
        return;
      }

      const user2 = await Users.findOne({ _id: user2_id });

      if (!user2) {
        ctx.response.body = { message: "invalid user2 id" };
        return;
      }

      const user_friend_data = user1.friends.find((friend1) => {
        if (friend1.user.toString() == user2._id.toString()) {
          if (
            user2.friends.find(
              (friend2) => friend2.user.toString() == user1._id.toString()
            )
          ) {
            return friend1;
          }
        }
      });

      if (!user_friend_data) {
        ctx.response.body = { message: "user friend not match" };
        return;
      }

      const friendship = await Friendships.findOne({
        _id: new ObjectId(user_friend_data.friendship.toString()),
      });

      if (!friendship) {
        ctx.response.body = { message: "user not have friendship" };
        return;
      }

      await Interactions.updateOne(
        {
          _id: interaction._id,
        },
        {
          $addToSet: {
            usersId: user1_id,
          },
        }
      );

      await Interactions.updateOne(
        {
          _id: interaction._id,
        },
        {
          $addToSet: {
            usersId: user2_id,
          },
        }
      );

      await Friendships.updateOne(
        {
          _id: new ObjectId(user_friend_data.friendship.toString()),
        },
        {
          $addToSet: {
            interactions: interaction._id,
          },
        }
      );

      ctx.response.body = {
        success: true,
        message: "Success Add Interaction Title: '" + interaction.title + "'",
      };
    } catch (e) {
      console.log(e);
      ctx.response.body = { message: "invalid interaction id" };
    }
  }
);
v1Router.get(
  "/users/:id/interactions",
  authorize(scopes.interaction.write),
  async (ctx) => {
    try {
      const user_id = new ObjectId(ctx.params.id);

      // aggregates from all friendship of user
      const interactions = await Friendships.aggregate([
        {
          $match: {
            $or: [{ adder: user_id }, { accepter: user_id }],
          },
        },
        ...populateArray("users", "friends.user", "_id", "friends"),
      ]).toArray();

      console.log("interactions", interactions);

      ctx.response.body = {
        success: true,
        data: interactions,
      };
    } catch (e) {
      console.log(e);
      ctx.response.body = { message: "invalid user id" };
    }
  }
);
/*v1Router.post(
  "/apps/:app_id/add-interaction/:interaction_id/to/:friend_id",
  authorize(scopes.write.interaction),
  async (ctx) => {
    try {
      const app_id = new ObjectId(ctx.params.app_id);
      const interaction_id = new ObjectId(ctx.params.interaction_id);
      const user_id = new ObjectId(ctx.state.token.userId);
      const friend_id = new ObjectId(ctx.params.friend_id);

      const app = await Apps.findOne({
        _id: app_id,
      });

      if (!app) {
        ctx.response.body = { message: "invalid app id" };
        return;
      }

      const interaction = await Interactions.findOne({
        _id: interaction_id,
      });

      if (!interaction) {
        ctx.response.body = { message: "invalid interaction id" };
        return;
      }

      const user = await Users.findOne({ _id: user_id });

      if (!user) {
        ctx.response.body = { message: "invalid user id" };
        return;
      }

      const friend = await Users.findOne({ _id: friend_id });

      if (!friend) {
        ctx.response.body = { message: "invalid friend id" };
        return;
      }

      await Apps.updateOne(
        {
          _id: app_id,
        },
        {
          $addToSet: {
            interaction: {
              _id: interaction,
              rarity: 1
            }
          },
        }
      );

      ctx.response.body = {
        success: true,
        message: "Success",
      };
    } catch (e) {
      console.log(e);
      ctx.response.body = { message: "invalid app id" };
    }
  }
);*/

v1Router.post("/meets/create", authorize(scopes.meet.test), async (ctx) => {
  const body = await ctx.request.body({ type: "json" }).value;

  const userId = new ObjectId(ctx.state.token.userId);

  try {
    const meetId = await Meets.insertOne({
      userId: userId,
      title: body.title,
      description: body.description,

      meetTime: new Date(body.meetTime),
      meetType: body.meetType,
      meetTags: body.meetTags || [],
      meetImages: body.meetImages || [],
      meetMaxUser: body.meetMaxUsers || 10,
      meetPublicType: body.meetPublicType || "all",
      meetUsers: [userId],

      reactionEmoji: {
        like: [],
        love: [],
        smile: [],
        sad: [],
        angry: [],
      },

      createdAt: new Date(),
    });

    const meet = await Meets.findOne({ _id: meetId });

    if (!meet) {
      ctx.response.body = { message: "invalid meet id" };
      return;
    }

    ctx.response.body = {
      success: true,
      message: meet,
    };
  } catch (e) {
    console.log(e);
    ctx.response.body = { message: "json not match" };
  }
});
v1Router.get("/meets/:meetId", async (ctx) => {
  const meetId = new ObjectId(ctx.params.meetId);

  const meet = await Meets.findOne({ _id: meetId });

  if (!meet) {
    ctx.response.body = { message: "invalid meet id" };
    return;
  }

  ctx.response.body = {
    success: true,
    message: meet,
  };
});
v1Router.post("/meets/:meetId/reaction", authorize(scopes.meet.test), async (ctx) => {
  const body = await ctx.request.body({ type: "json" }).value;

  const userId = new ObjectId(ctx.state.token.userId);
  const meetId = new ObjectId(ctx.params.meetId);

  const meet = await Meets.findOne({ _id: meetId });

  if (!meet) {
    ctx.response.body = { message: "invalid meet id" };
    return;
  }

  switch (body.reaction || "") {
    case "like":
      if (
        meet.reactionEmoji.like.find(
          (reactionUserId) => reactionUserId === userId
        )
      ) {
        await Meets.updateOne(
          { _id: meetId },
          { $pull: { "reactionEmoji.like": userId } }
        );
      } else {
        await Meets.updateOne(
          { _id: meetId },
          { $addToSet: { "reactionEmoji.like": userId } }
        );
      }

      break;
    case "love":
      if (
        meet.reactionEmoji.love.find(
          (reactionUserId) => reactionUserId === userId
        )
      ) {
        await Meets.updateOne(
          { _id: meetId },
          { $pull: { "reactionEmoji.love": userId } }
        );
      } else {
        await Meets.updateOne(
          { _id: meetId },
          { $addToSet: { "reactionEmoji.love": userId } }
        );
      }

      break;
    case "smile":
      if (
        meet.reactionEmoji.smile.find(
          (reactionUserId) => reactionUserId === userId
        )
      ) {
        await Meets.updateOne(
          { _id: meetId },
          { $pull: { "reactionEmoji.smile": userId } }
        );
      } else {
        await Meets.updateOne(
          { _id: meetId },
          { $addToSet: { "reactionEmoji.smile": userId } }
        );
      }

      break;
    case "sad":
      if (
        meet.reactionEmoji.sad.find(
          (reactionUserId) => reactionUserId === userId
        )
      ) {
        await Meets.updateOne(
          { _id: meetId },
          { $pull: { "reactionEmoji.sad": userId } }
        );
      } else {
        await Meets.updateOne(
          { _id: meetId },
          { $addToSet: { "reactionEmoji.sad": userId } }
        );
      }

      break;
    case "angry":
      if (
        meet.reactionEmoji.angry.find(
          (reactionUserId) => reactionUserId === userId
        )
      ) {
        await Meets.updateOne(
          { _id: meetId },
          { $pull: { "reactionEmoji.angry": userId } }
        );
      } else {
        await Meets.updateOne(
          { _id: meetId },
          { $addToSet: { "reactionEmoji.angry": userId } }
        );
      }

      break;
    default:
      ctx.response.body = { message: "json not match" };
      return;
  }

  const meetNew = await Meets.findOne({ _id: meetId });

  ctx.response.body = {
    success: true,
    message: meetNew,
  };
});
v1Router.post(
  "/meets/:meetId/cancel",
  authorize(scopes.meet.test),
  async (ctx) => {
    const userId = new ObjectId(ctx.state.token.userId);
    const meetId = new ObjectId(ctx.params.meetId);

    const meet = await Meets.findOne({ _id: meetId });

    if (!meet) {
      ctx.response.body = { message: "invalid meet id" };
      return;
    }

    if (meet.userId !== userId) {
      ctx.response.body = { message: "user is not owner" };
      return;
    }

    await Meets.delete({ _id: meetId });

    ctx.response.body = {
      success: true,
    };
  }
);
v1Router.post(
  "/meets/:meetId/join",
  authorize(scopes.meet.test),
  async (ctx) => {
    const userId = new ObjectId(ctx.state.token.userId);
    const meetId = new ObjectId(ctx.params.meetId);

    const meet = await Meets.findOne({ _id: meetId });

    if (!meet) {
      ctx.response.body = { message: "invalid meet id" };
      return;
    }

    if (meet.userId === userId) {
      ctx.response.body = { message: "user is owner" };
      return;
    }

    const updateJson = await Meets.updateOne(
      {
        _id: meetId,
      },
      {
        $addToSet: {
          meetUsers: userId,
        },
      }
    );

    if (updateJson.matchedCount == 0 && updateJson.modifiedCount == 0) {
      ctx.response.body = { message: "invalid meet id" };
      return;
    }

    const meetNew = await Meets.findOne({ _id: meetId });

    ctx.response.body = {
      success: true,
      message: meetNew,
    };
  }
);
v1Router.post(
  "/meets/:meetId/unjoin",
  authorize(scopes.meet.test),
  async (ctx) => {
    const userId = new ObjectId(ctx.state.token.userId);
    const meetId = new ObjectId(ctx.params.meetId);

    const meet = await Meets.findOne({ _id: meetId });

    if (!meet) {
      ctx.response.body = { message: "invalid meet id" };
      return;
    }

    if (meet.userId === userId) {
      ctx.response.body = { message: "user is owner" };
      return;
    }

    const updateJson = await Meets.updateOne(
      {
        _id: meetId,
      },
      {
        $pull: {
          meetUsers: userId,
        },
      }
    );

    if (updateJson.matchedCount == 0 && updateJson.modifiedCount == 0) {
      ctx.response.body = { message: "invalid meet id" };
      return;
    }

    const meetNew = await Meets.findOne({ _id: meetId });

    ctx.response.body = {
      success: true,
      message: meetNew,
    };
  }
);
