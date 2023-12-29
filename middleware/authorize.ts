import { Status } from "https://deno.land/std@0.200.0/http/http_status.ts";
import { Context } from "oak/mod.ts";
import { AccessTokens } from "../models/accessToken.model.ts";
import { scopes } from "@/utils/scope.ts";

export const authorize =
  (scope: string[] | string) =>
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

    /*console.log("dbToken", dbToken.accessToken);
    console.log("dbToken", dbToken.scopes);*/
    // check if every scopes in scope is included in dbToken.scopes
    if (
      scope instanceof Array &&
      !scope.every((s) => dbToken.scopes.includes(s))
    ) {
      const missingScopes = scope.filter((s) => !dbToken.scopes.includes(s));
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = {
        message:
          "Unauthorized - Invalid scope, must include " +
          missingScopes.concat(", "),
      };
      return;
    }

    if (typeof scope === "string" && scopes.meet.test == scope) {
      ctx.state.token = dbToken;

      await next();
      return;
    }

    if (typeof scope === "string" && !dbToken.scopes.includes(scope)) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = {
        message: "Unauthorized - Invalid scope, must include " + scope,
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
