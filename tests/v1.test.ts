import { assertEquals, assertObjectMatch } from "std/assert/mod.ts";
import { usersRouter } from "@/routes/user.route.ts";
import { testing } from "oak/mod.ts";
import { createPostCtx, createTestUser } from "./util.test.ts";
import { ObjectId } from "https://deno.land/x/web_bson@v0.3.0/mod.js";
import { Users } from "@/models/user.model.ts";

Deno.test({
  name: "accept friend",
  async fn() {
    const myId = await createTestUser();
    const friendId = await createTestUser({
      inwardFriendRequests: [new ObjectId(myId)],
    });

    const user = await Users.findOne({ _id: myId });
    console.log(user);

    // const ctx = createPostCtx("", `/v1/${friendId}/add-friend`);

    // const next = testing.createMockNext();

    // await usersRouter.routes()(ctx, next);

    // if (!ctx.response.body) {
    //   throw new Error("no response body");
    // }

    // assertEquals(ctx.response.status, 200);
    // const responseBody = ctx.response.body as Object;
    // assertObjectMatch(responseBody, {
    //   success: true,
    //   message: "friend request sent",
    // });

    // const user1 = await userCol.findOne({ _id: createdUserId });
    // const user2 = await userCol.findOne({ _id: createdUser2Id });
    // assert(user1, "User1 should exist in the database");
    // assert(user2, "User2 should exist in the database");

    // assertEquals(user1?.outwardFriendRequests, [new ObjectId(createdUser2Id)]);
    // assertEquals(user2?.inwardFriendRequests, [new ObjectId(createdUserId)]);
  },
});
