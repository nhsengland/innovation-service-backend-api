import { inject, injectable } from 'inversify';

import {
  InnovationEntity,
  InnovationSectionEntity,
  InnovationSupportEntity,
  InnovationTaskEntity,
  InnovationThreadEntity,
  InnovationThreadMessageEntity,
  UserRoleEntity
} from '@innovations/shared/entities';
import {
  ActivityEnum,
  InnovationCollaboratorStatusEnum,
  InnovationStatusEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum,
  NotificationCategoryType,
  NotifierTypeEnum,
  ServiceRoleEnum,
  ThreadContextTypeEnum,
  UserStatusEnum
} from '@innovations/shared/enums';
import {
  ForbiddenError,
  InnovationErrorsEnum,
  NotFoundError,
  NotImplementedError,
  UnprocessableEntityError,
  UserErrorsEnum
} from '@innovations/shared/errors';
import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import type { DomainService, NotifierService } from '@innovations/shared/services';
import {
  DomainContextType,
  isAccessorDomainContextType,
  isAssessmentDomainContextType
} from '@innovations/shared/types';

import { CurrentCatalogTypes, InnovationSectionAliasEnum } from '@innovations/shared/schemas/innovation-record';
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
      createdByMyUnit?: boolean;
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
      innovation: { id: string; name: string };
      status: InnovationTaskStatusEnum;
      section: CurrentCatalogTypes.InnovationSections;
      createdAt: Date;
      createdBy: { name: string; displayTag: string };
      assignedTo: { name: string; displayTag: string };
      updatedAt: Date;
      updatedBy: { name: string; displayTag: string };
      sameOrganisation: boolean;
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
        'assignedToUser.id',
        'assignedToUser.identityId',
        'assignedToUser.status',
        'assignedToUserRole.role',
        'organisationUnit.id',
        'organisationUnit.acronym',
        'organisationUnit.name'
      ])
      .innerJoin('task.innovationSection', 'innovationSection')
      .innerJoin('innovationSection.innovation', 'innovation')
      .innerJoin('task.createdByUserRole', 'createdByUserRole')
      .innerJoin('createdByUserRole.user', 'createdByUser')
      .leftJoin('task.assignedToUserRole', 'assignedToUserRole')
      .leftJoin('assignedToUserRole.user', 'assignedToUser')
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
      query
        .andWhere('innovation.status != :withdrawn', { withdrawn: InnovationStatusEnum.WITHDRAWN })
        .andWhere('innovation.submittedAt IS NOT NULL');
    }

    if (isAccessorDomainContextType(domainContext)) {
      query
        .innerJoin('innovation.organisationShares', 'shares')
        .leftJoin(
          'innovation.innovationSupports',
          'accessorSupports',
          'accessorSupports.organisation_unit_id = :accessorSupportsOrganisationUnitId',
          { accessorSupportsOrganisationUnitId: domainContext.organisation.organisationUnit.id }
        )
        .andWhere('innovation.hasBeenAssessed = 1')
        .andWhere('shares.id = :accessorOrganisationId', {
          accessorOrganisationId: domainContext.organisation.id
        });

      if (domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR) {
        query.andWhere('accessorSupports.status IN (:...accessorSupportsSupportStatuses01)', {
          accessorSupportsSupportStatuses01: [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.CLOSED]
        });
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
    }

    if (filters.createdByMyUnit || filters.createdByMe) {
      if (isAccessorDomainContextType(domainContext)) {
        query.andWhere('innovationSupport.organisation_unit_id = :orgUnitId', {
          orgUnitId: domainContext.organisation.organisationUnit.id
        });
      } else if (isAssessmentDomainContextType(domainContext)) {
        query.andWhere('task.innovation_support_id IS NULL');
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
      contextType: NotificationCategoryType;
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
        task.assignedToUserRole?.user?.status !== UserStatusEnum.DELETED
          ? task.assignedToUserRole?.user?.identityId
          : undefined,
        task.updatedByUserRole && task.updatedByUserRole.user.status !== UserStatusEnum.DELETED
          ? task.updatedByUserRole.user.identityId
          : undefined
      ])
      .filter((u): u is string => u !== undefined);
    const usersInfo = await this.domainService.users.getUsersMap({ identityIds: usersIds }, em);

    const data = tasks.map(task => ({
      id: task.id,
      displayId: task.displayId,
      innovation: {
        id: task.innovationSection.innovation.id,
        name: task.innovationSection.innovation.name
      },
      status: task.status,
      section: task.innovationSection.section,
      sameOrganisation: this.isSameOrganisation(domainContext, {
        role: task.createdByUserRole.role,
        unitId: task.innovationSupport?.organisationUnit.id
      }),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      updatedBy: {
        name: usersInfo.getDisplayName(task.updatedByUserRole.user.identityId),
        displayTag: this.domainService.users.getDisplayTag(task.updatedByUserRole.role, {
          unitName: task.innovationSupport?.organisationUnit?.name,
          isOwner: task.innovationSection.innovation.owner?.id === task.updatedByUserRole.user.id
        })
      },
      createdBy: {
        name: usersInfo.getDisplayName(task.createdByUserRole.user.identityId),
        displayTag: this.domainService.users.getDisplayTag(task.createdByUserRole.role, {
          unitName: task.innovationSupport?.organisationUnit?.name
        })
      },
      assignedTo: {
        name: usersInfo.getDisplayName(task.assignedToUserRole?.user?.identityId),
        displayTag: task.assignedToUserRole?.role
          ? this.domainService.users.getDisplayTag(task.assignedToUserRole.role, {
              unitName: task.innovationSupport?.organisationUnit?.name
            })
          : ''
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
    domainContext: DomainContextType,
    taskId: string,
    entityManager?: EntityManager
  ): Promise<{
    id: string;
    displayId: string;
    status: InnovationTaskStatusEnum;
    section: CurrentCatalogTypes.InnovationSections;
    descriptions: {
      description: string;
      createdAt: Date;
      name: string;
      displayTag: string;
    }[];
    sameOrganisation: boolean;
    threadId: string;
    createdAt: Date;
    updatedAt: Date;
    updatedBy: { name: string; displayTag: string };
    createdBy: { name: string; displayTag: string };
    assignedTo: { name: string; displayTag: string };
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
        'descriptions.description',
        'descriptions.createdAt',
        'descriptions.createdByIdentityId',
        'descriptions.createdByRole',
        'descriptions.createdByOrganisationUnitName',
        'descriptions.threadId',
        'innovationSection.section',
        'innovation.id',
        'owner.id',
        'owner.status',
        'createdByUserRole.role',
        'createdByUserOrganisationUnit.id',
        'createdByUserOrganisationUnit.name',
        'createdByUser.id',
        'createdByUser.identityId',
        'createdByUser.status',
        'updatedByUserRole.id',
        'updatedByUserRole.role',
        'updatedByUser.id',
        'updatedByUser.identityId',
        'updatedByUser.status',
        'assignedToUserRole.id',
        'assignedToUserRole.role',
        'assignedToUser.id',
        'assignedToUser.identityId',
        'assignedToUser.status'
      ])
      .innerJoin('task.innovationSection', 'innovationSection')
      .innerJoin('task.descriptions', 'descriptions')
      .innerJoin('innovationSection.innovation', 'innovation')
      .leftJoin('innovation.owner', 'owner')
      .leftJoin('task.createdByUserRole', 'createdByUserRole')
      .leftJoin('createdByUserRole.user', 'createdByUser')
      .leftJoin('createdByUserRole.organisationUnit', 'createdByUserOrganisationUnit')
      .leftJoin('task.updatedByUserRole', 'updatedByUserRole')
      .leftJoin('updatedByUserRole.user', 'updatedByUser')
      .leftJoin('task.assignedToUserRole', 'assignedToUserRole')
      .leftJoin('assignedToUserRole.user', 'assignedToUser')
      .where('task.id = :taskId', { taskId })
      .andWhere('descriptions.status = :descriptionStatus', { descriptionStatus: InnovationTaskStatusEnum.OPEN }) // descriptions only fetch open messages
      .getOne();
    if (!dbTask) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_TASK_NOT_FOUND);
    }

    const users = [
      dbTask.createdByUserRole.user.identityId,
      dbTask.updatedByUserRole?.user?.identityId,
      dbTask.assignedToUserRole?.user?.identityId,
      ...dbTask.descriptions.map(d => d.createdByIdentityId)
    ].filter((id): id is string => id !== null);

    const usersMap = await this.domainService.users.getUsersMap({ identityIds: users }, em);

    // Tasks only have one unit so using this shortcut
    const unitName = dbTask.createdByUserRole.organisationUnit?.name;

    return {
      id: dbTask.id,
      displayId: dbTask.displayId,
      status: dbTask.status,
      descriptions: dbTask.descriptions.map(d => ({
        description: d.description,
        createdAt: d.createdAt,
        name: usersMap.getDisplayName(d.createdByIdentityId),
        displayTag: this.domainService.users.getDisplayTag(d.createdByRole, {
          unitName: d.createdByOrganisationUnitName
        })
      })),
      section: dbTask.innovationSection.section,
      sameOrganisation: this.isSameOrganisation(domainContext, {
        role: dbTask.createdByUserRole.role,
        unitId: dbTask.createdByUserRole.organisationUnit?.id
      }),
      threadId: dbTask.descriptions[0]?.threadId ?? '', // All the threads have a description so we can use the first one
      createdAt: dbTask.createdAt,
      updatedAt: dbTask.updatedAt,
      updatedBy: {
        name: usersMap.getDisplayName(dbTask.updatedByUserRole?.user?.identityId),
        displayTag: dbTask.updatedByUserRole?.role
          ? this.domainService.users.getDisplayTag(dbTask.updatedByUserRole.role, {
              unitName,
              isOwner: dbTask.innovationSection.innovation.owner?.id === dbTask.updatedByUserRole?.user.id
            })
          : ''
      },
      createdBy: {
        name: usersMap.getDisplayName(dbTask.createdByUserRole.user.identityId),
        displayTag: this.domainService.users.getDisplayTag(dbTask.createdByUserRole.role, {
          unitName
        })
      },
      assignedTo: {
        name: usersMap.getDisplayName(dbTask.assignedToUserRole?.user?.identityId),
        displayTag: dbTask.assignedToUserRole?.role
          ? this.domainService.users.getDisplayTag(dbTask.assignedToUserRole.role, {
              unitName
            })
          : ''
      }
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
      .leftJoinAndSelect('sections.tasks', 'tasks')
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

    let taskCounter = innovationSection.tasks.length;
    const displayId = InnovationSectionAliasEnum[data.section] + (++taskCounter).toString().slice(-2).padStart(2, '0');

    const taskObj = InnovationTaskEntity.new({
      displayId: displayId,
      status: InnovationTaskStatusEnum.OPEN,
      innovationSection: InnovationSectionEntity.new({ id: innovationSection.id }),
      createdBy: domainContext.id,
      updatedBy: domainContext.id,
      createdByUserRole: UserRoleEntity.new({ id: domainContext.currentRole.id }),
      assignedToUserRole: UserRoleEntity.new({ id: domainContext.currentRole.id }),
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

      const { message } = await this.innovationThreadsService.createThreadOrMessage(
        domainContext,
        innovationId,
        this.getSaveTaskSubject(taskResult.displayId, data.section),
        data.description,
        taskResult.id,
        ThreadContextTypeEnum.TASK,
        transaction,
        false
      );

      if (message) {
        await this.linkMessage(taskResult.id, message.id, InnovationTaskStatusEnum.OPEN, transaction);
      }

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
      task: { id: result.id }
    });

    return result;
  }

  async updateTaskAsAccessor(
    domainContext: DomainContextType,
    innovationId: string,
    taskId: string,
    data: { status: InnovationTaskStatusEnum; message: string },
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
      ![InnovationTaskStatusEnum.CANCELLED, InnovationTaskStatusEnum.OPEN].includes(data.status) ||
      (data.status === InnovationTaskStatusEnum.CANCELLED && dbTask.status !== InnovationTaskStatusEnum.OPEN) ||
      (data.status === InnovationTaskStatusEnum.OPEN &&
        ![InnovationTaskStatusEnum.DONE, InnovationTaskStatusEnum.DECLINED].includes(dbTask.status))
    ) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TASK_WITH_UNPROCESSABLE_STATUS);
    }

    dbTask.updatedByUserRole = UserRoleEntity.new({ id: domainContext.currentRole.id });

    const { task, threadId, messageId } = await this.saveTask(domainContext, innovationId, dbTask, data, connection);

    // Send task status update to innovation owner
    await this.notifierService.send(domainContext, NotifierTypeEnum.TASK_UPDATE, {
      innovationId: dbTask.innovationSection.innovation.id,
      task: {
        id: dbTask.id,
        status: task.status
      },
      message: data.message,
      messageId: messageId,
      threadId: threadId
    });

    return { id: task.id };
  }

  async updateTaskAsNeedsAccessor(
    domainContext: DomainContextType,
    innovationId: string,
    taskId: string,
    data: { status: InnovationTaskStatusEnum; message: string },
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
      ![InnovationTaskStatusEnum.CANCELLED, InnovationTaskStatusEnum.OPEN].includes(data.status) ||
      (data.status === InnovationTaskStatusEnum.CANCELLED && dbTask.status !== InnovationTaskStatusEnum.OPEN) ||
      (data.status === InnovationTaskStatusEnum.OPEN &&
        ![InnovationTaskStatusEnum.DONE, InnovationTaskStatusEnum.DECLINED].includes(dbTask.status))
    ) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TASK_WITH_UNPROCESSABLE_STATUS);
    }

    dbTask.updatedByUserRole = UserRoleEntity.new({ id: domainContext.currentRole.id });

    const { task, threadId, messageId } = await this.saveTask(domainContext, innovationId, dbTask, data, connection);

    // Send task status update to innovation owner
    await this.notifierService.send(domainContext, NotifierTypeEnum.TASK_UPDATE, {
      innovationId: dbTask.innovationSection.innovation.id,
      task: {
        id: dbTask.id,
        status: task.status
      },
      message: data.message,
      messageId: messageId,
      threadId: threadId
    });

    return { id: task.id };
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

    const { task, threadId, messageId } = await this.saveTask(domainContext, innovationId, dbTask, data, connection);

    await this.notifierService.send(domainContext, NotifierTypeEnum.TASK_UPDATE, {
      innovationId: innovationId,
      task: {
        id: dbTask.id,
        status: task.status
      },
      message: data.message,
      messageId: messageId,
      threadId: threadId
    });

    return { id: task.id };
  }

  /**
   * returns ths task subject according to the status
   * @param displayId the display id of the task
   * @param section the section of the task
   * @returns the task subject according to the status
   */
  private getSaveTaskSubject(displayId: string, section: CurrentCatalogTypes.InnovationSections): string {
    switch (section) {
      case 'INNOVATION_DESCRIPTION':
        return `Task (${displayId}) update section 1.1 (Description of innovation)`;
      case 'UNDERSTANDING_OF_NEEDS':
        return `Task (${displayId}) update section 2.1 (Detailed understanding of needs and benefits)`;
      case 'EVIDENCE_OF_EFFECTIVENESS':
        return `Task (${displayId}) update section 2.2 (Evidence of impact and benefit)`;
      case 'MARKET_RESEARCH':
        return `Task (${displayId}) update section 3.1 (Market research)`;
      case 'CURRENT_CARE_PATHWAY':
        return `Task (${displayId}) update section 3.2 (Current care pathway)`;
      case 'TESTING_WITH_USERS':
        return `Task (${displayId}) update section 4.1 (Testing with users)`;
      case 'REGULATIONS_AND_STANDARDS':
        return `Task (${displayId}) update section 5.1 (Regulatory approvals, standards and certifications)`;
      case 'INTELLECTUAL_PROPERTY':
        return `Task (${displayId}) update section 5.2 (Intellectual property)`;
      case 'REVENUE_MODEL':
        return `Task (${displayId}) update section 6.1 (Revenue model)`;
      case 'COST_OF_INNOVATION':
        return `Task (${displayId}) update section 7.1 (Cost of your innovation)`;
      case 'DEPLOYMENT':
        return `Task (${displayId}) update section 8.1 (Deployment)`;
      default: {
        const s: never = section;
        throw new NotImplementedError(InnovationErrorsEnum.INNOVATION_SECTION_NOT_FOUND, { details: s });
      }
    }
  }

  private async saveTask(
    domainContext: DomainContextType,
    innovationId: string,
    dbTask: InnovationTaskEntity,
    data: { status: InnovationTaskStatusEnum; message: string },
    entityManager: EntityManager
  ): Promise<{ task: InnovationTaskEntity; messageId: string; threadId: string }> {
    const user = { id: domainContext.id, identityId: domainContext.identityId };

    return entityManager.transaction(async transaction => {
      let threadMessage: InnovationThreadMessageEntity | null = null;

      threadMessage = (
        await this.innovationThreadsService.createThreadMessageByContextId(
          domainContext,
          ThreadContextTypeEnum.TASK,
          dbTask.id,
          data.message,
          false,
          false,
          transaction
        )
      ).threadMessage;

      await this.linkMessage(dbTask.id, threadMessage.id, data.status, transaction);

      if (data.status === InnovationTaskStatusEnum.DECLINED) {
        await this.domainService.innovations.addActivityLog(
          transaction,
          { innovationId, activity: ActivityEnum.TASK_STATUS_DECLINED_UPDATE, domainContext },
          {
            taskId: dbTask.id,
            interveningUserId: dbTask.createdBy,
            comment: { id: threadMessage?.id || '', value: data.message ?? '' }
          }
        );
      }

      if (data.status === InnovationTaskStatusEnum.DONE) {
        await this.domainService.innovations.addActivityLog(
          transaction,
          { innovationId, activity: ActivityEnum.TASK_STATUS_DONE_UPDATE, domainContext },
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

      const task = await transaction.save(InnovationTaskEntity, dbTask);
      return {
        task: task,
        messageId: threadMessage.id,
        threadId: threadMessage.thread.id
      };
    });
  }

  /**
   * links a thread message to a task
   *
   * This is used by open and reopen tasks in order to link the message to the task
   * @param taskId
   * @param messageId
   * @param status
   * @param transaction
   */
  private async linkMessage(
    taskId: string,
    messageId: string,
    status: InnovationTaskStatusEnum,
    transaction: EntityManager
  ): Promise<void> {
    await transaction
      .createQueryBuilder()
      .insert()
      .orIgnore()
      .into('innovation_task_message')
      .values({
        innovation_task_id: taskId,
        innovation_thread_message_id: messageId,
        status: status
      })
      .execute();
  }

  private isSameOrganisation(
    domainContext: DomainContextType,
    createdBy: { role: ServiceRoleEnum; unitId: string | undefined }
  ): boolean {
    switch (domainContext.currentRole.role) {
      case ServiceRoleEnum.INNOVATOR:
      case ServiceRoleEnum.ADMIN:
      case ServiceRoleEnum.ASSESSMENT:
        return domainContext.currentRole.role === createdBy.role;
      case ServiceRoleEnum.ACCESSOR:
      case ServiceRoleEnum.QUALIFYING_ACCESSOR:
        return domainContext.organisation?.organisationUnit?.id === createdBy.unitId;
      default: {
        const r: never = domainContext.currentRole;
        throw new NotImplementedError(UserErrorsEnum.USER_ROLE_NOT_FOUND, { details: r });
      }
    }
  }

  async reassignTask(
    domainContext: DomainContextType,
    taskId: string,
    newAssessorRoleId: string,
    entityManager?: EntityManager
  ): Promise<void> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const task = await connection
      .createQueryBuilder(InnovationTaskEntity, 'task')
      .leftJoinAndSelect('task.assignedToUserRole', 'assignedToUserRole')
      .innerJoinAndSelect('task.createdByUserRole', 'createdByUserRole')
      .where('task.id = :taskId', { taskId })
      .getOne();

    if (!task) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_TASK_NOT_FOUND);
    }



    const oldAssessorRoleId = (task.assignedToUserRole ?? task.createdByUserRole)?.id;

    if (!oldAssessorRoleId) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_TASK_NOT_FOUND);
    }

    await connection.transaction(async transaction => {
      await transaction.update(
        InnovationTaskEntity,
        { id: taskId },
        { assignedToUserRole: UserRoleEntity.new({ id: newAssessorRoleId }) }
      );

      const thread = await transaction
        .createQueryBuilder(InnovationThreadEntity, 'thread')
        .where('thread.context_id = :contextId', { contextId: taskId })
        .andWhere('thread.context_type = :contextType', { contextType: ThreadContextTypeEnum.TASK })
        .getOne();

      if (thread) {
        if (oldAssessorRoleId)
          await this.innovationThreadsService.removeFollowers(thread.id, [oldAssessorRoleId], transaction);
        await this.innovationThreadsService.addFollowersToThread(
          domainContext,
          thread.id,
          [newAssessorRoleId],
          false,
          transaction
        );
      }
    });
  }
}
