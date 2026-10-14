import mongoose, { Schema, Document, Types } from 'mongoose';

export type ScrollingIntentionType =
  | 'Learning'
  | 'Entertainment'
  | 'Finding Something Specific'
  | 'Taking a Short Break'
  | 'Other / Personal Goal';

export interface ISessionIntention {
  type: ScrollingIntentionType;
  plannedDurationSeconds: number;
  isExceeded: boolean;
  completedWithinPlan: boolean;
  reminderSent: boolean;
  setAt?: Date;
}

export interface ITrackingSession extends Document {
  userId: Types.ObjectId;
  deviceId: string;
  sessionId: string;
  platform: 'instagram' | 'youtube';
  feedType: 'instagram_reels' | 'youtube_shorts';
  startedAt: Date;
  endedAt?: Date;
  activeDurationSeconds: number;
  estimatedVideoViews: number;
  navigationEvents: number;
  detectorVersion: string;
  dataQuality: 'HIGH' | 'MEDIUM' | 'LOW';
  intention?: ISessionIntention;
  userContext?: string;
  createdAt: Date;
}

const TrackingSessionSchema = new Schema<ITrackingSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      enum: ['instagram', 'youtube'],
      required: true,
    },
    feedType: {
      type: String,
      enum: ['instagram_reels', 'youtube_shorts'],
      required: true,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    endedAt: {
      type: Date,
    },
    activeDurationSeconds: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    estimatedVideoViews: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    navigationEvents: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    detectorVersion: {
      type: String,
      default: '1.0.0',
    },
    dataQuality: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      default: 'HIGH',
    },
    intention: {
      type: {
        type: String,
        enum: [
          'Learning',
          'Entertainment',
          'Finding Something Specific',
          'Taking a Short Break',
          'Other / Personal Goal',
        ],
      },
      plannedDurationSeconds: { type: Number, min: 0 },
      isExceeded: { type: Boolean, default: false },
      completedWithinPlan: { type: Boolean, default: false },
      reminderSent: { type: Boolean, default: false },
      setAt: { type: Date },
    },
    userContext: {
      type: String,
      trim: true,
      maxlength: 100,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Prevent duplicate session synchronization
TrackingSessionSchema.index({ userId: 1, sessionId: 1 }, { unique: true });
// Optimize queries by user and date
TrackingSessionSchema.index({ userId: 1, startedAt: -1 });

export const TrackingSession = mongoose.model<ITrackingSession>('TrackingSession', TrackingSessionSchema);
