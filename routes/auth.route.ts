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
import { oakCors } from "https://deno.land/x/cors@v1.2.2/oakCors.ts";
import { AccessTokens } from "@/models/accessToken.ts";
import { Devs } from "@/models/dev.model.ts";
import { scopes } from "@/utils/scope.ts";

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

  console.log(form);

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

    // const profilePic = new File([file.content], file.filename || "zry", {
    //   type: file.contentType,
    // });

    // const optimizedPfp = await optimizeImage(profilePic);

    // const imgUrl = await UploadFile(
    //   optimizedPfp,
    //   "prof" + body.fields.name + Date.now()
    // );

    const userData = result.data;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const userId = await Users.insertOne({
      ...userData,
      // profilePicture: "Testimg",
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
      // profilePicture: imgUrl,
      birthday: userData.birthdate,
      provider: ["email"],
      apps: [],
      appUsers: [],
      friends: [],
      verified: false,

      createdAt: new Date(),
    };

    console.log(user, "userser created");
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

authRouter.post(
  "/authorize",
  oakCors({
    origin: "https://fync.in",
  }),
  async (ctx) => {
    const { clientId, userId, scopes } = await ctx.request.body({
      type: "json",
    }).value;
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
  }
);

authRouter.post("/access_token", async (ctx) => {
  console.log("got here");
  const body = await ctx.request.body({
    type: "form",
  }).value;

  const headers = ctx.request.headers;
  console.log(headers, "headers");

  // const { code, client_id, client_secret, grant_type } = body;
  const code = body.get("code");
  const client_id =
    body.get("client_id") ||
    atob(headers.get("Authorization")?.split(" ")[1] || "").split(":")[0];
  const client_secret =
    body.get("client_secret") ||
    atob(headers.get("Authorization")?.split(" ")[1] || "").split(":")[1];
  const grant_type = body.get("grant_type");

  console.log(body, code, client_id, "fso");

  if (!code || !client_id || !grant_type) {
    ctx.response.status = 400;
    ctx.response.body = {
      error: "Invalid request",
    };
    console.log("Invalid request");
    return;
  }

  console.log(code, client_id, client_secret, grant_type, "so");

  const authCode = await AuthCodes.findOne({
    _id: new ObjectId(code),
    clientId: client_id,
  });

  if (!authCode) {
    ctx.response.status = 404;
    ctx.response.body = {
      error: "Auth code not found",
    };
    console.log("Auth code not found");
    return;
  }

  if (authCode.used) {
    ctx.response.status = 400;
    ctx.response.body = {
      error: "Auth code already used",
    };
    console.log("Auth code already used");
    return;
  }

  if (authCode.scopes.includes(scopes.dev.admin)) {
    const dev = await Devs.findOne({ userId: new ObjectId(authCode.userId) });
    console.log("dev", dev);
    if (!dev) {
      // create dev
      const devId = await Devs.insertOne({
        userId: new ObjectId(authCode.userId),
        apps: [],
        createdAt: new Date(),
      });

      await Users.updateOne(
        { _id: new ObjectId(authCode.userId) },
        { $set: { devId: devId } }
      );
    }
  }

  // check if client id and secret match
  const app = await Apps.findOne({ clientId: client_id });

  if (!app) {
    ctx.response.status = 404;
    ctx.response.body = {
      error: "App not found",
    };
    console.log("App not found");
    return;
  }

  if (app.clientSecret != client_secret) {
    ctx.response.status = 400;
    ctx.response.body = {
      error: "Invalid client secret",
    };
    console.log("Invalid client secret");
    return;
  }

  const user = await Users.findOne({ _id: new ObjectId(authCode.userId) });

  if (!user) {
    ctx.response.status = 404;
    ctx.response.body = {
      error: "User not found",
    };
    console.log("User not found");
    return;
  }

  const access_token = await bcrypt.hash(
    authCode._id.toString(),
    await bcrypt.genSalt(10)
  );

  // const refresh_token = await bcrypt.hash(
  //   authCode._id.toString(),
  //   await bcrypt.genSalt(10)
  // );

  const tokenId = await AccessTokens.insertOne({
    accessToken: access_token,
    tokenType: "Bearer",
    // refresh_token,
    clientId: authCode.clientId,
    userId: authCode.userId,
    expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
    scopes: authCode.scopes,
  });

  await AuthCodes.updateOne(
    { _id: new ObjectId(code) },
    { $set: { used: true } }
  );

  const token = await AccessTokens.findOne({ _id: new ObjectId(tokenId) });

  console.log(token);
  ctx.response.status = 201;
  ctx.response.type = "json";
  ctx.response.body = {
    access_token: token?.accessToken,
    token_type: "Bearer",
    expires_in: 1000 * 60 * 60 * 24 * 5, // Token expiration in seconds
    scope: authCode.scopes.join(","), // Adjust based on your scopes
  };

  console.log(
    {
      access_token: token?.accessToken,
      token_type: "Bearer",
      expires_in: 1000 * 60 * 60 * 24 * 5, // Token expires in 5 days
      scope: authCode.scopes.join(","), // Adjust based on your scopes
    },
    "uor"
  );
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
