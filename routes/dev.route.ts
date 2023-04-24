import { Router } from "oak";
import * as bcrypt from "bcrypt";
import {
  createEmailUserParser,
  createUserParser,
  Users,
} from "@/models/user.model.ts";

export const devRouter = new Router();

devRouter.post("/email/login", async (ctx) => {
  const body = await ctx.request.body({ type: "json" }).value;

  const { email, password } = body;
});
