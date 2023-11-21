// General.
import { AuditEntity } from './general/audit.entity';
import { TermsOfUseUserEntity } from './general/terms-of-use-user.entity';
import { TermsOfUseEntity } from './general/terms-of-use.entity';
export { AuditEntity } from './general/audit.entity';
export { TermsOfUseUserEntity } from './general/terms-of-use-user.entity';
export { TermsOfUseEntity } from './general/terms-of-use.entity';

// Innovation.
import { ActivityLogEntity } from './innovation/activity-log.entity';
import { InnovationTaskEntity } from './innovation/innovation-task.entity';
import { InnovationAssessmentEntity } from './innovation/innovation-assessment.entity';
import { InnovationCollaboratorEntity } from './innovation/innovation-collaborator.entity';
import { InnovationDocumentEntity } from './innovation/innovation-document.entity';
import { InnovationEvidenceEntity } from './innovation/innovation-evidence.entity';
import { InnovationExportRequestEntity } from './innovation/innovation-export-request.entity';
import { InnovationFileLegacyEntity } from './innovation/innovation-file-legacy.entity';
import { InnovationFileEntity } from './innovation/innovation-file.entity';
import { InnovationReassessmentRequestEntity } from './innovation/innovation-reassessment-request.entity';
import { InnovationSectionEntity } from './innovation/innovation-section.entity';
import { InnovationSupportLogEntity } from './innovation/innovation-support-log.entity';
import { InnovationSupportEntity } from './innovation/innovation-support.entity';
import { InnovationThreadMessageEntity } from './innovation/innovation-thread-message.entity';
import { InnovationThreadEntity } from './innovation/innovation-thread.entity';
import { InnovationTransferEntity } from './innovation/innovation-transfer.entity';
import { InnovationUserTestEntity } from './innovation/innovation-user-test.entity';
import { InnovationEntity } from './innovation/innovation.entity';
export { ActivityLogEntity } from './innovation/activity-log.entity';
export { InnovationTaskEntity } from './innovation/innovation-task.entity';
export { InnovationAssessmentEntity } from './innovation/innovation-assessment.entity';
export { InnovationCollaboratorEntity } from './innovation/innovation-collaborator.entity';
export { InnovationDocumentEntity } from './innovation/innovation-document.entity';
export { InnovationEvidenceEntity } from './innovation/innovation-evidence.entity';
export { InnovationExportRequestEntity } from './innovation/innovation-export-request.entity';
export { InnovationFileLegacyEntity } from './innovation/innovation-file-legacy.entity';
export { InnovationFileEntity } from './innovation/innovation-file.entity';
export { InnovationReassessmentRequestEntity } from './innovation/innovation-reassessment-request.entity';
export { InnovationSectionEntity } from './innovation/innovation-section.entity';
export { InnovationSupportLogEntity } from './innovation/innovation-support-log.entity';
export { InnovationSupportEntity } from './innovation/innovation-support.entity';
export { InnovationThreadMessageEntity } from './innovation/innovation-thread-message.entity';
export { InnovationThreadEntity } from './innovation/innovation-thread.entity';
export { InnovationTransferEntity } from './innovation/innovation-transfer.entity';
export { InnovationUserTestEntity } from './innovation/innovation-user-test.entity';
export { InnovationEntity } from './innovation/innovation.entity';

// Organisation.
import { OrganisationUnitEntity } from './organisation/organisation-unit.entity';
import { OrganisationEntity } from './organisation/organisation.entity';
export { OrganisationUnitEntity } from './organisation/organisation-unit.entity';
export { OrganisationEntity } from './organisation/organisation.entity';

// User.
import { AnnouncementEntity } from './user/announcement.entity';
import { AnnouncementUserEntity } from './user/announcement-user.entity';
import { NotificationLogEntity } from './user/notification-log.entity';
import { NotificationPreferenceEntity } from './user/notification-preference.entity';
import { NotificationUserEntity } from './user/notification-user.entity';
import { NotificationEntity } from './user/notification.entity';
import { UserPreferenceEntity } from './user/user-preference.entity';
import { UserRoleEntity } from './user/user-role.entity';
import { UserEntity } from './user/user.entity';
export { AnnouncementEntity } from './user/announcement.entity';
export { AnnouncementUserEntity } from './user/announcement-user.entity';
export { NotificationLogEntity } from './user/notification-log.entity';
export { NotificationPreferenceEntity } from './user/notification-preference.entity';
export { NotificationUserEntity } from './user/notification-user.entity';
export { NotificationEntity } from './user/notification.entity';
export { UserPreferenceEntity } from './user/user-preference.entity';
export { UserRoleEntity } from './user/user-role.entity';
export { UserEntity } from './user/user.entity';

// Views
import { InnovationGroupedStatusViewEntity } from './views/innovation-grouped-status.view.entity';
import { LastSupportStatusViewEntity } from './views/last-support-status.view.entity';
import { InnovationTaskDescriptionsViewEntity } from './views/innovation-task-descriptions.view.entity';
import { SupportKPIViewEntity } from './views/support-kpi.view.entity';
import { SupportLastActivityUpdateView } from './views/support-last-activity-update.view.entity';
import { DocumentsStatisticsViewEntity } from './views/documents-statistics.view.entity';
export { InnovationGroupedStatusViewEntity } from './views/innovation-grouped-status.view.entity';
export { LastSupportStatusViewEntity } from './views/last-support-status.view.entity';
export { InnovationTaskDescriptionsViewEntity } from './views/innovation-task-descriptions.view.entity';
export { SupportKPIViewEntity } from './views/support-kpi.view.entity';
export { SupportLastActivityUpdateView} from './views/support-last-activity-update.view.entity';
export { DocumentsStatisticsViewEntity } from './views/documents-statistics.view.entity';

// Entities lists.
export const GENERAL_ENTITIES = [AuditEntity, TermsOfUseEntity, TermsOfUseUserEntity];
export const INNOVATION_ENTITIES = [
  ActivityLogEntity,
  InnovationAssessmentEntity,
  InnovationCollaboratorEntity,
  InnovationDocumentEntity,
  InnovationEvidenceEntity,
  InnovationExportRequestEntity,
  InnovationFileLegacyEntity,
  InnovationFileEntity,
  InnovationReassessmentRequestEntity,
  InnovationSectionEntity,
  InnovationSupportLogEntity,
  InnovationSupportEntity,
  InnovationTaskEntity,
  InnovationThreadMessageEntity,
  InnovationThreadEntity,
  InnovationTransferEntity,
  InnovationUserTestEntity,
  InnovationEntity
];
export const ORGANISATION_ENTITIES = [
  OrganisationUnitEntity,
  OrganisationEntity
];
export const USER_ENTITIES = [
  AnnouncementEntity,
  AnnouncementUserEntity,
  NotificationLogEntity,
  NotificationPreferenceEntity,
  NotificationUserEntity,
  NotificationEntity,
  UserPreferenceEntity,
  UserRoleEntity,
  UserEntity
];
export const VIEW_ENTITIES = [InnovationGroupedStatusViewEntity, InnovationTaskDescriptionsViewEntity, LastSupportStatusViewEntity, SupportKPIViewEntity, SupportLastActivityUpdateView, DocumentsStatisticsViewEntity];
