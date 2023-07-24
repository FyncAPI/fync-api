import {
  assert,
  assertAlmostEquals,
  assertEquals,
  assertExists,
  assertObjectMatch,
} from "std/testing/asserts.ts";
import { BodyFormData, BodyJson, testing } from "oak";
import { usersRouter } from "../routes/user.route.ts";
import { CreateUserSchema, UserSchema } from "../models/user.model.ts";
import { Request } from "oak/request.ts";
import { ServerRequestBody } from "oak/types.d.ts";
import { MongoClient, ObjectId } from "mongo";
import { db } from "../db.ts";
import { FriendshipSchema } from "../models/friendship.model.ts";

export function createPostCtx(body: string, url: string) {
  const ctx = testing.createMockContext();

  const request = new Request({
    remoteAddr: undefined,
    headers: new Headers({
      "content-type": "text/plain",
      "content-length": String(body.length),
      host: "localhost",
    }),
    method: "POST",
    url: url,
    // deno-lint-ignore no-explicit-any
    error(_reason?: any) {},
    getBody(): ServerRequestBody {
      return {
        body: null,
        readBody: () => Promise.resolve(new TextEncoder().encode(body)),
      };
    },
    respond: (_response: Response) => Promise.resolve(),
  });
  ctx.request = request;
  return ctx;
}

export function createGetCtx(url: string) {
  const ctx = testing.createMockContext({
    path: url,
    method: "GET",
  });
  return ctx;
}

Deno.test({
  name: "list users",
  async fn() {
    const ctx = testing.createMockContext({
      path: "/",
      method: "GET",
    });
    // const mockApp = testing.createMockApp();
    const next = testing.createMockNext();

    await usersRouter.routes()(ctx, next);
    assertEquals(ctx.response.status, 200);
    const body = ctx.response.body;
  },
});

Deno.test("user", async (t) => {
  let createdUserId = "";
  let createdUser2Id = "";

  const userCol = db.collection("users");

  // await t.step({
  //   name: "check database",
  //   async fn() {
  //     userCol.deleteMany({});
  //     const udatas = userCol.find();

  //     assertEquals((await udatas.toArray()).length, 0);
  //   },
  // });

  await t.step({
    name: "create user",
    async fn() {
      const testUser: CreateUserSchema = {
        username: "user1",
        name: "user1",
        email: "user1@gmail.com",
        password: "user1",
        birthdate: "1/2/3",
        phoneNumber: "123123123",
        profilePicture: "test",
      };

      const body = JSON.stringify(testUser);

      const ctx = createPostCtx(body, "/");
      const next = testing.createMockNext();

      await usersRouter.routes()(ctx, next);
      assertEquals(ctx.response.status, 200);
      assertEquals(ObjectId.isValid(ctx.response.body as string), true);
      createdUserId = ctx.response.body as string;
    },
  });

  await t.step({
    name: "create user2",
    async fn() {
      const testUser: CreateUserSchema = {
        username: "user2",
        name: "user2",
        email: "user2@gmail.com",
        password: "user2",
        birthdate: "1/2/3",
        phoneNumber: "123123123",
        profilePicture: "test",
      };

      const body = JSON.stringify(testUser);

      const ctx = createPostCtx(body, "/");
      const next = testing.createMockNext();

      await usersRouter.routes()(ctx, next);
      assertEquals(ctx.response.status, 200);
      assertEquals(ObjectId.isValid(ctx.response.body as string), true);
      createdUser2Id = ctx.response.body as string;
    },
  });

  await t.step({
    name: "get users",
    async fn() {
      const ctx = testing.createMockContext({
        path: "/",
        method: "GET",
      });

      const next = testing.createMockNext();
      await usersRouter.routes()(ctx, next);
      assertEquals(ctx.response.status, 200);
      const body = ctx.response.body;
    },
  });

  await t.step({
    name: "add friend",
    async fn() {
      const body = JSON.stringify({
        friendId: createdUser2Id,
      });
      const ctx = createPostCtx(body, `/${createdUserId}/add-friend`);

      const next = testing.createMockNext();

      await usersRouter.routes()(ctx, next);

      if (!ctx.response.body) {
        throw new Error("no response body");
      }

      assertEquals(ctx.response.status, 200);
      const responseBody = ctx.response.body as Object;
      assertObjectMatch(responseBody, {
        success: true,
        message: "friend request sent",
      });

      const user1 = await userCol.findOne({ _id: createdUserId });
      const user2 = await userCol.findOne({ _id: createdUser2Id });
      assert(user1, "User1 should exist in the database");
      assert(user2, "User2 should exist in the database");

      assertEquals(user1?.outwardFriendRequests, [
        new ObjectId(createdUser2Id),
      ]);
      assertEquals(user2?.inwardFriendRequests, [new ObjectId(createdUserId)]);
    },
  });

  await t.step({
    name: "get incoming friend requests",
    async fn() {
      const ctx = createGetCtx(`/${createdUser2Id}/friend-requests/in`);

      const next = testing.createMockNext();

      await usersRouter.routes()(ctx, next);

      if (!ctx.response.body) {
        throw new Error("no response body");
      }

      assertEquals(ctx.response.status, 200);
      assertExists(ctx.response.body);
      const responseBody = ctx.response.body;
      console.log(responseBody);

      // Check that the friend requests are as expected.
      const user = await userCol.findOne({ _id: createdUserId });
      // assertEquals(responseBody.data[0], user);
      // assertEquals(1, (user as UserSchema)?.inwardFriendRequests?.length);
    },
  });

  await t.step({
    name: "get outgoing friend requests",
    async fn() {
      const ctx = createGetCtx(`/${createdUserId}/friend-requests/out`);

      const next = testing.createMockNext();

      await usersRouter.routes()(ctx, next);

      if (!ctx.response.body) {
        throw new Error("no response body");
      }

      assertEquals(ctx.response.status, 200);
      const responseBody = ctx.response.body as Object;

      // Check that the friend requests are as expected.
      const user = await userCol.findOne({ _id: createdUser2Id });
      assertEquals(responseBody, [user]);
    },
  });

  // await t.step({
  //   name: "decline friend",
  //   async fn() {
  //     const body = JSON.stringify({
  //       friendId: createdUserId,
  //     });
  //     const ctx = createPostCtx(body, `/${createdUser2Id}/decline-friend`);

  //     const next = testing.createMockNext();

  //     await usersRouter.routes()(ctx, next);

  //     if (!ctx.response.body) {
  //       throw new Error("no response body");
  //     }

  //     assertEquals(ctx.response.status, 200);
  //     const responseBody = ctx.response.body as Object;
  //     interface DeclineFriendResponse {
  //       success: boolean;
  //       message: string;
  //     }

  //     assertObjectMatch(responseBody, {
  //       success: true,
  //       message: "friend request declined",
  //     });

  //     const user1 = await userCol.findOne({ _id: createdUserId });
  //     const user2 = await userCol.findOne({ _id: createdUser2Id });

  //     assert(
  //       !user2?.inwardFriendRequests.includes(new ObjectId(createdUserId)),
  //       "User2 should not have User1 in inwardFriendRequests"
  //     );
  //   },
  // });
  // await t.step({
  //   name: "add friend again",
  //   async fn() {
  //     const body = JSON.stringify({
  //       friendId: createdUser2Id,
  //     });
  //     const ctx = createPostCtx(body, `/${createdUserId}/add-friend`);

  //     const next = testing.createMockNext();

  //     await usersRouter.routes()(ctx, next);

  //     if (!ctx.response.body) {
  //       throw new Error("no response body");
  //     }

  //     assertEquals(ctx.response.status, 200);
  //     const responseBody = ctx.response.body as Object;
  //     assertObjectMatch(responseBody, {
  //       success: true,
  //       message: "friend request sent",
  //     });

  //     const user1 = await userCol.findOne({ _id: createdUserId });
  //     const user2 = await userCol.findOne({ _id: createdUser2Id });

  //     assertEquals(user1?.outwardFriendRequests, [
  //       new ObjectId(createdUser2Id),
  //     ]);
  //     assertEquals(user2?.inwardFriendRequests, [new ObjectId(createdUserId)]);
  //   },
  // });
  await t.step({
    name: "accept friend",
    async fn() {
      const body = JSON.stringify({
        friendId: createdUserId,
      });
      const ctx = createPostCtx(body, `/${createdUser2Id}/accept-friend`);

      const next = testing.createMockNext();

      await usersRouter.routes()(ctx, next);

      if (!ctx.response.body) {
        throw new Error("no response body");
      }
      console.log(ctx.response.body);

      assertEquals(ctx.response.status, 200);
      const responseBody = ctx.response.body as Object;
      interface AcceptFriendResponse {
        success: boolean;
        message: string;
        data: {
          friendship: string;
        };
      }
      const friendshipId = (responseBody as AcceptFriendResponse).data
        ?.friendship;
      assertObjectMatch(responseBody, {
        success: true,
        message: "friend request accepted",
        data: {
          friendship: new ObjectId(friendshipId),
        },
      });

      const user1 = await userCol.findOne({ _id: createdUserId });
      const user2 = await userCol.findOne({ _id: createdUser2Id });

      assertEquals(user1?.friends, [
        {
          user: new ObjectId(createdUser2Id),
          friendship: new ObjectId(friendshipId),
        },
      ]);
      console.log(user2?.friends, [
        {
          user: new ObjectId(createdUserId),
          friendship: new ObjectId(friendshipId),
        },
      ]);
      assertEquals(user2?.friends, [
        {
          user: new ObjectId(createdUserId),
          friendship: new ObjectId(friendshipId),
        },
      ]);
    },
  });

  await t.step({
    name: "get friends",
    async fn() {
      const ctx = createGetCtx(`/${createdUserId}/friends`);

      const next = testing.createMockNext();

      await usersRouter.routes()(ctx, next);

      if (!ctx.response.body) {
        throw new Error("no response body");
      }

      console.log(ctx.response, ctx.response.body);

      assertEquals(ctx.response.status, 200);
      const responseBody = ctx.response.body as Object;
      type Friend = {
        user: UserSchema;
        friendship: FriendshipSchema;
      };

      interface GetFriendsResponse {
        success: boolean;
        data: Friend[];
      }

      const response = responseBody as GetFriendsResponse;

      assert(response.success, "Request should be successful");
      assert(Array.isArray(response.data), "Friends should be an array");

      // Check that the returned friends are as expected.
      // This will depend on how you have set up your test data.
      // Here's an example where we check that the friend's ids are as expected:
      for (const friend of response.data) {
        assert(
          friend.user._id.equals(createdUser2Id),
          "Returned friend ids should match created user ids"
        );
      }

      console.log(response);
    },
  });
});
