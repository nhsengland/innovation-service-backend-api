import { inject, injectable } from 'inversify';

import {
  ActivityLogEntity,
  InnovationEntity,
  InnovationSectionEntity,
  InnovationSupportEntity,
  InnovationTaskEntity,
  UserRoleEntity
} from '@innovations/shared/entities';
import {
  ActivityEnum,
  InnovationCollaboratorStatusEnum,
  InnovationStatusEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum,
  ThreadContextTypeEnum,
  UserStatusEnum
} from '@innovations/shared/enums';
import {
  ForbiddenError,
  InnovationErrorsEnum,
  NotFoundError,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import type { DomainService, IdentityProviderService, NotifierService } from '@innovations/shared/services';
import { ActivityLogListParamsType, DomainContextType, isAccessorDomainContextType } from '@innovations/shared/types';

import { CurrentCatalogTypes, CurrentDocumentConfig } from '@innovations/shared/schemas/innovation-record';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import { Brackets, EntityManager } from 'typeorm';
import { BaseService } from './base.service';
import type { InnovationThreadsService } from './innovation-threads.service';
import SYMBOLS from './symbols';

@injectable()
export class InnovationTasksService extends BaseService {
  constructor(
    @inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService,
    @inject(SHARED_SYMBOLS.NotifierService) private notifierService: NotifierService,
    @inject(SHARED_SYMBOLS.IdentityProviderService)
    private identityProviderService: IdentityProviderService,
    @inject(SYMBOLS.InnovationThreadsService)
    private innovationThreadsService: InnovationThreadsService
  ) {
    super();
  }

  async getTasksList(
    domainContext: DomainContextType,
    filters: {
      innovationId?: string;
      innovationName?: string;
      sections?: CurrentCatalogTypes.InnovationSections[];
      status?: InnovationTaskStatusEnum[];
      innovationStatus?: InnovationStatusEnum[];
      createdByMe?: boolean;
      allTasks?: boolean;
      fields: 'notifications'[];
    },
    pagination: PaginationQueryParamsType<
      'displayId' | 'section' | 'innovationName' | 'createdAt' | 'updatedAt' | 'status'
    >,
    entityManager?: EntityManager
  ): Promise<{
    count: number;
    data: {
      id: string;
      displayId: string;
      description: string;
      innovation: { id: string; name: string };
      status: InnovationTaskStatusEnum;
      section: CurrentCatalogTypes.InnovationSections;
      createdAt: Date;
      updatedAt: Date;
      updatedBy: { name: string; role?: ServiceRoleEnum | undefined };
      createdBy: {
        id: string;
        name: string;
        role?: ServiceRoleEnum | undefined;
        organisationUnit?: { id: string; name: string; acronym?: string };
      };
      notifications?: number;
    }[];
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(InnovationTaskEntity, 'task')
      .select([
        'task.id',
        'task.displayId',
        'task.status',
        'task.createdAt',
        'task.updatedAt',
        'innovation.name',
        'innovation.id',
        'innovationSection.section',
        'innovationSupport.id',
        'updatedByUser.identityId',
        'updatedByUser.status',
        'updatedByUserRole.role',
        'createdByUser.id',
        'createdByUser.identityId',
        'createdByUser.status',
        'createdByUserRole.role',
        'organisationUnit.id',
        'organisationUnit.acronym',
        'organisationUnit.name'
      ])
      .innerJoin('task.innovationSection', 'innovationSection')
      .innerJoin('innovationSection.innovation', 'innovation')
      .innerJoin('task.createdByUserRole', 'createdByUserRole')
      .innerJoin('createdByUserRole.user', 'createdByUser')
      .leftJoin('task.innovationSupport', 'innovationSupport')
      .leftJoin('innovationSupport.organisationUnit', 'organisationUnit')
      .leftJoin('task.updatedByUserRole', 'updatedByUserRole')
      .leftJoin('updatedByUserRole.user', 'updatedByUser');

    if (domainContext.currentRole.role === ServiceRoleEnum.INNOVATOR) {
      query.leftJoin('innovation.collaborators', 'collaborator', 'collaborator.status = :status', {
        status: InnovationCollaboratorStatusEnum.ACTIVE
      });
      query.andWhere(
        new Brackets(qb => {
          qb.andWhere('innovation.owner_id = :ownerId', { ownerId: domainContext.id });
          qb.orWhere('collaborator.user_id = :userId', { userId: domainContext.id });
        })
      );
    }

    if (domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT) {
      if (!filters.allTasks) {
        query.andWhere('task.innovation_support_id IS NULL');
      }
      query.andWhere('innovation.status IN (:...assessmentInnovationStatus)', {
        assessmentInnovationStatus: [
          InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT,
          InnovationStatusEnum.NEEDS_ASSESSMENT,
          InnovationStatusEnum.IN_PROGRESS
        ]
      });
    }

    if (isAccessorDomainContextType(domainContext)) {
      query.innerJoin('innovation.organisationShares', 'shares');
      query.leftJoin(
        'innovation.innovationSupports',
        'accessorSupports',
        'accessorSupports.organisation_unit_id = :accessorSupportsOrganisationUnitId',
        { accessorSupportsOrganisationUnitId: domainContext.organisation.organisationUnit.id }
      );
      query.andWhere('innovation.status IN (:...accessorInnovationStatus)', {
        accessorInnovationStatus: [InnovationStatusEnum.IN_PROGRESS, InnovationStatusEnum.COMPLETE]
      });
      query.andWhere('shares.id = :accessorOrganisationId', {
        accessorOrganisationId: domainContext.organisation.id
      });

      if (domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR) {
        query.andWhere('accessorSupports.status IN (:...accessorSupportsSupportStatuses01)', {
          accessorSupportsSupportStatuses01: [
            InnovationSupportStatusEnum.ENGAGING,
            InnovationSupportStatusEnum.COMPLETE
          ]
        });
        // query.andWhere('accessorSupports.organisation_unit_id = :organisationUnitId ', { organisationUnitId: user.organisationUnitId });
      }

      if (!filters.allTasks) {
        query.andWhere('task.innovation_support_id IS NOT NULL');
      }
    }

    // Filters.
    if (filters.innovationId) {
      query.andWhere('innovation.id = :innovationId', { innovationId: filters.innovationId });
    }

    if (filters.innovationName) {
      query.andWhere('innovation.name LIKE :innovationName', {
        innovationName: `%${filters.innovationName}%`
      });
    }

    if (filters.sections && filters.sections.length > 0) {
      query.andWhere('innovationSection.section IN (:...sections)', { sections: filters.sections });
    }

    if (filters.status && filters.status.length > 0) {
      query.andWhere('task.status IN (:...statuses)', { statuses: filters.status });
    }

    if (filters.innovationStatus && filters.innovationStatus.length > 0) {
      query.andWhere('innovation.status IN (:...innovationStatuses)', {
        innovationStatuses: filters.innovationStatus
      });
    }

    if (filters.createdByMe) {
      query.andWhere('createdByUser.id = :createdBy', { createdBy: domainContext.id });
      if (isAccessorDomainContextType(domainContext)) {
        query.andWhere('innovationSupport.organisation_unit_id = :orgUnitId', {
          orgUnitId: domainContext.organisation.organisationUnit.id
        });
      }
    }

    // Pagination and ordering.
    query.skip(pagination.skip);
    query.take(pagination.take);

    for (const [key, order] of Object.entries(pagination.order)) {
      let field: string;
      switch (key) {
        case 'displayId':
          field = 'task.displayId';
          break;
        case 'section':
          field = 'innovationSection.section';
          break;
        case 'innovationName':
          field = 'innovation.name';
          break;
        case 'createdAt':
          field = 'task.createdAt';
          break;
        case 'updatedAt':
          field = 'task.updatedAt';
          break;
        case 'status':
          field = 'task.status';
          break;
        default:
          field = 'task.createdAt';
          break;
      }
      query.addOrderBy(field, order);
    }

    const [tasks, count] = await query.getManyAndCount();

    if (count === 0) {
      return { count: 0, data: [] };
    }

    let notifications: {
      id: string;
      contextType: NotificationContextTypeEnum;
      contextId: string;
      params: Record<string, unknown>;
    }[] = [];

    if (filters.fields?.includes('notifications')) {
      notifications = await this.domainService.innovations.getUnreadNotifications(
        domainContext.currentRole.id,
        tasks.map(task => task.id),
        em
      );
    }

    const usersIds = tasks
      .flatMap(task => [
        task.createdByUserRole.user.status !== UserStatusEnum.DELETED
          ? task.createdByUserRole.user.identityId
          : undefined,
        task.updatedByUserRole && task.updatedByUserRole.user.status !== UserStatusEnum.DELETED
          ? task.updatedByUserRole.user.identityId
          : undefined
      ])
      .filter((u): u is string => u !== undefined);
    const usersInfo = await this.identityProviderService.getUsersMap(usersIds);

    const data = tasks.map(task => ({
      id: task.id,
      displayId: task.displayId,
      description: 'TODO descriptions',
      innovation: {
        id: task.innovationSection.innovation.id,
        name: task.innovationSection.innovation.name
      },
      status: task.status,
      section: task.innovationSection.section,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      updatedBy: {
        name:
          (task.updatedByUserRole && usersInfo.get(task.updatedByUserRole.user.identityId)?.displayName) ??
          '[deleted account]',
        role: task.updatedByUserRole?.role
      },
      createdBy: {
        id: task.createdByUserRole.user.id,
        name: usersInfo.get(task.createdByUserRole.user.identityId)?.displayName ?? '[deleted account]',
        role: task.createdByUserRole?.role,
        ...(task.innovationSupport
          ? {
              organisationUnit: {
                id: task.innovationSupport?.organisationUnit?.id,
                name: task.innovationSupport?.organisationUnit?.name,
                acronym: task.innovationSupport?.organisationUnit?.acronym
              }
            }
          : {})
      },
      ...(!filters.fields?.includes('notifications')
        ? {}
        : {
            notifications: notifications.filter(item => item.contextId === task.id).length
          })
    }));

    return { count, data };
  }

  async getTaskInfo(
    taskId: string,
    entityManager?: EntityManager
  ): Promise<{
    id: string;
    displayId: string;
    status: InnovationTaskStatusEnum;
    section: CurrentCatalogTypes.InnovationSections;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    updatedBy: { name: string; role: ServiceRoleEnum; isOwner?: boolean };
    createdBy: {
      id: string;
      name: string;
      role: ServiceRoleEnum;
      organisationUnit?: { id: string; name: string; acronym?: string };
    };
    declineReason?: string;
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const dbTask = await em
      .createQueryBuilder(InnovationTaskEntity, 'task')
      .select([
        'task.id',
        'task.status',
        'task.displayId',
        'task.createdAt',
        'task.updatedAt',
        'task.createdBy',
        'task.updatedBy',
        'innovationSection.id',
        'innovationSection.section',
        'innovation.id',
        'owner.id',
        'owner.status',
        'createdByUserRole.id',
        'createdByUserRole.role',
        'createdByUserOrganisationUnit.id',
        'createdByUserOrganisationUnit.name',
        'createdByUserOrganisationUnit.acronym',
        'createdByUser.id',
        'createdByUser.identityId',
        'createdByUser.status',
        'updatedByUserRole.id',
        'updatedByUserRole.role',
        'updatedByUser.id',
        'updatedByUser.identityId',
        'updatedByUser.status'
      ])
      .innerJoin('task.innovationSection', 'innovationSection')
      .innerJoin('innovationSection.innovation', 'innovation')
      .leftJoin('innovation.owner', 'owner')
      .leftJoin('task.createdByUserRole', 'createdByUserRole')
      .leftJoin('createdByUserRole.user', 'createdByUser')
      .leftJoin('createdByUserRole.organisationUnit', 'createdByUserOrganisationUnit')
      .leftJoin('task.updatedByUserRole', 'updatedByUserRole')
      .leftJoin('updatedByUserRole.user', 'updatedByUser')
      .where('task.id = :taskId', { taskId })
      .getOne();
    if (!dbTask) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_TASK_NOT_FOUND);
    }

    // TODO check how this ends up with the new tasks, strange to go fetch this from the activityLog
    let declineReason: string | null = null;
    if (dbTask.status === InnovationTaskStatusEnum.DECLINED) {
      const activityLogDeclineReason = await em
        .createQueryBuilder(ActivityLogEntity, 'activityLog')
        .where('activityLog.innovation_id = :innovationId', {
          innovationId: dbTask.innovationSection.innovation.id
        })
        .andWhere('activity = :activity', { activity: ActivityEnum.TASK_STATUS_DECLINED_UPDATE })
        .andWhere("JSON_VALUE(param, '$.taskId') = :taskId", { taskId: taskId })
        .getOne();

      if (activityLogDeclineReason?.param) {
        const params = activityLogDeclineReason.param as ActivityLogListParamsType;
        declineReason = params.comment?.value ?? null;
      }
    }

    let createdByUserName = '[deleted user]';
    if (dbTask.createdByUserRole.user.status !== UserStatusEnum.DELETED) {
      createdByUserName = (await this.identityProviderService.getUserInfo(dbTask.createdByUserRole.user.identityId))
        .displayName;
    }

    let lastUpdatedByUserName = '[deleted user]';
    if (dbTask.updatedByUserRole && dbTask.updatedByUserRole.user.status !== UserStatusEnum.DELETED) {
      lastUpdatedByUserName = (await this.identityProviderService.getUserInfo(dbTask.updatedByUserRole.user.identityId))
        .displayName;
    }

    return {
      id: dbTask.id,
      displayId: dbTask.displayId,
      status: dbTask.status,
      description: 'TODO descriptions',
      section: dbTask.innovationSection.section,
      createdAt: dbTask.createdAt,
      updatedAt: dbTask.updatedAt,
      updatedBy: {
        name: lastUpdatedByUserName,
        role: dbTask.updatedByUserRole?.role,
        ...(dbTask.updatedByUserRole?.role === ServiceRoleEnum.INNOVATOR && {
          isOwner: dbTask.innovationSection.innovation.owner?.id === dbTask.updatedByUserRole.user.id
        })
      },
      createdBy: {
        id: dbTask.createdByUserRole.user.id,
        name: createdByUserName,
        role: dbTask.createdByUserRole.role,
        ...(dbTask.createdByUserRole.organisationUnit && {
          organisationUnit: {
            id: dbTask.createdByUserRole.organisationUnit.id,
            name: dbTask.createdByUserRole.organisationUnit.name,
            acronym: dbTask.createdByUserRole.organisationUnit.acronym
          }
        })
      },
      ...(declineReason ? { declineReason } : {})
    };
  }

  async createTask(
    domainContext: DomainContextType,
    innovationId: string,
    data: { section: CurrentCatalogTypes.InnovationSections; description: string },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const innovation = await connection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.owner', 'owner')
      .leftJoinAndSelect('innovation.sections', 'sections')
      .leftJoinAndSelect('innovation.innovationSupports', 'supports')
      .leftJoinAndSelect('supports.organisationUnit', 'organisationUnit')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    // Get section & support data.
    const innovationSection = innovation.sections.find(sec => sec.section === data.section);
    if (!innovationSection) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SECTION_NOT_FOUND);
    }

    const innovationSupport = innovation.innovationSupports.find(
      is => is.organisationUnit.id === domainContext.organisation?.organisationUnit?.id
    );

    let taskCounter = (await innovationSection.tasks).length;
    const displayId =
      CurrentDocumentConfig.InnovationSectionAliasEnum[data.section] +
      (++taskCounter).toString().slice(-2).padStart(2, '0');

    const taskObj = InnovationTaskEntity.new({
      displayId: displayId,
      status: InnovationTaskStatusEnum.OPEN,
      innovationSection: InnovationSectionEntity.new({ id: innovationSection.id }),
      createdBy: domainContext.id,
      updatedBy: domainContext.id,
      createdByUserRole: UserRoleEntity.new({ id: domainContext.currentRole.id }),
      updatedByUserRole: UserRoleEntity.new({ id: domainContext.currentRole.id })
    });

    if (innovationSupport) {
      taskObj.innovationSupport = InnovationSupportEntity.new({ id: innovationSupport.id });
    } else if (
      !innovationSupport &&
      (domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR ||
        domainContext.currentRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR)
    ) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND);
    }

    // Add new task to db and log task creation to innovation's activity log
    const result = await connection.transaction(async transaction => {
      const taskResult = await transaction.save<InnovationTaskEntity>(taskObj);

      await this.domainService.innovations.addActivityLog(
        transaction,
        { innovationId: innovation.id, activity: ActivityEnum.TASK_CREATION, domainContext },
        {
          sectionId: data.section,
          taskId: taskResult.id,
          comment: { value: data.description },
          role: domainContext.currentRole.role as ServiceRoleEnum
        }
      );

      return { id: taskResult.id };
    });

    await this.notifierService.send(domainContext, NotifierTypeEnum.TASK_CREATION, {
      innovationId: innovation.id,
      task: { id: result.id, section: data.section }
    });

    return result;
  }

  async updateTaskAsAccessor(
    domainContext: DomainContextType,
    innovationId: string,
    taskId: string,
    data: { status: InnovationTaskStatusEnum },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const dbTask = await connection
      .createQueryBuilder(InnovationTaskEntity, 'ia')
      .innerJoinAndSelect('ia.innovationSection', 'is')
      .innerJoinAndSelect('ia.innovationSupport', 'isup')
      .innerJoinAndSelect('is.innovation', 'i')
      .innerJoinAndSelect('isup.organisationUnit', 'ou')
      .innerJoinAndSelect('ou.organisation', 'o')
      .leftJoinAndSelect('ia.updatedByUserRole', 'updatedByUserRole')
      .where('ia.id = :taskId', { taskId: taskId })
      .getOne();
    if (!dbTask) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_TASK_NOT_FOUND);
    }

    // Tasks can only be updated from users from the same org unit
    if (dbTask.innovationSupport?.organisationUnit.id !== domainContext.organisation?.organisationUnit?.id) {
      throw new ForbiddenError(InnovationErrorsEnum.INNOVATION_TASK_FROM_DIFFERENT_UNIT);
    }

    if (
      !(dbTask.status === InnovationTaskStatusEnum.OPEN || dbTask.status === InnovationTaskStatusEnum.DONE) ||
      (dbTask.status === InnovationTaskStatusEnum.OPEN && data.status !== InnovationTaskStatusEnum.CANCELLED) ||
      (dbTask.status === InnovationTaskStatusEnum.DONE && data.status !== InnovationTaskStatusEnum.OPEN)
    ) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TASK_WITH_UNPROCESSABLE_STATUS);
    }

    const taskLastUpdatedByUserRole = { id: dbTask.updatedByUserRole.id, role: dbTask.updatedByUserRole.role };

    dbTask.updatedByUserRole = UserRoleEntity.new({ id: domainContext.currentRole.id });

    const result = await this.saveTask(domainContext, innovationId, dbTask, data, connection);

    // Send task status update to innovation owner
    await this.notifierService.send(domainContext, NotifierTypeEnum.TASK_UPDATE, {
      innovationId: dbTask.innovationSection.innovation.id,
      task: {
        id: dbTask.id,
        section: dbTask.innovationSection.section,
        status: result.status,
        previouslyUpdatedByUserRole: taskLastUpdatedByUserRole
      }
    });

    return { id: result.id };
  }

  async updateTaskAsNeedsAccessor(
    domainContext: DomainContextType,
    innovationId: string,
    taskId: string,
    data: { status: InnovationTaskStatusEnum },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const dbTask = await connection
      .createQueryBuilder(InnovationTaskEntity, 'ia')
      .innerJoinAndSelect('ia.innovationSection', 'is')
      .innerJoinAndSelect('is.innovation', 'i')
      .leftJoinAndSelect('ia.innovationSupport', 'isup')
      .leftJoinAndSelect('ia.updatedByUserRole', 'updatedByUserRole')
      .where('ia.id = :taskId', { taskId: taskId })
      .andWhere('ia.innovationSupport.id IS NULL')
      .getOne();
    if (!dbTask) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_TASK_NOT_FOUND);
    }

    if (
      !(dbTask.status === InnovationTaskStatusEnum.OPEN || dbTask.status === InnovationTaskStatusEnum.DONE) ||
      (dbTask.status === InnovationTaskStatusEnum.OPEN && data.status !== InnovationTaskStatusEnum.CANCELLED) ||
      (dbTask.status === InnovationTaskStatusEnum.DONE && data.status !== InnovationTaskStatusEnum.OPEN)
    ) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TASK_WITH_UNPROCESSABLE_STATUS);
    }

    const taskLastUpdatedByUserRole = { id: dbTask.updatedByUserRole.id, role: dbTask.updatedByUserRole.role };

    dbTask.updatedByUserRole = UserRoleEntity.new({ id: domainContext.currentRole.id });

    const result = await this.saveTask(domainContext, innovationId, dbTask, data, connection);

    // Send task status update to innovation owner
    await this.notifierService.send(domainContext, NotifierTypeEnum.TASK_UPDATE, {
      innovationId: dbTask.innovationSection.innovation.id,
      task: {
        id: dbTask.id,
        section: dbTask.innovationSection.section,
        status: result.status,
        previouslyUpdatedByUserRole: taskLastUpdatedByUserRole
      }
    });

    return { id: result.id };
  }

  async updateTaskAsInnovator(
    domainContext: DomainContextType,
    innovationId: string,
    taskId: string,
    data: { status: InnovationTaskStatusEnum; message: string },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const dbTask = await connection
      .createQueryBuilder(InnovationTaskEntity, 'task')
      .innerJoinAndSelect('task.innovationSection', 'section')
      .where('task.id = :taskId', { taskId: taskId })
      .getOne();

    if (!dbTask) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_TASK_NOT_FOUND);
    }

    if (dbTask.status !== InnovationTaskStatusEnum.OPEN) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TASK_WITH_UNPROCESSABLE_STATUS);
    }

    dbTask.updatedByUserRole = UserRoleEntity.new({ id: domainContext.currentRole.id });

    const result = await this.saveTask(domainContext, innovationId, dbTask, data, connection);

    await this.notifierService.send(domainContext, NotifierTypeEnum.TASK_UPDATE, {
      innovationId: innovationId,
      task: {
        id: dbTask.id,
        section: dbTask.innovationSection.section,
        status: result.status
      },
      comment: data.message
    });

    return { id: result.id };
  }

  /**
   * returns ths task subject according to the status
   * @param dbTask the task to get the subject from
   * @param status the status to get the subject from
   * @returns the task subject according to the status
   */
  private getSaveTaskSubject(dbTask: InnovationTaskEntity, status: InnovationTaskStatusEnum): string {
    // TODO 'Task thread creation not implemented yet, threads will be create only once when task is created but need to be updated when task is reopened'

    switch (status) {
      case InnovationTaskStatusEnum.DECLINED:
        return `Action ${dbTask.displayId} declined`;
      // TODO this should be reviewed as this never happens in current implementation
      /* c8 ignore next 2 */
      default:
        return `Action ${dbTask.displayId} updated`;
    }
  }

  private async saveTask(
    domainContext: DomainContextType,
    innovationId: string,
    dbTask: InnovationTaskEntity,
    data: { status: InnovationTaskStatusEnum; message?: string },
    entityManager: EntityManager
  ): Promise<InnovationTaskEntity> {
    const user = { id: domainContext.id, identityId: domainContext.identityId };

    return entityManager.transaction(async transaction => {
      let thread;

      if (data.message) {
        thread = await this.innovationThreadsService.createThreadOrMessage(
          { id: user.id, identityId: user.identityId },
          domainContext,
          innovationId,
          this.getSaveTaskSubject(dbTask, data.status),
          data.message,
          dbTask.id,
          ThreadContextTypeEnum.TASK,
          transaction,
          true
        );
      }

      if (data.status === InnovationTaskStatusEnum.DECLINED) {
        await this.domainService.innovations.addActivityLog(
          transaction,
          { innovationId, activity: ActivityEnum.TASK_STATUS_DECLINED_UPDATE, domainContext },
          {
            taskId: dbTask.id,
            interveningUserId: dbTask.createdBy,
            comment: { id: thread?.message?.id || '', value: thread?.message?.message || '' }
          }
        );
      }

      if (data.status === InnovationTaskStatusEnum.OPEN) {
        await this.domainService.innovations.addActivityLog(
          transaction,
          { innovationId, activity: ActivityEnum.TASK_STATUS_OPEN_UPDATE, domainContext },
          { taskId: dbTask.id }
        );
      }

      if (data.status === InnovationTaskStatusEnum.OPEN) {
        await this.domainService.innovations.addActivityLog(
          transaction,
          { innovationId, activity: ActivityEnum.TASK_STATUS_OPEN_UPDATE, domainContext },
          { taskId: dbTask.id }
        );
      }

      if (data.status === InnovationTaskStatusEnum.CANCELLED) {
        await this.domainService.innovations.addActivityLog(
          transaction,
          { innovationId, activity: ActivityEnum.TASK_STATUS_CANCELLED_UPDATE, domainContext },
          { taskId: dbTask.id }
        );
      }

      dbTask.status = data.status;
      dbTask.updatedBy = user.id;
      dbTask.updatedByUserRole = UserRoleEntity.new({ id: domainContext.currentRole.id });

      return transaction.save(InnovationTaskEntity, dbTask);
    });
  }
}
