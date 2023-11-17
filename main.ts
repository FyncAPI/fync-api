import { Application, isHttpError, Router } from "oak";
import { z } from "zod";
import "loadenv";
import { CorsOptionsDelegate, oakCors } from "cors";
// import { User } from "@/models/user.ts";
import { usersRouter } from "@/routes/user.route.ts";
import { appsRouter } from "@/routes/app.route.ts";
import { authRouter } from "@/routes/auth.route.ts";
import { devRouter } from "@/routes/dev.route.ts";
import { friendshipRouter } from "@/routes/friendship.route.ts";
import {
  App,
  appParser,
  Apps,
  AppSchema,
  createAppParser,
} from "@/models/app.model.ts";
import { toHashString } from "std/crypto/mod.ts";
import * as bcrypt from "bcrypt";
import { meRouter } from "@/routes/me.route.ts";
import { v1 } from "std/uuid/mod.ts";
import { v1Router } from "@/routes/v1/v1.route.ts";

const app = new Application();
const router = new Router();

app.use(async (context, next) => {
  try {
    await next();
  } catch (err) {
    if (isHttpError(err)) {
      context.response.status = err.status;
    } else {
      context.response.status = 500;
    }
    context.response.body = { error: err.message };
    context.response.type = "json";
  }
});

// logging middleware
app.use(async (ctx, next) => {
  await next();
  // const rt = ctx.response.headers.get("X-Response-Time");
  console.log(ctx.request.hasBody);
  console.log(`${ctx.request.method} ${ctx.request.url} - `);
});

router.use("/users", usersRouter.routes());
router.use("/apps", appsRouter.routes());
router.use("/auth", authRouter.routes());
router.use("/dev", devRouter.routes());
router.use("/me", meRouter.routes());
router.use("/friendships", friendshipRouter.routes());

router.use("/v1", v1Router.routes());
// router.get("/x", async (ctx) => {
//   const accessToken =
//     Deno.env.get("ENV") == "dev"
//       ? await bcrypt.hash("test", await bcrypt.genSalt(10))
//       : bcrypt.hashSync("testets", bcrypt.genSaltSync(10));

//   ctx.response.body = { accessToken };
// });
router.get("/setup", async (ctx) => {
  // check if db is empty
  const appCount = await Apps.countDocuments();
  if (appCount > 0) {
    ctx.response.body = { error: "Apps already exist" };
    return;
  }
  // create app in db as fync
  const clientId = crypto.randomUUID();

  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(crypto.randomUUID())
  ); // hash the message ')

  const clientSecret = toHashString(hash);

  const fyncAppId = await Apps.insertOne({
    name: "Fync",
    description: "Sync your frinds",
    url: "https://fync.in",
    clientId,
    clientSecret,
    createdAt: new Date(),
    redirects: ["https://fync.in/auth/callback"],
    events: [],
    users: [],
    interactions: [],
  });

  ctx.response.body = { fyncAppId, clientId, clientSecret };
});

router.get("/", (ctx) => {
  // add a button to login with google
  ctx.response.body = `
  <html>
    <body>
      <h1>Welcome to Fync API</h1>
    </body>
  </html>
`;
});

router.get("/docs", async (ctx) => {
  await ctx.send({
    root: `${Deno.cwd()}/api-docs`,
    index: "docs.html",
    path: "/docs.html",
  });
});

const envParser = z.object({
  ENV: z.string(),
  DB_SERVERS: z.string(),
  DB_NAME: z.string(),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string(),

  B2APPKEY: z.string(),
  B2KEYID: z.string(),
  B2BUCKETNAME: z.string(),
  B2BUCKETID: z.string(),
});

const result = envParser.safeParse(Deno.env.toObject());

if (!result.success) {
  console.log(result.error);
  Deno.exit(1);
}

app.use(router.routes());
// app.use(router.allowedMethods());

//console.log("Server running on port 8000");
//await app.listen({ port: 8000 });
app.addEventListener("listen", (e) => {
  // console.log(Object.keys(e));
  // console.log(e.port, e.listener);
  console.log("Listening on http://localhost:" + e.port + "/");
});

await app.listen({ port: 8080 });
