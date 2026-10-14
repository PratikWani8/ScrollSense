import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGoal extends Document {
  userId: Types.ObjectId;
  platform: 'all' | 'instagram' | 'youtube';
  dailyLimitSeconds: number;
  reminderIntervalMinutes: number;
  quietHours: {
    enabled: boolean;
    startHour: number;
    endHour: number;
  };
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GoalSchema = new Schema<IGoal>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ['all', 'instagram', 'youtube'],
      default: 'all',
    },
    dailyLimitSeconds: {
      type: Number,
      default: 1800, // 30 mins
    },
    reminderIntervalMinutes: {
      type: Number,
      default: 25,
    },
    quietHours: {
      enabled: { type: Boolean, default: true },
      startHour: { type: Number, default: 23 },
      endHour: { type: Number, default: 7 },
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique goal per user per platform
GoalSchema.index({ userId: 1, platform: 1 }, { unique: true });

export const Goal = mongoose.model<IGoal>('Goal', GoalSchema);
