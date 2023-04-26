import {
  ActionEnum,
  AuditEntry,
  TargetEnum,
} from '@notifications/shared/services/integrations/audit.service';
import Joi from 'joi';

export type AuditMessageEntry = Omit<AuditEntry, 'date'> & { date: Date };

export const MessageSchema = Joi.object<AuditMessageEntry>({
  date: Joi.date().required(),
  action: Joi.string()
    .allow(...Object.values(ActionEnum))
    .required(),
  functionName: Joi.string(),
  innovationId: Joi.string(),
  invocationId: Joi.string(),
  target: Joi.string()
    .allow(...Object.values(TargetEnum))
    .required(),
  targetId: Joi.string(),
  user: Joi.string().required(),
}).required();
