export const scopes = {
  read: {
    profile: "profile.read",
    // email: "read:email",
    friends: "friends.read",
    posts: "posts.read",
    interaction: "interaction.read",
  },
  write: {
    // profile: "should",
    // email: "write:email",
    friends: "friends.write",
    apps: "apps.write",
    friendship: "friendship.write",
    interaction: "interaction.write",
  },
  dev: {
    admin: "dev:admin",
  },
} as const;
// export const scopes = {
//   profile: ["profile.read"],
//   posts: ["posts.read"],
//   apps: ["apps.read"],
//   friend: ["friends.read", "friendrequest.send", "friendrequest.read"],
//   dev: ["dev:admin"],
// };

export type ReadScopeValues = (typeof scopes.read)[keyof typeof scopes.read];
export type WriteScopeValues = (typeof scopes.write)[keyof typeof scopes.write];
export type DevScopeValues = (typeof scopes.dev)[keyof typeof scopes.dev];
export type ScopeValues = ReadScopeValues | WriteScopeValues | DevScopeValues;
