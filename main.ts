import { Application, Router, isHttpError } from "oak";
import { z } from "zod";
import "loadenv";
import { CorsOptionsDelegate, oakCors } from "cors";

// import { User } from "@/models/user.ts";
import { usersRouter } from "@/routes/user.route.ts";
import { appsRouter } from "@/routes/app.route.ts";
import { authRouter } from "@/routes/auth.route.ts";
import { devRouter } from "@/routes/dev.route.ts";
import { friendshipRouter } from "@/routes/friendship.route.ts";

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

router.use("/users", usersRouter.routes());
router.use("/apps", appsRouter.routes());
console.log(
  Deno.env.get("ENV") == "dev" ? "https://fync.in" : "https://fync.in"
);
const corsOptionsDelegate: CorsOptionsDelegate<Request> = (request) => {
  console.log(request.headers.get("origin"));
  const whitelist = ["https://fync.in"];
  if (Deno.env.get("ENV") == "dev") {
    whitelist.push("http://localhost:8000");
  }

  const isOriginAllowed = whitelist.includes(
    request.headers.get("origin") ?? ""
  );

  return { origin: isOriginAllowed }; //  Reflect (enable) the requested origin in the CORS response if isOriginAllowed is true
};
router.use("/auth", oakCors(corsOptionsDelegate), authRouter.routes());
router.use("/dev", devRouter.routes());
router.use("/friendships", friendshipRouter.routes());

router.get("/", (ctx) => {
  // add a button to login with google
  ctx.response.body = `
  <html>
    <head>
      <title>Auth</title>
      </head>
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
app.use(router.allowedMethods());

//console.log("Server running on port 8000");
//await app.listen({ port: 8000 });
app.addEventListener("listen", (e) => {
  // console.log(Object.keys(e));
  // console.log(e.port, e.listener);
  console.log("Listening on http://localhost:" + e.port + "/");
});

await app.listen({ port: 8080 });
