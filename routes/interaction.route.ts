import { Router } from "oak/mod.ts";
import { authorize } from "@/middleware/authorize.ts";
import { scopes } from "@/utils/scope.ts";
import { Users } from "@/models/user.model.ts";
import { matchId, populateArray } from "@/utils/db.ts";
import { Apps } from "@/models/app.model.ts";
import { Interactions } from "@/models/interaction.model.ts";
import { Friendships } from "@/models/friendship.model.ts";
import { ObjectId } from "mongo";

export const interactionRouter = new Router();

/**
 * /i/{slug}:
 *  post:
 *   description: Create an interaction
 *  requestBody: {users: string[]}
 *  required: true
 * content:
 *  security:
 *  - bearerAuth: []
 *  responses:
 *   "200":
 *   description: OK
 *  content: Friendship[]
 */
interactionRouter.post(
  "/:slug",
  authorize(scopes.friendship.write),
  async (ctx) => {
    console.log(ctx.state.token);
    const body = await ctx.request.body({ type: "json" }).value;
    // ctx.response.body = ctx.state.token;
    const interaction = await Interactions.findOne({
      urlSlug: ctx.params.slug,
    });

    if (!interaction) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Interaction not found" };
      return;
    }

    // if (body.users) {
    // const users = await Users.find({ _id: { $in: body.users } }).toArray();
    const user = await Users.findOne({ _id: ctx.state.token.userId });
    const friendshipIds = user?.friends.map((friend) => {
      if (body.users.includes(friend.user.toString())) {
        return friend.friendship;
      }
    }) as ObjectId[];

    if (!friendshipIds || !friendshipIds.length) {
      ctx.response.status = 404;
      ctx.response.body = {
        message: "Friendship not found with the provided users",
      };
      return;
    }
    // const friend
    // const friendshipIds = users.map(
    //   (user) =>
    //     new ObjectId(
    //       (
    //         user.friends.find(
    //           (friend) => friend.user === ctx.state.token.userId
    //         )?.friendship || ""
    //       ).toString()
    //     )
    // );
    // }
    // const user = await Users.findOne({ _id: ctx.state.token.userId });
    // find friendship between user and users

    const friendshipsUpdated = await Friendships.updateMany(
      {
        _id: { $in: friendshipIds },
      },
      {
        $push: {
          interactions: interaction._id,
        },
        $inc: {
          friendship: 1,
        },
      }
    );

    if (!friendshipsUpdated.matchedCount) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Friendship not found" };
      return;
    }
    const friendships = await Friendships.find({
      _id: { $in: friendshipIds },
    }).toArray();

    ctx.response.body = friendships;
  }
);
