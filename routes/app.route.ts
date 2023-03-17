import { Router } from "oak";
import { appParser, Apps, createAppParser } from "../models/app.model.ts";
import { ObjectId } from "mongo";
import { userParser } from "../models/user.model.ts";
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
  })
  .post("/:appId/create-user/new", async (ctx) => {
    // create a guest user, add an app, create the app user,
    try {
      const appId = new ObjectId(ctx.params.appId);
      const app = await Apps.findOne({ _id: appId });

      if (app) {
        const body = await ctx.request.body({ type: "json" }).value;
        const result = appUserParser.safeParse(body);

        if (!result.success) {
          const error = result.error.format();
          ctx.response.body = error;
        } else {
          const user = await AppUsers.insertOne({
            ...result.data,
            createdAt: new Date(),
            app: app._id,
          });
          ctx.response.body = user;
        }
      }
    } catch (e) {
      console.log(e);
      ctx.response.body = { message: "invalid app id" };
    }
  })
  .post("/", async (ctx) => {
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
      });
      ctx.response.body = app;
    }
  })
  .put("/:id", async (ctx) => {
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
  })
  .delete("/:id", async (ctx) => {
    const app = await Apps.deleteOne({ _id: new ObjectId(ctx.params.id) });
    ctx.response.body = app;
  });
