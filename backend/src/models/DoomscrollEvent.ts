import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDoomscrollEvent extends Document {
  userId: Types.ObjectId;
  sessionId?: string;
  detectedAt: Date;
  ruleId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  score: number;
  contributingSignals: Array<{
    factor: string;
    scoreDelta: number;
    description: string;
  }>;
  thresholdValues: Record<string, any>;
  reminderStatus: 'SHOWN' | 'DISMISSED' | 'ACCEPTED';
}

const DoomscrollEventSchema = new Schema<IDoomscrollEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
    },
    detectedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    ruleId: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM',
    },
    score: {
      type: Number,
      required: true,
    },
    contributingSignals: [
      {
        factor: String,
        scoreDelta: Number,
        description: String,
      },
    ],
    thresholdValues: {
      type: Schema.Types.Mixed,
      default: {},
    },
    reminderStatus: {
      type: String,
      enum: ['SHOWN', 'DISMISSED', 'ACCEPTED'],
      default: 'SHOWN',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const DoomscrollEvent = mongoose.model<IDoomscrollEvent>('DoomscrollEvent', DoomscrollEventSchema);
