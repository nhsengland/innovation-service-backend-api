export enum InnovationStatusEnum {
  CREATED = 'CREATED',
  WAITING_NEEDS_ASSESSMENT = 'WAITING_NEEDS_ASSESSMENT',
  NEEDS_ASSESSMENT = 'NEEDS_ASSESSMENT',
  IN_PROGRESS = 'IN_PROGRESS',
  // NEEDS_ASSESSMENT_REVIEW = 'NEEDS_ASSESSMENT_REVIEW', // Not it use nowadays.
  WITHDRAWN = 'WITHDRAWN',
  COMPLETE = 'COMPLETE',
  PAUSED = 'PAUSED',
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
}

export enum InnovationActionStatusEnum {
  REQUESTED = 'REQUESTED',
  // STARTED = 'STARTED',
  // CONTINUE = 'CONTINUE',
  SUBMITTED = 'SUBMITTED',
  DELETED = 'DELETED',
  DECLINED = 'DECLINED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum InnovationSectionStatusEnum {
  NOT_STARTED = 'NOT_STARTED',
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
}

export enum InnovationSupportStatusEnum {
  UNASSIGNED = 'UNASSIGNED',
  FURTHER_INFO_REQUIRED = 'FURTHER_INFO_REQUIRED',
  WAITING = 'WAITING',
  NOT_YET = 'NOT_YET',
  ENGAGING = 'ENGAGING',
  UNSUITABLE = 'UNSUITABLE',
  WITHDRAWN = 'WITHDRAWN',
  COMPLETE = 'COMPLETE',
}

export enum InnovationTransferStatusEnum {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  DECLINED = 'DECLINED',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED',
}

export enum InnovationSupportLogTypeEnum {
  STATUS_UPDATE = 'STATUS_UPDATE',
  ACCESSOR_SUGGESTION = 'ACCESSOR_SUGGESTION',
}

export enum ThreadContextTypeEnum {
  NEEDS_ASSESSMENT = 'NEEDS_ASSESSMENT',
  SUPPORT = 'SUPPORT',
  ACTION = 'ACTION',
}

export enum InnovationExportRequestStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum InnovationCollaboratorStatusEnum {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
  REMOVED = 'REMOVED',
  LEFT = 'LEFT',
  EXPIRED = 'EXPIRED',
}
