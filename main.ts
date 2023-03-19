import { Application, Router } from "oak";
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

app.use(router.routes());
app.use(router.allowedMethods());

//console.log("Server running on port 8000");
//await app.listen({ port: 8000 });
app.addEventListener("listen", (e) =>
  console.log("Listening on http://localhost:8000")
);

await app.listen({ port: 8000 });
