import { JoiHelper } from '@notifications/shared/helpers';
import type { AuditEntry } from '@notifications/shared/services/integrations/audit.service';
import { ActionEnum, TargetEnum } from '@notifications/shared/services/integrations/audit.service';
import Joi from 'joi';

export type AuditMessageEntry = Omit<AuditEntry, 'date'> & { date: Date };

export const MessageSchema = Joi.object<AuditMessageEntry>({
  date: Joi.date().required(),
  action: JoiHelper.AppCustomJoi()
    .string()
    .allow(...Object.values(ActionEnum))
    .required(),
  functionName: JoiHelper.AppCustomJoi().string(),
  innovationId: JoiHelper.AppCustomJoi().string(),
  invocationId: JoiHelper.AppCustomJoi().string(),
  target: JoiHelper.AppCustomJoi()
    .string()
    .allow(...Object.values(TargetEnum))
    .required(),
  targetId: JoiHelper.AppCustomJoi().string(),
  user: JoiHelper.AppCustomJoi().string().required()
}).required();
