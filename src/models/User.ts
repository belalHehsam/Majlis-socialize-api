import mongoose, { Schema, Document, Types } from "mongoose";
import bcrypt from "bcrypt";

export interface IUserSettings {
  theme: "light" | "dark" | "system";
  language: "en" | "ar";
  isPrivateProfile: boolean;
  allowFriendRequests: boolean;
  showEmail: boolean;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  displayName?: string;
  email: string;
  password: string;
  avatar?: string;
  bio?: string;
  role: "user" | "moderator" | "admin";
  accountStatus: "active" | "suspended" | "deleted";
  settings: IUserSettings;
  passwordChangedAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
  changedPasswordAfter(jwtIssuedAt?: number): boolean;
}

type UserTransformObject = Partial<IUser> & {
  __v?: unknown;
};

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
    },

    displayName: {
      type: String,
      trim: true,
      maxlength: 40,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    avatar: {
      type: String,
    },

    bio: {
      type: String,
      maxlength: 200,
      trim: true,
    },

    role: {
      type: String,
      enum: ["user", "moderator", "admin"],
      default: "user",
    },

    accountStatus: {
      type: String,
      enum: ["active", "suspended", "deleted"],
      default: "active",
    },

    settings: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      language: {
        type: String,
        enum: ["en", "ar"],
        default: "en",
      },
      isPrivateProfile: {
        type: Boolean,
        default: false,
      },
      allowFriendRequests: {
        type: Boolean,
        default: true,
      },
      showEmail: {
        type: Boolean,
        default: false,
      },
    },

    passwordChangedAt: {
      type: Date,
      select: false,
    },

    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        const user = ret as UserTransformObject;
        delete user.password;
        delete user.__v;
        return ret;
      },
    },
  }
);

UserSchema.pre<IUser>("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  if (!this.isNew) {
    this.passwordChangedAt = new Date(Date.now() - 1000);
  }
});

UserSchema.methods.comparePassword = async function (
  this: IUser,
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.changedPasswordAfter = function (
  this: IUser,
  jwtIssuedAt?: number
): boolean {
  if (!jwtIssuedAt || !this.passwordChangedAt) return false;

  const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);
  return jwtIssuedAt < changedTimestamp;
};

export default mongoose.model<IUser>("User", UserSchema);
