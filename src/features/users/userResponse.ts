import { IUser } from "../../models/User";

type UserBaseResponse = {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  settings: IUser["settings"];
  createdAt: Date;
  updatedAt: Date;
};

export const buildProfileResponse = (user: IUser): UserBaseResponse => ({
  id: user._id.toString(),
  username: user.username,
  displayName: user.displayName,
  email: user.settings?.showEmail ? user.email : undefined,
  avatar: user.avatar,
  bio: user.bio,
  settings: user.settings,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const buildAuthResponse = (user: IUser) => ({
  ...buildProfileResponse(user),
  email: user.email,
  role: user.role,
  accountStatus: user.accountStatus,
  lastLoginAt: user.lastLoginAt,
});
