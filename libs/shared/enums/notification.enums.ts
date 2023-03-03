export enum NotificationContextTypeEnum {
  NEEDS_ASSESSMENT = 'NEEDS_ASSESSMENT',
  INNOVATION = 'INNOVATION',
  SUPPORT = 'SUPPORT',
  ACTION = 'ACTION',
  THREAD = 'THREAD',
  COLLABOARATOR = 'COLLABORATOR',
  COMMENT = 'COMMENT' // TODO: Deprecated!
}

export enum NotificationContextDetailEnum {
  LOCK_USER = 'LOCK_USER',
  THREAD_CREATION = 'THREAD_CREATION',
  THREAD_MESSAGE_CREATION = 'THREAD_MESSAGE_CREATION',
  COMMENT_CREATION = 'COMMENT_CREATION', // TODO: Deprecated!
  COMMENT_REPLY = 'COMMENT_REPLY', // TODO: Deprecated!
  ACTION_CREATION = 'ACTION_CREATION',
  ACTION_UPDATE = 'ACTION_UPDATE',
  NEEDS_ASSESSMENT_COMPLETED = 'NEEDS_ASSESSMENT_COMPLETED',
  NEEDS_ASSESSMENT_ORGANISATION_SUGGESTION = 'NEEDS_ASSESSMENT_ORGANISATION_SUGGESTION',
  INNOVATION_SUBMISSION = 'INNOVATION_SUBMISSION',
  SUPPORT_STATUS_UPDATE = 'SUPPORT_STATUS_UPDATE',
  INNOVATION_REASSESSMENT_REQUEST = 'INNOVATION_REASSESSMENT_REQUEST',
  INNOVATION_STOP_SHARING = 'INNOVATION_STOP_SHARING',
  COLLABORATOR_INVITE = 'COLLABORATOR_INVITE',
  COLLABORATOR_UPDATE = 'COLLABORATOR_UPDATE'
}


export enum EmailNotificationTypeEnum { // Subset of NotificationContextTypeEnum.
  ACTION = 'ACTION',
  COMMENT = 'COMMENT', // TODO: This should be deprecated in the future. Still active for now...
  SUPPORT = 'SUPPORT'
}

export enum EmailNotificationPreferenceEnum {
  NEVER = 'NEVER',
  INSTANTLY = 'INSTANTLY',
  DAILY = 'DAILY'
}


export enum NotificationLogTypeEnum {
  QA_A_IDLE_SUPPORT = 'QA_A_IDLE_SUPPORT'
}
