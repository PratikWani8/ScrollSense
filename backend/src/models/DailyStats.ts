import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDailyStats extends Document {
  userId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  timezone: string;
  instagramDurationSeconds: number;
  youtubeDurationSeconds: number;
  totalDurationSeconds: number;
  estimatedInstagramViews: number;
  estimatedYouTubeViews: number;
  sessionCount: number;
  longSessionCount: number;
  doomscrollScore: number;
  dataQuality: 'HIGH' | 'MEDIUM' | 'LOW';
  updatedAt: Date;
}

const DailyStatsSchema = new Schema<IDailyStats>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    instagramDurationSeconds: {
      type: Number,
      default: 0,
    },
    youtubeDurationSeconds: {
      type: Number,
      default: 0,
    },
    totalDurationSeconds: {
      type: Number,
      default: 0,
    },
    estimatedInstagramViews: {
      type: Number,
      default: 0,
    },
    estimatedYouTubeViews: {
      type: Number,
      default: 0,
    },
    sessionCount: {
      type: Number,
      default: 0,
    },
    longSessionCount: {
      type: Number,
      default: 0,
    },
    doomscrollScore: {
      type: Number,
      default: 0,
    },
    dataQuality: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      default: 'HIGH',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate daily summary records for the same user and date
DailyStatsSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyStats = mongoose.model<IDailyStats>('DailyStats', DailyStatsSchema);
