export const scopes = {
  read: {
    profile: "read:profile",
    email: "read:email",
    friends: "read:friends",
    posts: "read:posts",
  },
  write: {
    profile: "write:profile",
    email: "write:email",
    friends: "write:friends",
    apps: "write:apps",
    friendship: "write:friendship",
  },
  dev: {
    admin: "dev:admin",
  },
} as const;

export type ReadScopeValues = (typeof scopes.read)[keyof typeof scopes.read];
export type WriteScopeValues = (typeof scopes.write)[keyof typeof scopes.write];
export type DevScopeValues = (typeof scopes.dev)[keyof typeof scopes.dev];
export type ScopeValues = ReadScopeValues | WriteScopeValues | DevScopeValues;
