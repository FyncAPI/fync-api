import { Router } from "oak";
import * as bcrypt from "bcrypt";
import {
  createEmailUserParser,
  createUserParser,
  Users,
} from "@/models/user.model.ts";
import { UploadFile } from "@/storage.ts";
import { optimizeImage } from "@/image.ts";
import { Apps } from "@/models/app.model.ts";
import { AuthCodes } from "@/models/authCode.model.ts";
import { ObjectId } from "mongo";

// const denoGrant = new DenoGrant({
//   base_uri:
//     Deno.env.get("ENV") == "dev"
//       ? "http://localhost:8080"
//       : "https://fync-api.deno.dev",
//   strategies: [
//     {
//       provider: Providers.google,
//       client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
//       client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
//       redirect_path: "/auth/google/callback",
//       scope: "email openid profile",
//     },
//   ],
// });

export const authRouter = new Router();

authRouter.post("/email/register", async (ctx) => {
  // const body = await ctx.request.body({ type: "json" }).value;
  const form = ctx.request.body({ type: "form-data" }).value;
  const body = await form.read({
    maxSize: 10000000,
  });
  const file = body.files?.[0];

  if (!file || !file.content) {
    ctx.response.body = {
      error: "No pfp",
    };
    return;
  }

  const result = createEmailUserParser.safeParse(body.fields);

  if (!result.success) {
    const error = result.error.flatten();
    console.log(error);
    ctx.response.body = error;
  } else {
    // creaete user
    // check if user exists

    const userex = await Users.findOne({
      $or: [{ email: result.data.email }, { username: result.data.username }],
    });

    if (userex) {
      const sameEmail = userex.email == result.data.email;
      const sameUsername = userex.username == result.data.username;

      ctx.response.body = {
        error:
          "User already exists. Please change your " +
          (sameEmail ? "Email" : "Username") +
          " or login.",
      };
      return;
    }

    const profilePic = new File([file.content], file.filename || "zry", {
      type: file.contentType,
    });

    const optimizedPfp = await optimizeImage(profilePic);

    const imgUrl = await UploadFile(
      optimizedPfp,
      "prof" + body.fields.name + Date.now()
    );

    const userData = result.data;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const userId = await Users.insertOne({
      ...userData,
      profilePicture: imgUrl,
      password: hashedPassword,
      provider: ["email"],
      apps: [],
      appUsers: [],
      friends: [],
      verified: false,
      // friendRequests: [],

      createdAt: new Date(),
    });

    const user = {
      _id: userId,
      name: userData.name,
      email: userData.email,
      username: userData.username,
      profilePicture: imgUrl,
      birthday: userData.birthdate,
      provider: ["email"],
      apps: [],
      appUsers: [],
      friends: [],
      verified: false,

      createdAt: new Date(),
    };

    ctx.response.body = {
      message: "User created",
      user: user,
    };
  }
});

authRouter.post("/email", async (ctx) => {
  const body = await ctx.request.body({ type: "json" }).value;

  const { email, password } = body;
  console.log(email, password);

  const userData = await Users.findOne({ email });

  if (!userData || !userData.password) {
    ctx.response.body = {
      error: "User not found",
    };
    return;
  }

  const validPassword = await bcrypt.compare(password, userData.password);
  if (!validPassword) {
    ctx.response.body = {
      error: "Invalid password",
    };
    return;
  }

  delete userData.password;
  console.log("User logged in", userData);

  ctx.response.body = {
    message: "User logged in",
    userData,
  };
});

authRouter.post("/email/check", async (ctx) => {
  const body = await ctx.request.body({ type: "json" }).value;

  const { email } = body;

  const user = await Users.findOne({ email });

  if (user) {
    ctx.response.body = {
      available: false,
    };
    return;
  }
  ctx.response.body = {
    available: true,
  };

  return;
});

authRouter.post("/email/verify", async (ctx) => {
  const body = await ctx.request.body({ type: "json" }).value;

  const { email, code } = body.value;
});

authRouter.post("/authorize", async (ctx) => {
  const { clientId, userId, scopes } = await ctx.request.body({ type: "json" })
    .value;
  console.log(clientId, userId, scopes);

  const user = await Users.findOne({ _id: new ObjectId(userId) });
  if (!user) {
    ctx.response.status = 404;
    ctx.response.body = {
      error: "User not found",
    };
    console.log("User not found");
    return;
  }

  const app = await Apps.findOne({ clientId });
  if (!app) {
    ctx.response.status = 404;
    ctx.response.body = {
      error: "App not found",
    };
    console.log("App not found");
    return;
  }

  const authCodeId = await AuthCodes.insertOne({
    clientId,
    userId,
    expireAt: new Date(Date.now() + 1000 * 60 * 10),
    scopes,
    used: false,
  });

  ctx.response.status = 201;
  ctx.response.body = {
    code: authCodeId,
  };
  console.log("Auth code created");

  return;
});

// authRouter.get("/google", (ctx) => {
//   //   ctx.response.body = "Google Auth";
//   const googleAuthorizationURI = denoGrant
//     ?.getAuthorizationUri(Providers.google)
//     ?.toString();

//   if (googleAuthorizationURI) {
//     ctx.response.redirect(googleAuthorizationURI);
//   }
// });

// authRouter.get("/google/callback", async (ctx) => {
//   const tokens = await denoGrant.getToken(Providers.google, ctx.request.url);

//   if (!tokens) {
//     ctx.response.body = {
//       error: "Invalid token",
//     };
//     return;
//   }

//   const profile = await denoGrant.getProfile(
//     Providers.google,
//     tokens.accessToken
//   );

//   if (!profile) {
//     ctx.response.body = {
//       error: "Invalid profile",
//     };
//     return;
//   }

//   ctx.response.body = {
//     profile,
//     tokens,
//   };
// });
