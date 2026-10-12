import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDevice extends Document {
  userId: Types.ObjectId;
  deviceId: string;
  deviceName: string;
  extensionVersion: string;
  deviceTokenHash: string;
  lastSyncAt?: Date;
  syncEnabled: boolean;
  createdAt: Date;
}

const DeviceSchema = new Schema<IDevice>(
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
      trim: true,
    },
    deviceName: {
      type: String,
      required: true,
      trim: true,
      default: 'Chrome Desktop Extension',
    },
    extensionVersion: {
      type: String,
      default: '1.0.0',
    },
    deviceTokenHash: {
      type: String,
      required: true,
    },
    lastSyncAt: {
      type: Date,
    },
    syncEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Prevent duplicate deviceId per user
DeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export const Device = mongoose.model<IDevice>('Device', DeviceSchema);
