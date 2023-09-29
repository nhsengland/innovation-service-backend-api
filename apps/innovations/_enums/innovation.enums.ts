export enum InnovationLocationEnum {
  'England' = 'England',
  'Scotland' = 'Scotland',
  'Wales' = 'Wales',
  'Northern Ireland' = 'Northern Ireland',
  'Based outside UK' = 'Based outside UK'
}

export enum InnovationFileUploadContextEnum {
  // These items represent 4 sections where file upload is possible.
  EVIDENCE_OF_EFFECTIVENESS = 'EVIDENCE_OF_EFFECTIVENESS',
  TESTING_WITH_USERS = 'TESTING_WITH_USERS',
  REGULATIONS_AND_STANDARDS = 'REGULATIONS_AND_STANDARDS',
  IMPLEMENTATION_PLAN = 'IMPLEMENTATION_PLAN'
}

export enum InnovationThreadSubjectEnum {
  NEEDS_ASSESSMENT_START = 'Needs assessment process started',
  NEEDS_ASSESSMENT_COMPLETE = 'Needs assessment process completed',
  INNOVATION_SUPPORT_UPDATE = '{{Unit}} is supporting this innovation'
}

export enum InnovationStatisticsEnum {
  SECTIONS_SUBMITTED_COUNTER = 'SECTIONS_SUBMITTED_COUNTER',
  TASKS_OPEN_COUNTER = 'TASKS_OPEN_COUNTER',
  TASKS_RESPONDED_COUNTER = 'TASKS_RESPONDED_COUNTER',
  UNREAD_MESSAGES_COUNTER = 'UNREAD_MESSAGES_COUNTER',
  SECTIONS_SUBMITTED_SINCE_SUPPORT_START_COUNTER = 'SECTIONS_SUBMITTED_SINCE_SUPPORT_START_COUNTER',
  SECTIONS_SUBMITTED_SINCE_ASSESSMENT_START_COUNTER = 'SECTIONS_SUBMITTED_SINCE_ASSESSMENT_START_COUNTER',
  UNREAD_MESSAGES_THREADS_INITIATED_BY_COUNTER = 'UNREAD_MESSAGES_THREADS_INITIATED_BY_COUNTER',
  PENDING_EXPORT_REQUESTS_COUNTER = 'PENDING_EXPORT_REQUESTS_COUNTER'
}
