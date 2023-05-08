// General.
import { AuditEntity } from './general/audit.entity';
import { TermsOfUseUserEntity } from './general/terms-of-use-user.entity';
import { TermsOfUseEntity } from './general/terms-of-use.entity';
export { AuditEntity } from './general/audit.entity';
export { TermsOfUseUserEntity } from './general/terms-of-use-user.entity';
export { TermsOfUseEntity } from './general/terms-of-use.entity';
import { AnnouncementEntity } from './user/announcement.entity';
import { AnnouncementUserEntity } from './user/announcement-user.entity';

// Innovation.
import { ActivityLogEntity } from './innovation/activity-log.entity';
import { InnovationActionEntity } from './innovation/innovation-action.entity';
import { InnovationAssessmentEntity } from './innovation/innovation-assessment.entity';
import { InnovationCollaboratorEntity } from './innovation/innovation-collaborator.entity';
import { InnovationDocumentEntity } from './innovation/innovation-document.entity';
import { InnovationEvidenceEntity } from './innovation/innovation-evidence.entity';
import { InnovationExportRequestEntity } from './innovation/innovation-export-request.entity';
import { InnovationFileEntity } from './innovation/innovation-file.entity';
import { InnovationReassessmentRequestEntity } from './innovation/innovation-reassessment-request.entity';
import { InnovationSectionEntity } from './innovation/innovation-section.entity';
import { InnovationSupportLogEntity } from './innovation/innovation-support-log.entity';
import { InnovationSupportEntity } from './innovation/innovation-support.entity';
import { InnovationThreadMessageEntity } from './innovation/innovation-thread-message.entity';
import { InnovationThreadEntity } from './innovation/Innovation-thread.entity';
import { InnovationTransferEntity } from './innovation/innovation-transfer.entity';
import { InnovationUserTestEntity } from './innovation/innovation-user-test.entity';
import { InnovationEntity } from './innovation/innovation.entity';
export { ActivityLogEntity } from './innovation/activity-log.entity';
export { InnovationActionEntity } from './innovation/innovation-action.entity';
export { InnovationAssessmentEntity } from './innovation/innovation-assessment.entity';
export { InnovationCollaboratorEntity } from './innovation/innovation-collaborator.entity';
export { InnovationDocumentEntity } from './innovation/innovation-document.entity';
export { InnovationEvidenceEntity } from './innovation/innovation-evidence.entity';
export { InnovationFileEntity } from './innovation/innovation-file.entity';
export { InnovationReassessmentRequestEntity } from './innovation/innovation-reassessment-request.entity';
export { InnovationSectionEntity } from './innovation/innovation-section.entity';
export { InnovationSupportLogEntity } from './innovation/innovation-support-log.entity';
export { InnovationSupportEntity } from './innovation/innovation-support.entity';
export { InnovationThreadMessageEntity } from './innovation/innovation-thread-message.entity';
export { InnovationThreadEntity } from './innovation/Innovation-thread.entity';
export { InnovationTransferEntity } from './innovation/innovation-transfer.entity';
export { InnovationUserTestEntity } from './innovation/innovation-user-test.entity';
export { InnovationEntity } from './innovation/innovation.entity';
export { InnovationExportRequestEntity } from './innovation/innovation-export-request.entity';

// Organisation.
import { OrganisationUnitUserEntity } from './organisation/organisation-unit-user.entity';
import { OrganisationUnitEntity } from './organisation/organisation-unit.entity';
import { OrganisationUserEntity } from './organisation/organisation-user.entity';
import { OrganisationEntity } from './organisation/organisation.entity';
export { OrganisationUnitUserEntity } from './organisation/organisation-unit-user.entity';
export { OrganisationUnitEntity } from './organisation/organisation-unit.entity';
export { OrganisationUserEntity } from './organisation/organisation-user.entity';
export { OrganisationEntity } from './organisation/organisation.entity';

// User.
import { NotificationLogEntity } from './user/notification-log.entity';
import { NotificationPreferenceEntity } from './user/notification-preference.entity';
import { NotificationUserEntity } from './user/notification-user.entity';
import { NotificationEntity } from './user/notification.entity';
import { UserPreferenceEntity } from './user/user-preference.entity';
import { UserRoleEntity } from './user/user-role.entity';
import { UserEntity } from './user/user.entity';
export { NotificationPreferenceEntity } from './user/notification-preference.entity';
export { NotificationUserEntity } from './user/notification-user.entity';
export { NotificationEntity } from './user/notification.entity';

export { UserRoleEntity } from './user/user-role.entity';
export { UserEntity } from './user/user.entity';
export { UserPreferenceEntity } from './user/user-preference.entity';

// Views
import { IdleSupportViewEntity } from './views/idle-support.view.entity';
import { InnovationGroupedStatusViewEntity } from './views/innovation-grouped-status.view.entity';
import { LastSupportStatusViewEntity } from './views/last-support-status.view.entity';
export { IdleSupportViewEntity } from './views/idle-support.view.entity';
export { InnovationGroupedStatusViewEntity } from './views/innovation-grouped-status.view.entity';
export { LastSupportStatusViewEntity } from './views/last-support-status.view.entity';

export const GENERAL_ENTITIES = [
  AuditEntity,
  TermsOfUseEntity,
  TermsOfUseUserEntity,
  AnnouncementEntity,
  AnnouncementUserEntity
];

export const INNOVATION_ENTITIES = [
  ActivityLogEntity,
  InnovationActionEntity,
  InnovationCollaboratorEntity,
  InnovationAssessmentEntity,
  InnovationDocumentEntity,
  InnovationEvidenceEntity,
  InnovationExportRequestEntity,
  InnovationFileEntity,
  InnovationReassessmentRequestEntity,
  InnovationSectionEntity,
  InnovationSupportLogEntity,
  InnovationSupportEntity,
  InnovationThreadMessageEntity,
  InnovationThreadEntity,
  InnovationTransferEntity,
  InnovationUserTestEntity,
  InnovationEntity
];

export const ORGANISATION_ENTITIES = [
  OrganisationUnitUserEntity,
  OrganisationUnitEntity,
  OrganisationUserEntity,
  OrganisationEntity
];

export const USER_ENTITIES = [
  NotificationLogEntity,
  NotificationPreferenceEntity,
  NotificationUserEntity,
  NotificationEntity,
  UserRoleEntity,
  UserEntity,
  UserPreferenceEntity
];

export const VIEW_ENTITIES = [IdleSupportViewEntity, InnovationGroupedStatusViewEntity, LastSupportStatusViewEntity];
