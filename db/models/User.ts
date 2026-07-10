import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  name: string;
  avatar: string;
  salt?: string;
  hash?: string;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  avatar: {
    type: String,
    required: true,
  },
  salt: {
    type: String, // Keeping for legacy/mock auth endpoints if we retain them
  },
  hash: {
    type: String, // Keeping for legacy/mock auth endpoints if we retain them
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const UserModel = mongoose.models.User || mongoose.model<IUser>("User", userSchema);
