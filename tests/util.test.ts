import { Request, testing } from "oak/mod.ts";
import { ServerRequestBody } from "oak/types.d.ts";
import { UserSchema, Users } from "@/models/user.model.ts";

export function createPostCtx(body: string, url: string, token?: string) {
  const ctx = testing.createMockContext();

  const request = new Request({
    remoteAddr: undefined,
    headers: new Headers({
      "content-type": "text/plain",
      "content-length": String(body.length),
      host: "localhost",
      Authorization: "Bearer " + token,
    }),
    method: "POST",
    url: url,
    // deno-lint-ignore no-explicit-any
    error(_reason?: any) {},
    getBody(): ServerRequestBody {
      return {
        body: null,
        readBody: () => Promise.resolve(new TextEncoder().encode(body)),
      };
    },
    respond: (_response: Response) => Promise.resolve(),
  });
  ctx.request = request;
  return ctx;
}

export function createGetCtx(url: string) {
  const ctx = testing.createMockContext({
    path: url,
    method: "GET",
  });
  return ctx;
}

export function createTestUser(body?: Partial<UserSchema>) {
  const id = Users.insertOne({
    username: "user1",
    name: "user1",
    email: "",
    apps: [],
    appUsers: [],
    friends: [],
    inwardFriendRequests: [],
    outwardFriendRequests: [],
    declinedFriendRequests: [],
    verified: false,
    createdAt: new Date(),
    ...body,
  });

  return id;
}
