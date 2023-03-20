import { Router } from "oak";
import DenoGrant, { OAuth2Client, Providers } from "deno_grant";

const denoGrant = new DenoGrant({
  base_uri:
    Deno.env.get("ENV") == "dev"
      ? "http://localhost:8080"
      : "https://fync-api.deno.dev",
  strategies: [
    {
      provider: Providers.google,
      client_id:
        "748868697696-6k75r69uus5mcraofn0lkqassrf5pg0r.apps.googleusercontent.com",
      client_secret: "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",
      redirect_path: "/auth/google/callback",
      scope: "email openid profile",
    },
  ],
});

export const authRouter = new Router();

authRouter.get("/google", (ctx) => {
  //   ctx.response.body = "Google Auth";
  const googleAuthorizationURI = denoGrant
    ?.getAuthorizationUri(Providers.google)
    ?.toString();

  if (googleAuthorizationURI) {
    ctx.response.redirect(googleAuthorizationURI);
  }
});

authRouter.get("/google/callback", async (ctx) => {
  const tokens = await denoGrant.getToken(Providers.google, ctx.request.url);

  if (!tokens) {
    ctx.response.body = {
      error: "Invalid token",
    };
    return;
  }

  const profile = await denoGrant.getProfile(
    Providers.google,
    tokens.accessToken
  );

  if (!profile) {
    ctx.response.body = {
      error: "Invalid profile",
    };
    return;
  }

  ctx.response.body = {
    profile,
    tokens,
  };
});
