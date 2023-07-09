import { assertEquals, assertObjectMatch } from "std/testing/asserts.ts";
import { BodyFormData, BodyJson, testing } from "oak";
import { usersRouter } from "../routes/user.route.ts";
import { CreateUserSchema } from "../models/user.model.ts";
import { Request } from "oak/request.ts";
import { ServerRequestBody } from "oak/types.d.ts";
import { MongoClient, ObjectId } from "mongo";
import { db } from "../db.ts";

function createPostCtx(body: string, url: string) {
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
    console.log(ctx.response);
    assertEquals(ctx.response.status, 200);
    const body = ctx.response.body;
  },
});

Deno.test("user", async (t) => {
  let createdUserId = "";
  let createdUser2Id = "";

  const userCol = db.collection("users");

  await t.step({
    name: "check database",
    async fn() {
      userCol.deleteMany({});
      const udatas = userCol.find();

      assertEquals((await udatas.toArray()).length, 0);
    },
  });

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

      console.log(ctx.response, ctx.response.body);

      assertEquals(ctx.response.status, 200);
      console.log(ctx.response);
      const responseBody = ctx.response.body as Object;
      assertObjectMatch(responseBody, {
        success: true,
        message: "friend request sent",
      });

      const user1 = await userCol.findOne({ _id: createdUserId });
      const user2 = await userCol.findOne({ _id: createdUser2Id });

      assertEquals(user1?.outwardFriendRequests, [
        new ObjectId(createdUser2Id),
      ]);
      assertEquals(user2?.inwardFriendRequests, [new ObjectId(createdUserId)]);
      console.log(user1, user2);
    },
  });

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

      console.log(ctx.response, ctx.response.body);

      assertEquals(ctx.response.status, 200);
      console.log(ctx.response);
      const responseBody = ctx.response.body as Object;
      assertObjectMatch(responseBody, {
        success: true,
        message: "friend request accepted",
      });

      const user1 = await userCol.findOne({ _id: createdUserId });
      const user2 = await userCol.findOne({ _id: createdUser2Id });

      assertEquals(user1?.friends, [new ObjectId(createdUser2Id)]);
      assertEquals(user2?.friends, [new ObjectId(createdUserId)]);
      console.log(user1, user2);
    },
  });
});
