import {
  assertArrayIncludes,
  assertEquals,
  assertExists,
} from "std/assert/mod.ts";
import { v1Router } from "@/routes/v1/v1.route.ts";
import { testing } from "oak/mod.ts";
import { createPostCtx, createTestUser } from "./util.test.ts";
import { ObjectId } from "mongo";
import { Users } from "@/models/user.model.ts";
import { AccessTokens, createAccessToken } from "@/models/accessToken.model.ts";

Deno.test({
  name: "accept friend",
  async fn() {
    const myId = await createTestUser();
    const friendId = await createTestUser({});

    // const del = await Users.deleteMany({
    //   username: "user1",
    //   name: "user1",
    //   email: "",
    // });
    // console.log(del);

    const accessToken = await createAccessToken(myId.toString());
    assertExists(accessToken);
    const ctx = createPostCtx(
      "",
      `/users/${friendId.toString()}/add-friend`,
      accessToken
    );

    console.log(ctx.request.headers);
    const next = testing.createMockNext();

    await v1Router.routes()(ctx, next);
    assertEquals(ctx.response.status, 200);

    const responseBody = ctx.response.body;

    console.log(responseBody);
    const userAfter = await Users.findOne({ _id: new ObjectId(myId) });
    console.log(userAfter?.outwardFriendRequests);
    assertArrayIncludes(userAfter!.outwardFriendRequests, [friendId]);

    const friendAfter = await Users.findOne({ _id: new ObjectId(friendId) });
    console.log(friendAfter?.inwardFriendRequests);
    assertArrayIncludes(friendAfter!.inwardFriendRequests, [
      new ObjectId(myId),
    ]);

    const friendAccessToken = await createAccessToken(friendId.toString());
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

    // check if outwardFriendRequests is empty

    console.log(ctx.request.headers);

    //delete

    const del = await Users.deleteMany({
      name: "user1",
      email: "",
      username: "user1",
    });

    assertExists(del);

    const result = await AccessTokens.deleteMany({
      userId: { $in: [new ObjectId(myId), new ObjectId(friendId)] },
    });

    assertArrayIncludes(friendAfter!.inwardFriendRequests, [
      new ObjectId(myId),
    ]);
    assertExists(result);

    console.log("done");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
