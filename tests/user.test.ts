import { assertEquals, assertObjectMatch } from "std/testing/asserts.ts";
import { BodyFormData, BodyJson, testing } from "oak";
import { usersRouter } from "../routes/user.route.ts";
import { CreateUserSchema } from "../models/user.model.ts";
import { Request } from "oak/request.ts";
import { ServerRequestBody } from "oak/types.d.ts";
import { ObjectId } from "mongo";

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
  await t.step({
    name: "create user",
    async fn() {
      const testUser: CreateUserSchema = {
        username: "test",
        name: "test",
        email: "test@gmail.com",
        password: "test",
        birthdate: "test",
        phoneNumber: "test",
        profilePicture: "test",
      };

      const body = JSON.stringify(testUser);

      const ctx = createPostCtx(body, "/");
      const next = testing.createMockNext();

      await usersRouter.routes()(ctx, next);
      console.log(ctx.response);
      assertEquals(ctx.response.status, 200);
      assertEquals(ObjectId.isValid(ctx.response.body as string), true);
      createdUserId = ctx.response.body as string;
    },
  });
  await t.step({
    name: "add friend",
    async fn() {
      const body = JSON.stringify({
        friendId: "6448b625aadafd5f6f7c397b",
      });
      const ctx = createPostCtx(body, `/:id/add-friend`);

      const next = testing.createMockNext();

      await usersRouter.routes()(ctx, next);

      if (!ctx.response.body) {
        throw new Error("no response body");
      }
      assertEquals(ctx.response.status, 200);
      console.log(ctx.response);
      const responseBody = JSON.parse(ctx.response.body as string);
      assertObjectMatch(responseBody, {
        success: true,
        message: "friend request sent",
      });
    },
  });
});
