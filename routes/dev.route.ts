import { Router } from "oak";
import { ObjectId } from "mongo";
import * as bcrypt from "bcrypt";
import {
  createEmailUserParser,
  createUserParser,
  Users,
} from "@/models/user.model.ts";
import { Devs } from "../models/dev.model.ts";

export const devRouter = new Router();

devRouter.post("/login/:userId", async (ctx) => {
  const userId = ctx.params.userId;

  const user = await Users.findOne({ _id: new ObjectId(userId) });

  console.log(user, "user at devlogin");

  if (!user) {
    ctx.response.body = {
      error: "User not found",
    };
    return;
  }

  if (user.devId) {
    const dev = await Devs.findOne({ _id: new ObjectId(user.devId) });

    if (!dev) {
      ctx.response.body = {
        error: "Dev not found",
      };
      return;
    } else {
      ctx.response.body = {
        message: "Dev found",
        dev: dev,
      };
    }
  } else {
    const dev = await Devs.insertOne({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
      apps: [],
      createdAt: new Date(),
    });

    await Users.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { devId: dev } }
    );

    ctx.response.body = {
      message: "Dev created",
      dev: dev,
    };
  }
});

devRouter.post("/createApp", (ctx) => {
  // get auth header from request
  const authHeader = ctx.request.headers.get("Authorization");

  // if no auth header, return error
  if (!authHeader) {
    ctx.response.body = {
      error: "No auth header",
    };
  }

  // get auth header value
  const token = authHeader.split(" ")[1];

  // if no token, return error
  if (!token) {
    ctx.response.body = {
      error: "No token",
    };
  }

  // get user from token
});
