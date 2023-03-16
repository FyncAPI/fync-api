import { Application, Router } from "oak";
import "https://deno.land/std@0.127.0/dotenv/load.ts";

// import { User } from "@/models/user.ts";
import { usersRouter } from "@/routes/user.route.ts";
import { appsRouter } from "./routes/app.route.ts";
const app = new Application();
const router = new Router();

router.use("/users", usersRouter.routes());
router.use("/apps", appsRouter.routes());

router.get("/", (ctx) => {
  ctx.response.body = "Hello World From Deno Edge";
});

app.use(router.routes());
app.use(router.allowedMethods());

//console.log("Server running on port 8000");
//await app.listen({ port: 8000 });
app.addEventListener("listen", (e) =>
  console.log("Listening on http://localhost:8080")
);

await app.listen({ port: 8080 });
