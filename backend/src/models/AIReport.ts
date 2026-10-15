import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAIReport extends Document {
  userId: Types.ObjectId;
  reportId: string;
  periodStart: string;
  periodEnd: string;
  summary: string;
  observations: string[];
  positiveChanges: string[];
  areasToImprove: string[];
  recommendations: string[];
  suggestedGoal?: {
    dailyLimitMinutes: number;
    reasoning: string;
  };
  confidenceNotes: string[];
  dataSufficiency: 'SUFFICIENT' | 'MODERATE' | 'INSUFFICIENT';
  modelVersion: string;
  provider: string;
  createdAt: Date;
}

const AIReportSchema = new Schema<IAIReport>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reportId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    periodStart: {
      type: String,
      required: true,
    },
    periodEnd: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    observations: {
      type: [String],
      default: [],
    },
    positiveChanges: {
      type: [String],
      default: [],
    },
    areasToImprove: {
      type: [String],
      default: [],
    },
    recommendations: {
      type: [String],
      default: [],
    },
    suggestedGoal: {
      dailyLimitMinutes: Number,
      reasoning: String,
    },
    confidenceNotes: {
      type: [String],
      default: [],
    },
    dataSufficiency: {
      type: String,
      enum: ['SUFFICIENT', 'MODERATE', 'INSUFFICIENT'],
      default: 'SUFFICIENT',
    },
    modelVersion: {
      type: String,
      default: 'scrollsense-ai-v1.0',
    },
    provider: {
      type: String,
      default: 'fallback',
    },
  },
  {
    timestamps: true,
  }
);

AIReportSchema.index({ userId: 1, createdAt: -1 });

export const AIReport = mongoose.model<IAIReport>('AIReport', AIReportSchema);
