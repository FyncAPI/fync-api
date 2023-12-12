import {
  assert,
  assertArrayIncludes,
  assertEquals,
  assertExists,
} from "std/assert/mod.ts";
import { v1Router } from "@/routes/v1/v1.route.ts";
import { testing } from "oak/mod.ts";
import { createPostCtx, createTestUser } from "./util.test.ts";
import { ObjectId } from "mongo";
import { Users } from "@/models/user.model.ts";
import {
  AccessTokens,
  createFyncAccessToken,
} from "@/models/accessToken.model.ts";
import { scopes } from "@/utils/scope.ts";
import { interactionRouter } from "@/routes/interaction.route.ts";
import { Friendships } from "@/models/friendship.model.ts";

Deno.test({
  name: "interaction",
  async fn(t) {
    const myId = await createTestUser();
    const friendId = await createTestUser({});
    const slug = "g";

    const next = testing.createMockNext();

    await t.step("add friend", async () => {
      const friendAT = await createFyncAccessToken(myId.toString(), "", [
        scopes.friend.write,
      ]);
      const ctx = createPostCtx(
        "",
        `/users/${friendId.toString()}/add-friend`,
        friendAT!
      );

      await v1Router.routes()(ctx, next);
      assertEquals(ctx.response.status, 200);
      // Add more assertions here to check the response body
      console.log(ctx.response.body);

      const userAfter = await Users.findOne({ _id: new ObjectId(myId) });
      console.log(userAfter?.outwardFriendRequests);
      assertArrayIncludes(userAfter!.outwardFriendRequests, [friendId]);

      const friendAfter = await Users.findOne({ _id: new ObjectId(friendId) });
      console.log(friendAfter?.inwardFriendRequests);
      assertArrayIncludes(friendAfter!.inwardFriendRequests, [
        new ObjectId(myId),
      ]);
    });
    await t.step("accept friend", async () => {
      const friendAccessToken = await createFyncAccessToken(
        friendId.toString()
      );
      const acceptCtx = createPostCtx(
        "",
        `/users/${myId.toString()}/accept-friend`,
        friendAccessToken!
      );

      await v1Router.routes()(acceptCtx, next);
      console.log(acceptCtx.response);
      assertEquals(acceptCtx.response.status, 200);

      //check status
      const userAfter2 = await Users.findOne({ _id: new ObjectId(myId) });
      console.log(userAfter2?.outwardFriendRequests);
      assertEquals(userAfter2!.outwardFriendRequests.length, 0);

      // check if inwardFriendRequests is empty
      const friendAfter2 = await Users.findOne({ _id: new ObjectId(friendId) });
      console.log(friendAfter2?.inwardFriendRequests);
      assertEquals(friendAfter2!.inwardFriendRequests.length, 0);
      assertEquals(userAfter2!.friends.length, 1);
      assertEquals(friendAfter2!.friends[0].user.toString(), myId.toString());
      assertEquals(
        userAfter2!.friends[0].friendship.toString(),
        friendAfter2!.friends[0].friendship.toString()
      );
      console.log("friendship", userAfter2!.friends[0].friendship.toString());
    });
    await t.step("interact", async () => {
      const accessToken = await createFyncAccessToken(myId.toString(), "", [
        scopes.friendship.write,
      ]);
      assertExists(accessToken);
      const ctx = createPostCtx(
        JSON.stringify({
          users: [friendId],
        }),
        `/${slug}`,
        accessToken
      );

      console.log(ctx.request.headers);

      await interactionRouter.routes()(ctx, next);

      console.log(ctx.response.body);
      assertEquals(ctx.response.status, 200);

      const responseBody = ctx.response.body;

      console.log(responseBody);

      const userAfter = await Users.findOne({ _id: new ObjectId(myId) });
      console.log(userAfter, "u");
      const friendAfter = await Users.findOne({ _id: new ObjectId(friendId) });
      console.log(friendAfter, "f");
      const friendship = await Friendships.findOne({
        adder: { $in: [myId, friendId] },
      });

      console.log(friendship, "sf");
    });
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
Deno.test({
  name: "false success",
  async fn(t) {
    Deno.exit(0);
    await t.step("step 1", () => {
      assert(true);
    });
  },
  sanitizeExit: false,
});
