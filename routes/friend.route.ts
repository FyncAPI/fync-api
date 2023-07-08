import { Router } from "oak";
import { createUserParser, userParser, Users } from "../models/user.model.ts";
import { ObjectId } from "mongo";
import { z } from "zod";
import { FriendRequests } from "../models/friendRequest.model.ts";
import { friendParser, Friends } from "../models/friend.model.ts";
import { populateById } from "../db.ts";

export const friendsRouter = new Router();

friendsRouter.get("/", async (ctx) => {
  const friends = await Friends.find().toArray();
  ctx.response.body = friends || [];
});
// .get("/updatetousername", async (ctx) => {
//   const friends = await Friends.aggregate([
//     {
//       $lookup: {
//         from: "users",
//         localField: "adder",
//         foreignField: "_id",
//         as: "adder_doc",
//       },
//     },
//     {
//       $lookup: {
//         from: "users",
//         localField: "accepter",
//         foreignField: "_id",
//         as: "accepter_doc",
//       },
//     },
//     {
//       $addFields: {
//         adder: { $arrayElemAt: ["$adder_doc.username", 0] },
//         accepter: { $arrayElemAt: ["$accepter_doc.username", 0] },
//       },
//     },
//     {
//       $project: {
//         adder_doc: 0,
//         accepter_doc: 0,
//       },
//     },

//     {
//       $out: "friends",
//     },
//   ]);
//   ctx.response.body = friends || [];
// });

friendsRouter.put("/:id", async (ctx) => {
  const body = await ctx.request.body({ type: "json" }).value;
  const res = friendParser.partial().safeParse(body);

  if (!res.success) {
    const error = res.error.flatten();

    ctx.response.body = {
      error: error.fieldErrors,
    };
    ctx.response.status = 400;
  } else {
    const res = await Friends.updateOne(
      { _id: new ObjectId(ctx.params.id) },
      { $set: body }
    );
    ctx.response.body = res;
  }
});

friendsRouter.post("/addfriendship", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;

    const parsedBody = z
      .object({
        count: z.number().optional(),
        username: z.string(),
        friendUsername: z.string(),
      })
      .parse(body);

    const friendshipId = await Friends.updateOne(
      {
        adder: parsedBody.username,
        accepter: parsedBody.friendUsername,
      },
      {
        $inc: { friendship: parsedBody.count || 1 },
      }
    );

    ctx.response.body = friendshipId;
  } catch (e) {
    console.log(e);
    ctx.response.body = {
      error: e.message,
    };
    ctx.response.status = 400;
  }
});

friendsRouter.post("/addfriendship/:id/:count", async (ctx) => {
  if (!ctx.params.count) {
    ctx.response.body = {
      error: "No count provided",
    };
    return;
  }

  if (isNaN(parseInt(ctx.params.count))) {
    ctx.response.body = {
      error: "Count is not a number",
    };
    return;
  }

  const res = await Friends.updateOne(
    { _id: new ObjectId(ctx.params.id) },
    { $inc: { friendship: parseInt(ctx.params.count) } }
  );
  ctx.response.body = res;

  return;
});
