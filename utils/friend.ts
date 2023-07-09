import { ObjectId } from "mongo";
import { UserSchema } from "../models/user.model.ts";

export function validateAddFriendRequest(
  user: UserSchema | undefined,
  friendId: string
): { valid: boolean; message?: string } {
  if (!user || !ObjectId.isValid(user._id)) {
    return { valid: false, message: "Invalid user ID" };
  }

  const friendIdObj = new ObjectId(friendId);
  if (!ObjectId.isValid(friendIdObj)) {
    return { valid: false, message: "Invalid friend ID" };
  }

  if (user._id === new ObjectId(friendId)) {
    return {
      valid: false,
      message: "User ID and friend ID cannot be the same",
    };
  }

  const friend = user.friends.includes(friendIdObj);
  if (friend) {
    return {
      valid: false,
      message: "User is already friends with this friend",
    };
  }

  const outwardFriendRequest =
    user.outwardFriendRequests?.includes(friendIdObj);
  if (outwardFriendRequest) {
    return {
      valid: false,
      message: "User has already sent a friend request to this friend",
    };
  }

  // Add any additional validation checks here

  return { valid: true };
}
