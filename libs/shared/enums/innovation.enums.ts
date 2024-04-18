export enum InnovationStatusEnum {
  CREATED = 'CREATED',
  WAITING_NEEDS_ASSESSMENT = 'WAITING_NEEDS_ASSESSMENT',
  NEEDS_ASSESSMENT = 'NEEDS_ASSESSMENT',
  IN_PROGRESS = 'IN_PROGRESS',
  // NEEDS_ASSESSMENT_REVIEW = 'NEEDS_ASSESSMENT_REVIEW', // Not it use nowadays.
  WITHDRAWN = 'WITHDRAWN',
  ARCHIVED = 'ARCHIVED'
}

export enum InnovationGroupedStatusEnum {
  RECORD_NOT_SHARED = 'RECORD_NOT_SHARED',
  AWAITING_NEEDS_ASSESSMENT = 'AWAITING_NEEDS_ASSESSMENT',
  NEEDS_ASSESSMENT = 'NEEDS_ASSESSMENT',
  AWAITING_SUPPORT = 'AWAITING_SUPPORT',
  RECEIVING_SUPPORT = 'RECEIVING_SUPPORT',
  NO_ACTIVE_SUPPORT = 'NO_ACTIVE_SUPPORT',
  AWAITING_NEEDS_REASSESSMENT = 'AWAITING_NEEDS_REASSESSMENT',
  WITHDRAWN = 'WITHDRAWN',
  ARCHIVED = 'ARCHIVED'
}

export enum InnovationTaskStatusEnum {
  OPEN = 'OPEN',
  DONE = 'DONE',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED'
}

export enum InnovationSectionStatusEnum {
  NOT_STARTED = 'NOT_STARTED',
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED'
}

export enum InnovationSupportStatusEnum {
  UNASSIGNED = 'UNASSIGNED',
  ENGAGING = 'ENGAGING',
  WAITING = 'WAITING',
  UNSUITABLE = 'UNSUITABLE',
  CLOSED = 'CLOSED'
}

export enum InnovationTransferStatusEnum {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  DECLINED = 'DECLINED',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED'
}

export enum InnovationSupportLogTypeEnum {
  STATUS_UPDATE = 'STATUS_UPDATE',
  ACCESSOR_SUGGESTION = 'ACCESSOR_SUGGESTION',
  ASSESSMENT_SUGGESTION = 'ASSESSMENT_SUGGESTION',
  PROGRESS_UPDATE = 'PROGRESS_UPDATE',
  INNOVATION_ARCHIVED = 'INNOVATION_ARCHIVED',
  STOP_SHARE = 'STOP_SHARE'
}

export enum ThreadContextTypeEnum {
  NEEDS_ASSESSMENT = 'NEEDS_ASSESSMENT',
  SUPPORT = 'SUPPORT',
  TASK = 'TASK',
  ORGANISATION_SUGGESTION = 'ORGANISATION_SUGGESTION'
}

export enum InnovationExportRequestStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum InnovationCollaboratorStatusEnum {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
  REMOVED = 'REMOVED',
  LEFT = 'LEFT',
  EXPIRED = 'EXPIRED'
}

export enum InnovationFileContextTypeEnum {
  INNOVATION = 'INNOVATION',
  INNOVATION_EVIDENCE = 'INNOVATION_EVIDENCE',
  INNOVATION_MESSAGE = 'INNOVATION_MESSAGE',
  INNOVATION_PROGRESS_UPDATE = 'INNOVATION_PROGRESS_UPDATE',
  INNOVATION_SECTION = 'INNOVATION_SECTION'
}

export enum InnovationSupportSummaryTypeEnum {
  ENGAGING = 'ENGAGING',
  BEEN_ENGAGED = 'BEEN_ENGAGED',
  SUGGESTED = 'SUGGESTED'
}
