import { IUser } from "../../models/User";

export type FriendshipStatus = "none" | "pending_sent" | "pending_received" | "accepted";

type UserBaseResponse = {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  avatar?: string;
  coverPhoto?: string;
  bio?: string;
  settings: IUser["settings"];
  createdAt: Date;
  updatedAt: Date;
};

type PublicUserProfileResponse = {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  coverPhoto?: string;
  bio?: string;
  createdAt?: Date;
  friendshipStatus: FriendshipStatus;
  isPrivate?: boolean;
};

export const buildProfileResponse = (user: IUser): UserBaseResponse => ({
  id: user._id.toString(),
  username: user.username,
  displayName: user.displayName,
  email: user.settings?.showEmail ? user.email : undefined,
  avatar: user.avatar,
  coverPhoto: user.coverPhoto,
  bio: user.bio,
  settings: user.settings,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const buildPublicProfileResponse = (
  user: IUser,
  friendshipStatus: FriendshipStatus,
  isPrivate = false
): PublicUserProfileResponse => {
  const base = {
    id: user._id.toString(),
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    coverPhoto: user.coverPhoto,
    bio: user.bio,
    friendshipStatus,
  };

  if (isPrivate) {
    return {
      ...base,
      isPrivate: true,
    };
  }

  return {
    ...base,
    createdAt: user.createdAt,
    isPrivate: false,
  };
};

export const buildAuthResponse = (user: IUser) => ({
  ...buildProfileResponse(user),
  email: user.email,
  role: user.role,
  lastLoginAt: user.lastLoginAt,
});
