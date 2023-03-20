import { Application, Router } from "oak";
import { z } from "zod";
import "loadenv";

// import { User } from "@/models/user.ts";
import { usersRouter } from "@/routes/user.route.ts";
import { appsRouter } from "@/routes/app.route.ts";
import { authRouter } from "@/routes/auth.route.ts";

const app = new Application();
const router = new Router();

router.use("/users", usersRouter.routes());
router.use("/apps", appsRouter.routes());
router.use("/auth", authRouter.routes());

router.get("/", (ctx) => {
  // add a button to login with google
  ctx.response.body = `
  <html>
    <head>
      <title>Auth</title>
      </head>
      <body>
        
        <a href="/auth/google">Login with Google</a>
        </body>
        </html>
          
        `;
});

const envParser = z.object({
  ENV: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),

  DB_SERVERS: z.string(),
  DB_NAME: z.string(),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string(),
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
app.addEventListener("listen", (e) =>
  console.log("Listening on http://localhost:8080")
);

await app.listen({ port: 8080 });
