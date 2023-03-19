import { Router } from "oak";
import DenoGrant, { OAuth2Client, Providers } from "deno_grant";

const denoGrant = new DenoGrant({
  base_uri: "http://localhost:8000",
  strategies: [
    {
      provider: Providers.google,
      client_id:
        "748868697696-6k75r69uus5mcraofn0lkqassrf5pg0r.apps.googleusercontent.com",
      client_secret: "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",
      redirect_path: "/auth/google/callback",
      scope: "openid profile",
    },
  ],
});

export const authRouter = new Router();

authRouter.get("/google", (ctx) => {
  //   ctx.response.body = "Google Auth";
  if (denoGrant) {
    const googleAuthorizationURI = denoGrant
      .getAuthorizationUri(Providers.google)
      .toString();
    ctx.response.redirect(googleAuthorizationURI);
  }
});
