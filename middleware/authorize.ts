import { Status } from "https://deno.land/std@0.200.0/http/http_status.ts";
import { Context } from "oak/mod.ts";
import { AccessTokens } from "../models/accessToken.model.ts";
import { ScopeValues } from "@/utils/scope.ts";

export const authorize =
  (scope: ScopeValues) =>
  async (ctx: Context, next: () => Promise<unknown>) => {
    const token = ctx.request.headers.get("Authorization")?.split(" ")[1];

    if (!token) {
      console.log("no token");
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = {
        message: "Unauthorized - Missing token",
      };
      return;
    }

    const dbToken = await AccessTokens.findOne({ accessToken: token });

    if (!dbToken) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = {
        message: "Unauthorized - Invalid token",
      };
      return;
    }

    if (!dbToken.scopes.includes(scope)) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = {
        message: "Unauthorized - Invalid scope",
      };
      return;
    }

    if (dbToken.expireAt < new Date()) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = {
        message: "Unauthorized - Token expired",
      };
      return;
    }

    ctx.state.token = dbToken;

    await next();
  };
