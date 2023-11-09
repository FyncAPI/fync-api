import { Router } from "oak";
import { appParser, Apps, createAppParser } from "@/models/app.model.ts";
import { ObjectId } from "mongo";
import { createGuestUserParser, Users } from "@/models/user.model.ts";
import { AppUsers } from "@/models/appUser.model.ts";
import { interactionParser, Interactions } from "@/models/interaction.model.ts";
import { v5 } from "std/uuid/mod.ts";
import { crypto, toHashString } from "std/crypto/mod.ts";

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
  })
  .get("/clientId/:clientId", async (ctx) => {
    const clientId = ctx.params.clientId;
    const app = await Apps.findOne({ clientId });
    console.log(app, "asdfg");
    if (!app) {
      ctx.response.status = 404;
      ctx.response.body = { message: "App not found" };
      return;
    }
    ctx.response.body = app;
    return;
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
      const clientId = crypto.randomUUID();

      const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(crypto.randomUUID())
      ); // hash the message ')

      const clientSecret = toHashString(hash);

      const app = await Apps.insertOne({
        ...result.data,
        clientId,
        clientSecret,
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
     *
     **/
    if (!ctx.params.appId) {
      ctx.response.body = { message: "No app id provided" };
      return;
    }
    try {
      console.log(ctx.params.appId);
      const appId = new ObjectId(ctx.params.appId);
      const app = await Apps.findOne({ _id: appId });

      if (app) {
        console.log(app);
        const body = await ctx.request.body({ type: "json" }).value;
        console.log(body);
        console.log(createGuestUserParser.parse(body.user));
        const result = createGuestUserParser.safeParse(body.user);

        console.log(result);
        if (!result.success) {
          const error = result.error.format();
          ctx.response.body = error;
        } else {
          const userId = await Users.insertOne({
            ...result.data,
            createdAt: new Date(),
            apps: [appId],
            appUsers: [],
            friends: [],
            // friendRequests: [],
            verified: false,
          });

          console.log(userId, "userId");

          if (userId) {
            const newAppUserId = await AppUsers.insertOne({
              app: appId,
              fyncId: userId,
              appUserId: body.appUserId || "",
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
  })
  .post("/:appId/create-interaction", async (ctx) => {
    try {
      const appId = new ObjectId(ctx.params.appId);
      const body = ctx.request.body({ type: "json" }).value;

      const app = await Apps.findOne({ _id: appId });
      console.log(app);
      if (app) {
        const interaction = await interactionParser.parseAsync(body);
        const interactionId = await Interactions.insertOne(interaction);

        const appUpdated = await Apps.updateOne(
          {
            _id: appId,
          },
          {
            $addToSet: {
              interactions: interactionId,
            },
          }
        );

        if (!appUpdated) {
          throw "cant add interaction into app";
        }

        ctx.response.body = {
          success: true,
          message: "interaction created successfully",
          data: {
            interaction: {
              ...interaction,
              _id: interactionId,
            },
          },
        };
      } else {
        throw "App not found with this id";
      }
    } catch (err) {
      console.log(err);

      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        message: err,
      };
    }
  });

appsRouter.delete("/:id", async (ctx) => {
  const app = await Apps.deleteOne({ _id: new ObjectId(ctx.params.id) });
  ctx.response.body = app;
});
