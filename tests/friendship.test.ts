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
import { friendshipRouter } from "@/routes/friendship.route.ts";

Deno.test("friendship", async (t) => {
  let friendId: string;
  await t.step({
    name: "get all friendships",
    async fn() {
      const ctx = testing.createMockContext({
        path: "/",
        method: "GET",
      });
      // const mockApp = testing.createMockApp();
      const next = testing.createMockNext();

      await friendshipRouter.routes()(ctx, next);
      assertEquals(ctx.response.status, 200);
      const body = ctx.response.body;
      assertExists(body);
      assert(body instanceof Array);
      assertEquals(body.length > 0, true);
      console.log(body[0]._id);
      assertEquals(ObjectId.isValid(body[0]._id), true);
      friendId = body[0]._id;
    },
  });

  await t.step({
    name: "get friendship by id",
    async fn() {
      const ctx = testing.createMockContext({
        path: `/${friendId}`,
        method: "GET",
      });
      // const mockApp = testing.createMockApp();
      const next = testing.createMockNext();

      await friendshipRouter.routes()(ctx, next);
      console.log(ctx.response.body);
      assertEquals(ctx.response.status, 200);
      const body = ctx.response.body;
      console.log(body);
    },
  });
});
