import { Router } from "oak";
import { appParser, Apps, createAppParser } from "../models/app.model.ts";
import { z } from "zod";
import { ObjectId } from "mongo";
import { createGuestUser, userParser, Users } from "../models/user.model.ts";
import { appUserParser, AppUsers } from "../models/appUser.model.ts";

export const appsRouter = new Router();

appsRouter
  .get("/", async (ctx) => {
    const apps = await Apps.find().toArray();
    ctx.response.body = apps || [];
  })
  .get("/:id", async (ctx) => {
    try {
      const id = new ObjectId(ctx.params.id);
      console.log(id, "xxs");
      const app = await Apps.findOne({ _id: id });
      console.log(app);
      if (app) {
        ctx.response.body = app;
      } else {
        ctx.response.body = { message: "App not found" };
      }
    } catch (e) {
      console.log(e);
      ctx.response.body = { message: "invalid app id" };
    }
  });

appsRouter
  .post("/", async (ctx) => {
    /**
     * Create App account in fync api
     *
     */
    const body = await ctx.request.body({ type: "json" }).value;
    body._id = new ObjectId(ctx.params.id);
    console.log(body);

    const result = createAppParser.safeParse(body);
    console.log(result);
    // console.log(body instanceof UserSchema);

    if (!result.success) {
      const error = result.error.format();
      ctx.response.body = error;
    } else {
      const app = await Apps.insertOne({
        ...result.data,
        createdAt: new Date(),
        events: [],
        users: [],
        interactions: [],
      });
      ctx.response.body = app;
    }
  })
  .post("/:appId/create-user/new", async (ctx) => {
    /**
     * create new user in fync api
     *  */
    try {
      console.log(ctx.params.appId);
      console.log(new ObjectId(ctx.params.appId));
      const appId = new ObjectId(ctx.params.appId);
      const app = await Apps.findOne({ _id: appId });

      if (app) {
        const body = await ctx.request.body({ type: "json" }).value;
        const result = z
          .object({
            user: createGuestUser,
            appUserId: z.string().optional(),
          })
          .safeParse(body);

        if (!result.success) {
          const error = result.error.format();
          ctx.response.body = error;
        } else {
          const userId = await Users.insertOne({
            ...result.data.user,
            createdAt: new Date(),
            apps: [appId],
            appUsers: [],
            friends: [],
            friendRequests: [],
            verified: false,
          });

          if (userId) {
            const newAppUserId = await AppUsers.insertOne({
              app: appId,
              fyncId: userId,
              appUserId: result.data.appUserId,
              appInteraction: {
                friendshipCount: 0,
                eventCount: 0,
                lastInteraction: new Date(),
              },
              friends: [],
              createdAt: new Date(),
            });

            if (newAppUserId) {
              // add app to user
              const user = await Users.updateOne(
                { _id: userId },
                { $push: { appUsers: newAppUserId } }
              );
              console.log(user);
              ctx.response.body = {
                message: "App user created",
                appUserId: newAppUserId,
                fyncUserId: userId,
              };
            } else {
              throw new Error("Could not create app user");
            }
          }
        }
      }
    } catch (e) {
      console.log(e);
      ctx.response.body = { message: "invalid app id", e };
    }
  })
  .post("/:appId/create-user/existing", async (ctx) => {
    // TODO link existing user to app
    // flow => hmmmmm only for hh
  })
  .post("/:appId/create-interaction", async (ctx) => {});

appsRouter.put("/:id", async (ctx) => {
  const body = await ctx.request.body({ type: "json" }).value;

  const result = appParser.partial().safeParse(body);
  console.log(result);

  if (!result.success) {
    const error = result.error.format();

    ctx.response.body = error;
  } else {
    const app = await Apps.updateOne(
      { _id: new ObjectId(ctx.params.id) },
      { $set: result.data }
    );
    ctx.response.body = app;
  }
});
appsRouter.delete("/:id", async (ctx) => {
  const app = await Apps.deleteOne({ _id: new ObjectId(ctx.params.id) });
  ctx.response.body = app;
});
