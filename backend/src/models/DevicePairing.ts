import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDevicePairing extends Document {
  pairingCode: string;
  deviceId: string;
  deviceName: string;
  extensionVersion: string;
  userId?: Types.ObjectId;
  deviceToken?: string;
  status: 'PENDING' | 'APPROVED' | 'EXPIRED';
  expiresAt: Date;
  createdAt: Date;
}

const DevicePairingSchema = new Schema<IDevicePairing>(
  {
    pairingCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
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
      default: 'Chrome Desktop Extension',
    },
    extensionVersion: {
      type: String,
      default: '1.0.0',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    deviceToken: {
      type: String,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'EXPIRED'],
      default: 'PENDING',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '0s' }, // MongoDB automatic TTL deletion
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const DevicePairing = mongoose.model<IDevicePairing>('DevicePairing', DevicePairingSchema);
