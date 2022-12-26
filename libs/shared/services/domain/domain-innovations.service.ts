import type { DataSource, EntityManager, Repository } from 'typeorm';

import { ActivityLogEntity, InnovationActionEntity, InnovationEntity, InnovationExportRequestEntity, InnovationFileEntity, InnovationSupportEntity, InnovationSupportLogEntity, NotificationEntity, OrganisationUnitEntity } from '../../entities';
import { ActivityEnum, ActivityTypeEnum, InnovationActionStatusEnum, InnovationExportRequestStatusEnum, InnovationStatusEnum, InnovationSupportLogTypeEnum, InnovationSupportStatusEnum, NotificationContextTypeEnum } from '../../enums';
import { InnovationErrorsEnum, UnprocessableEntityError } from '../../errors';
import type { ActivitiesParamsType } from '../../types';

import { TranslationHelper } from '@innovations/shared/helpers';
import type { FileStorageServiceType } from '../interfaces';


export class DomainInnovationsService {

  innovationRepository: Repository<InnovationEntity>;
  innovationSupportRepository: Repository<InnovationSupportEntity>;
  activityLogRepository: Repository<ActivityLogEntity>;

  constructor(
    private sqlConnection: DataSource,
    private fileStorageService: FileStorageServiceType
  ) {
    this.innovationRepository = this.sqlConnection.getRepository(InnovationEntity);
    this.innovationSupportRepository = this.sqlConnection.getRepository(InnovationSupportEntity);
    this.activityLogRepository = this.sqlConnection.getRepository(ActivityLogEntity);
  }


  async withdrawInnovations(
    transactionManager: EntityManager,
    user: { id: string },
    innovations: { id: string, reason: null | string }[]
  ): Promise<{
    id: string,
    name: string,
    supportingUserIds: string[]
  }[]> {

    const toReturn: { id: string, name: string, supportingUserIds: string[] }[] = [];

    const dbInnovations = await this.innovationRepository.createQueryBuilder('innovations')
      .innerJoinAndSelect('innovations.innovationSupports', 'supports')
      .innerJoinAndSelect('supports.organisationUnitUsers', 'organisationUnitUsers')
      .innerJoinAndSelect('organisationUnitUsers.organisationUser', 'organisationUsers')
      .innerJoinAndSelect('organisationUsers.user', 'users')
      .andWhere('innovations.id IN (:...innovationIds)', { innovationIds: innovations.map(item => item.id) })
      .getMany();

    try {

      for (const innovation of dbInnovations) {

        const reason = innovations.find(item => item.id === innovation.id)?.reason || null;
        await this.withdrawInnovation(innovation, transactionManager, user, reason);

        toReturn.push({
          id: innovation.id,
          name: innovation.name,
          supportingUserIds: innovation.innovationSupports.flatMap(item =>
            item.organisationUnitUsers.map(su => su.organisationUser.user.id)
          )
        });

      }

      return toReturn;

    } catch (error) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_WIDTHRAW_ERROR);
    }

  }

  public async withdrawInnovation(innovation: InnovationEntity, transactionManager: EntityManager, user: { id: string; }, reason: null | string): Promise<{ id: string, name: string, supportingUserIds: string[] }> {
    const innovationSupportIds = innovation.innovationSupports.map(item => item.id);

    if (innovationSupportIds.length > 0) {
      await transactionManager.createQueryBuilder().update(InnovationActionEntity)
        .set({ status: InnovationActionStatusEnum.DECLINED, updatedBy: user.id, deletedAt: new Date() })
        .where('innovation_support_id IN (:...innovationSupportIds)', { innovationSupportIds })
        .execute();
    }

    const exportRequests = await this.sqlConnection.createQueryBuilder(InnovationExportRequestEntity, 'request')
      .where('request.status IN (:...statuses)', { statuses: [InnovationExportRequestStatusEnum.PENDING, InnovationExportRequestStatusEnum.APPROVED] })
      .getMany();

    // Reject all PENDING AND APPROVE export requests
    for (const exportRequest of exportRequests.filter((r) => r.status !== InnovationExportRequestStatusEnum.EXPIRED)) {
      exportRequest.status = InnovationExportRequestStatusEnum.REJECTED;
      exportRequest.rejectReason = TranslationHelper.translate("DEFAULT_MESSAGES.EXPORT_REQUEST.WITHDRAW");
      exportRequest.updatedBy = user.id;
      await transactionManager.save(InnovationExportRequestEntity, exportRequest);
    }

    // Update all supports to UNASSIGNED AND soft delete them.
    for (const innovationSupport of innovation.innovationSupports) {
      innovationSupport.status = InnovationSupportStatusEnum.UNASSIGNED;
      innovationSupport.organisationUnitUsers = [];
      innovationSupport.updatedBy = user.id;
      innovationSupport.deletedAt = new Date().toISOString();
      await transactionManager.save(InnovationSupportEntity, innovationSupport);
    }

    // Lastly, lets update innovations to WITHDRAWN.
    innovation.status = InnovationStatusEnum.WITHDRAWN;
    innovation.updatedBy = user.id;
    innovation.organisationShares = [];
    innovation.withdrawReason = reason;
    innovation.deletedAt = new Date().toISOString();
    await transactionManager.save(InnovationEntity, innovation);

    const supportingUserIds = innovation.innovationSupports.flatMap(item =>
      item.organisationUnitUsers.map(su => su.organisationUser.user.id)
    )

    return {
      id: innovation.id,
      name: innovation.name,
      supportingUserIds,
    }
  }

  /**
  * This is a legacy support that should be replaced by the activities log in due time.
  * For now it is still alive and is responsible fot storing the following actions:
  * - Accessors supports update
  * - Accessors suggesting other organisations/units.
  */
  async addSupportLog(
    transactionManager: EntityManager,
    user: { id: string, organisationUnitId: string },
    innovation: { id: string },
    supportStatus: InnovationSupportStatusEnum,
    supportLog: { type: InnovationSupportLogTypeEnum, description: string, suggestedOrganisationUnits: string[] }
  ): Promise<{ id: string }> {

    const supportLogData = InnovationSupportLogEntity.new({
      innovation: InnovationEntity.new({ id: innovation.id }),
      organisationUnit: OrganisationUnitEntity.new({ id: user.organisationUnitId }),
      innovationSupportStatus: supportStatus,
      description: supportLog.description,
      type: supportLog.type,
      suggestedOrganisationUnits: supportLog.suggestedOrganisationUnits?.map(id => OrganisationUnitEntity.new({ id })),
      createdBy: user.id,
      updatedBy: user.id
    });


    try {

      const savedSupportLog = await transactionManager.save(InnovationSupportLogEntity, supportLogData);
      return { id: savedSupportLog.id };

    } catch (error) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_LOG_ERROR);
    }

  }


  async addActivityLog<T extends ActivityEnum>(
    transactionManager: EntityManager,
    configuration: { userId: string, innovationId: string, activity: T },
    params: ActivitiesParamsType<T>
  ): Promise<void> {

    const activityLog = ActivityLogEntity.new({
      innovation: InnovationEntity.new({ id: configuration.innovationId }),
      activity: configuration.activity,
      type: this.getActivityLogType(configuration.activity),
      createdBy: configuration.userId,
      updatedBy: configuration.userId,
      param: JSON.stringify({
        actionUserId: configuration.userId,
        ...params
      })
    });

    try {

      await transactionManager.save(ActivityLogEntity, activityLog);

    } catch (error) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ACTIVITY_LOG_ERROR);
    }

  }

  private getActivityLogType(activity: ActivityEnum): ActivityTypeEnum {

    switch (activity) {
      case ActivityEnum.INNOVATION_CREATION:
      case ActivityEnum.INNOVATION_PAUSE:
      case ActivityEnum.OWNERSHIP_TRANSFER:
      case ActivityEnum.SHARING_PREFERENCES_UPDATE:
        return ActivityTypeEnum.INNOVATION_MANAGEMENT;

      case ActivityEnum.SECTION_DRAFT_UPDATE:
      case ActivityEnum.SECTION_SUBMISSION:
        return ActivityTypeEnum.INNOVATION_RECORD;

      case ActivityEnum.INNOVATION_SUBMISSION:
      case ActivityEnum.NEEDS_ASSESSMENT_START:
      case ActivityEnum.NEEDS_ASSESSMENT_COMPLETED:
      case ActivityEnum.NEEDS_ASSESSMENT_EDITED:
      case ActivityEnum.NEEDS_ASSESSMENT_REASSESSMENT_REQUESTED:
        return ActivityTypeEnum.NEEDS_ASSESSMENT;

      case ActivityEnum.ORGANISATION_SUGGESTION:
      case ActivityEnum.SUPPORT_STATUS_UPDATE:
        return ActivityTypeEnum.SUPPORT;

      case ActivityEnum.COMMENT_CREATION:
        return ActivityTypeEnum.COMMENTS;

      case ActivityEnum.THREAD_CREATION:
      case ActivityEnum.THREAD_MESSAGE_CREATION:
        return ActivityTypeEnum.THREADS;

      case ActivityEnum.ACTION_CREATION:
      case ActivityEnum.ACTION_STATUS_IN_REVIEW_UPDATE:
      case ActivityEnum.ACTION_STATUS_DECLINED_UPDATE:
      case ActivityEnum.ACTION_STATUS_COMPLETED_UPDATE:
      case ActivityEnum.ACTION_STATUS_REQUESTED_UPDATE:
        return ActivityTypeEnum.ACTIONS;

      default:
        throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ACTIVITY_LOG_INVALID_ITEM);
    }

  }


  async getUnreadNotifications(userId: string, contextIds: string[]): Promise<{ id: string, contextType: NotificationContextTypeEnum, contextId: string, params: string }[]> {

    const notifications = await this.sqlConnection.createQueryBuilder(NotificationEntity, 'notification')
      .innerJoinAndSelect('notification.notificationUsers', 'notificationUsers')
      .innerJoinAndSelect('notificationUsers.user', 'user')
      .where('notification.context_id IN (:...contextIds)', { contextIds })
      .andWhere('user.id = :userId', { userId })
      .andWhere('notificationUsers.read_at IS NULL')
      .getMany();

    return notifications.map(item => ({
      id: item.id,
      contextType: item.contextType,
      contextId: item.contextId,
      params: item.params
    }));

  }


  async deleteInnovationFiles(transactionManager: EntityManager, files: InnovationFileEntity[]): Promise<void> {

    for (const file of files) {

      try {
        await transactionManager.softDelete(InnovationFileEntity, { id: file.id });
      } catch (error) {
        // TODO: Log this here!
        throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_FILE_DELETE_ERROR);
      }

      await this.fileStorageService.deleteFile(file.id, file.displayFileName);

    }
  }

  async getInnovationInfo(innovationId: string): Promise<InnovationEntity | null> {
    const innovation = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    return innovation;
  }

}
