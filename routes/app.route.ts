import { Router } from "oak";
import { appParser, Apps, createAppParser } from "../models/app.model.ts";
import { ObjectId } from "mongo";
import { userParser } from "../models/user.model.ts";

export const appsRouter = new Router();

appsRouter
  .get("/", async (ctx) => {
    const apps = await Apps.find().toArray();
    ctx.response.body = apps || [];
  })
  .get("/:id", async (ctx) => {
    const app = await Apps.findOne({ _id: new ObjectId(ctx.params.id) });
    ctx.response.body = app;
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
        userCount: 0,
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
