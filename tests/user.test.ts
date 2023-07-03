import { assertEquals } from "https://deno.land/std@0.154.0/testing/asserts.ts";
import { testing } from "oak";
import { usersRouter } from "../routes/user.route.ts";

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
Deno.test({
  name: "add friend",
  async fn() {
    const response = await fetch(
      "http://localhost:8000/users/6429964317dabc7f556b390c/add-friend",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId: "6448b625aadafd5f6f7c397b" }),
      }
    );

    await assertEquals(response.status, 200);
    const body = await response.json();
    assertEquals(body, { message: "Friend added successfully" });
  },
});
