import {
  assert,
  assertArrayIncludes,
  assertEquals,
  assertExists,
} from "std/assert/mod.ts";
import { v1Router } from "@/routes/v1/v1.route.ts";
import { testing } from "oak/mod.ts";
import { createPostCtx, createGetCtx, createTestUser } from "./util.test.ts";
import { ObjectId } from "mongo";
import { Users } from "@/models/user.model.ts";
import {
  AccessTokens,
  createFyncAccessToken,
} from "@/models/accessToken.model.ts";
import { scopes } from "@/utils/scope.ts";
import { interactionRouter } from "@/routes/interaction.route.ts";
import { Friendships } from "@/models/friendship.model.ts";
import { string } from "zod";
import { MeetSchema } from "../models/meet.model.ts";

Deno.test({
  name: "meet",
  async fn(t) {
    const myId = await createTestUser();
    const friendIds = [
      await createTestUser(),
      await createTestUser(),
      await createTestUser(),
      await createTestUser(),
      await createTestUser(),
    ];

    const next = testing.createMockNext();

    let meetId: string | null = null;

    await t.step("create meet", async () => {
      const myAT = await createFyncAccessToken(myId.toString(), "", [
        scopes.meet.test,
      ]);

      const ctx = createPostCtx(
        JSON.stringify({
          title: "test",
          description: "testtesttesttesttest",
          meetTime: 1702714722000,
          meetType: "eat",
          meetTags: [],
          meetImages: [],
          meetMaxUser: 100,
          meetPublicType: "all",
        }),
        `/meets/create`,
        myAT!
      );

      await v1Router.routes()(ctx, next);
      assertEquals(ctx.response.status, 200);

      if (ctx.response.status == 200 && ctx.response && ctx.response.body) {
        const responseBody = ctx.response.body;
        const response = responseBody as {
          success: boolean;
          message: MeetSchema;
        };
        meetId = response.message._id.toString();
      }
    });

    if (!meetId) {
      return;
    }

    await t.step("join meet", async () => {
      for (let i = 0; i < friendIds.length; i++) {
        const friendId = friendIds[i];

        console.log("friendId", friendId);
        const friendAT = await createFyncAccessToken(friendId.toString(), "", [
          scopes.meet.test,
        ]);

        const ctx = createPostCtx("", `/meets/${meetId}/join`, friendAT!);

        await v1Router.routes()(ctx, next);
        assertEquals(ctx.response.status, 200);
      }
    });

    await t.step("reaction meet", async () => {
      const reactions = ["like", "love", "smile", "sad", "angry"];

      for (let i = 0; i < 200; i++) {
        const testUserId = await createTestUser();

        const testUserAT = await createFyncAccessToken(
          testUserId.toString(),
          "",
          [scopes.meet.test]
        );

        const reaction = reactions[Math.floor(Math.random() * reactions.length)];

        console.log("reaction", reaction);

        const ctx = createPostCtx(
          JSON.stringify({
            reaction: reaction,
          }),
          `/meets/${meetId}/reaction`,
          testUserAT!
        );

        await v1Router.routes()(ctx, next);
        assertEquals(ctx.response.status, 200);
      }
    });

    await t.step("get meet", async () => {
      const ctx = createGetCtx(`/meets/${meetId}`);

      await v1Router.routes()(ctx, next);
      assertEquals(ctx.response.status, 200);

      if (ctx.response.status == 200 && ctx.response && ctx.response.body) {
        const responseBody = ctx.response.body;
        const response = responseBody as {
          success: boolean;
          message: MeetSchema;
        };
        console.log("meetUsers", response.message.meetUsers);
        console.log("like", response.message.reactionEmoji.like.length);
        console.log("love", response.message.reactionEmoji.love.length);
        console.log("smile", response.message.reactionEmoji.smile.length);
        console.log("sad", response.message.reactionEmoji.sad.length);
        console.log("angry", response.message.reactionEmoji.angry.length);
      }
    });
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
