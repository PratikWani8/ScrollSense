import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITrackingEvent extends Document {
  userId: Types.ObjectId;
  deviceId: string;
  eventId: string;
  sessionId: string;
  eventType: string;
  platform: 'instagram' | 'youtube';
  feedType: 'instagram_reels' | 'youtube_shorts';
  candidateId: string;
  occurredAt: Date;
  durationSeconds: number;
  detectorVersion: string;
  confidence: number;
  createdAt: Date;
}

const TrackingEventSchema = new Schema<ITrackingEvent>(
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
    eventId: {
      type: String,
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      default: 'QUALIFIED_VIEW',
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
    candidateId: {
      type: String,
      required: true,
    },
    occurredAt: {
      type: Date,
      required: true,
    },
    durationSeconds: {
      type: Number,
      default: 2.0,
    },
    detectorVersion: {
      type: String,
      default: '1.0.0',
    },
    confidence: {
      type: Number,
      default: 1.0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Prevent duplicate event ingestion
TrackingEventSchema.index({ userId: 1, eventId: 1 }, { unique: true });
TrackingEventSchema.index({ userId: 1, occurredAt: -1 });

export const TrackingEvent = mongoose.model<ITrackingEvent>('TrackingEvent', TrackingEventSchema);
