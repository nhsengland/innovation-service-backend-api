import { model, Model, models, Schema } from 'mongoose';

const ttl = process.env['SLS_TTL'] ? parseInt(process.env['SLS_TTL']) : 300;

export enum SLSEventTypeEnum {
  LOGIN = 'LOGIN',
  ADMIN_HEALTH = 'ADMIN_HEALTH',
  ADMIN_CREATE_USER = 'ADMIN_CREATE_USER',
  ADMIN_LOCK_USER = 'ADMIN_LOCK_USER',
  ADMIN_UNLOCK_USER = 'ADMIN_UNLOCK_USER',
  // ADMIN_SEARCH_USER = 'ADMIN_SEARCH_USER', // TODO: On search???
  ADMIN_LOCK_VALIDATION = 'ADMIN_LOCK_VALIDATION',
  ADMIN_UPDATE_USER = 'ADMIN_UPDATE_USER'
}


type SLSSchemaType = {
  id: string;
  userId: string;
  eventType: string;
  code: string;
  validatedAt: Date;
  createdAt: string;
  updatedAt: string;
};

const SLSSchema = new Schema<SLSSchemaType>(
  {
    id: Schema.Types.ObjectId,
    userId: Schema.Types.String,
    code: Schema.Types.String,
    eventType: {
      type: String,
      enum: Object.values(SLSEventTypeEnum),
      default: 'LOGIN'
    },
    validatedAt: { type: Date }
  },
  { timestamps: true }
);

SLSSchema.index({ _ts: 1 }, { expireAfterSeconds: ttl });

export const SLSModel: Model<SLSSchemaType> = models['TTL2ls'] || model('SLS', SLSSchema);
