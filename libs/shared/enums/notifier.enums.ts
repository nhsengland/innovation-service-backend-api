export enum NotifierTypeEnum {
  INNOVATOR_ACCOUNT_CREATION = 'INNOVATOR_ACCOUNT_CREATION',
  INNOVATION_SUBMITED = 'INNOVATION_SUBMITED',
  NEEDS_ASSESSMENT_COMPLETED = 'NEEDS_ASSESSMENT_COMPLETED',
  INNOVATION_SUPPORT_STATUS_UPDATE = 'INNOVATION_SUPPORT_STATUS_UPDATE',
  INNOVATION_ORGANISATION_UNITS_SUGGESTION = 'INNOVATION_ORGANISATION_UNITS_SUGGESTION',
  ACTION_CREATION = 'ACTION_CREATION',
  ACTION_UPDATE = 'ACTION_UPDATE',
  COMMENT_CREATION = 'COMMENT_CREATION', // TODO: Deprecated!
  THREAD_CREATION = 'THREAD_CREATION',
  THREAD_MESSAGE_CREATION = 'THREAD_MESSAGE_CREATION',
  INNOVATION_ARCHIVED = 'INNOVATION_ARCHIVED',
  INNOVATION_TRANSFER_OWNERSHIP_CREATION = 'INNOVATION_TRANSFER_OWNERSHIP_CREATION',
  INNOVATION_TRANSFER_OWNERSHIP_COMPLETED = 'INNOVATION_TRANSFER_OWNERSHIP_COMPLETED',
  SLS_VALIDATION = 'SLS_VALIDATION',
  // Admin module.
  LOCK_USER = 'LOCK_USER',
  ACCESSOR_UNIT_CHANGE = 'ACCESSOR_UNIT_CHANGE',
  UNIT_INACTIVATION_SUPPORT_COMPLETED = 'UNIT_INACTIVATION_SUPPORT_COMPLETED',
  // RECURRENT
  DAILY_DIGEST = 'DAILY_DIGEST',
  INCOMPLETE_INNOVATION_RECORD = 'INCOMPLETE_INNOVATION_RECORD',
  IDLE_SUPPORT = 'IDLE_SUPPORT',
}
