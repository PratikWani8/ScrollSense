import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  displayName: string;
  timezone: string;
  preferences: {
    trackingEnabled: boolean;
    videoViewEstimationEnabled: boolean;
    breakRemindersEnabled: boolean;
    retentionDays: number;
  };
  dailyGoals: {
    shortVideoMinutes: number;
  };
  quietHours: {
    enabled: boolean;
    startHour: number;
    endHour: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    preferences: {
      trackingEnabled: { type: Boolean, default: true },
      videoViewEstimationEnabled: { type: Boolean, default: true },
      breakRemindersEnabled: { type: Boolean, default: true },
      retentionDays: { type: Number, default: 30, min: 7, max: 365 },
    },
    dailyGoals: {
      shortVideoMinutes: { type: Number, default: 30 },
    },
    quietHours: {
      enabled: { type: Boolean, default: true },
      startHour: { type: Number, default: 23 },
      endHour: { type: Number, default: 7 },
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
