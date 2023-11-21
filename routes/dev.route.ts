import { Router } from "oak";
import { ObjectId } from "mongo";
import * as bcrypt from "bcrypt";
import {
  createEmailUserParser,
  createUserParser,
  Users,
} from "@/models/user.model.ts";
import { Devs } from "../models/dev.model.ts";
import { authorize } from "@/middleware/authorize.ts";
import { scopes } from "@/utils/scope.ts";
import { populate } from "@/utils/db.ts";
import { appParser, Apps, createAppParser } from "@/models/app.model.ts";
import { toHashString } from "std/crypto/to_hash_string.ts";
import { Status } from "https://deno.land/std@0.200.0/http/http_status.ts";
import { populateByIds } from "@/db.ts";

export const devRouter = new Router();

devRouter.get("/profile", authorize(scopes.dev.admin), async (ctx) => {
  const userId = ctx.state.token.userId;
  const devUser = await Users.aggregate([
    { $match: { _id: new ObjectId(userId) } },
    ...populate("devs", "devId", "dev"),
  ]).toArray();

  if (!devUser[0]) {
    ctx.response.status = 404;
    ctx.response.body = { message: "Dev not found" };
    return;
  }

  ctx.response.body = devUser[0];
});

devRouter.post("/app/create", authorize(scopes.dev.admin), async (ctx) => {
  // get auth header from request
  const body = await ctx.request.body({ type: "json" }).value;
  console.log(body);

  const result = createAppParser.safeParse(body);
  console.log(result);
  // console.log(body instanceof UserSchema);
  if (!result.success) {
    const error = result.error.format();
    ctx.response.status = 400;
    ctx.response.body = error;
  } else {
    const clientId = crypto.randomUUID();

    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(crypto.randomUUID())
    ); // hash the message ')

    const clientSecret = toHashString(hash);

    const appId = await Apps.insertOne({
      ...result.data,
      clientId,
      clientSecret,
      createdAt: new Date(),
      events: [],
      users: [],
      interactions: [],
    });

    const dev = await Devs.updateOne(
      { userId: new ObjectId(ctx.state.token.userId) },
      { $push: { apps: appId } }
    );

    if (!dev || !dev.modifiedCount) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Dev not found" };
      return;
    }

    ctx.response.status = Status.Created;
    ctx.response.body = appId;
  }
});

devRouter.get("/apps", authorize(scopes.dev.admin), async (ctx) => {
  const dev = await Devs.aggregate([
    { $match: { userId: new ObjectId(ctx.state.token.userId) } },
    ...populateByIds("apps", "apps"),
  ]).toArray();

  console.log(dev);
  if (!dev[0]) {
    // ctx.response.status = 404;
    // ctx.response.body = { message: "Dev not found" };
    ctx.response.body = [];
    return;
  }

  ctx.response.body = dev[0].apps;
});

devRouter.get("/apps/:appId", authorize(scopes.dev.admin), async (ctx) => {
  const app = await Apps.findOne({ _id: new ObjectId(ctx.params.appId) });

  if (!app) {
    ctx.response.status = 404;
    ctx.response.body = { message: "App not found" };
    return;
  }

  ctx.response.body = app;
});
devRouter.put("/apps/:id", authorize(scopes.dev.admin), async (ctx) => {
  console.log("here");
  const body = await ctx.request.body({ type: "json" }).value;

  console.log(body);
  const result = appParser.partial().safeParse(body);
  console.log(result, "updating app");

  if (!result.success) {
    const error = result.error.format();

    ctx.response.body = error;
  } else {
    console.log(result.data, "result data");
    const res = await Apps.updateOne(
      { _id: new ObjectId(ctx.params.id) },
      { $set: result.data }
    );
    if (!res.matchedCount) {
      ctx.response.body = { message: "App not found" };
      return;
    }
    console.log(res, "res");
    const app = await Apps.findOne({ _id: new ObjectId(ctx.params.id) });
    ctx.response.body = app;
  }
});

// to use the interaction.... /v1/appid/interactionname?
devRouter.post(
  "/interactions/create",
  authorize(scopes.dev.admin),
  async (ctx) => {
    const body = await ctx.request.body({ type: "json" }).value;
    console.log(body);
  }
);
