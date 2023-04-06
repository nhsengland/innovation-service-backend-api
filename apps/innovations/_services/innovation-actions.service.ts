import { inject, injectable } from 'inversify';

import { ActivityLogEntity, InnovationActionEntity, InnovationEntity, InnovationSectionEntity, InnovationSupportEntity, UserEntity, UserRoleEntity } from '@innovations/shared/entities';
import { ActivityEnum, InnovationActionStatusEnum, InnovationCollaboratorStatusEnum, InnovationStatusEnum, InnovationSupportStatusEnum, NotificationContextTypeEnum, NotifierTypeEnum, ServiceRoleEnum, ThreadContextTypeEnum } from '@innovations/shared/enums';
import { ForbiddenError, InnovationErrorsEnum, NotFoundError, UnprocessableEntityError } from '@innovations/shared/errors';
import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import { DomainServiceSymbol, DomainServiceType, IdentityProviderServiceSymbol, IdentityProviderServiceType, NotifierServiceSymbol, NotifierServiceType } from '@innovations/shared/services';
import { ActivityLogListParamsType, DateISOType, DomainContextType, isAccessorDomainContextType } from '@innovations/shared/types';

import { InnovationThreadsServiceSymbol, InnovationThreadsServiceType } from './interfaces';

import { CurrentCatalogTypes, CurrentDocumentConfig } from '@innovations/shared/schemas/innovation-record';
import { Brackets, EntityManager } from 'typeorm';
import { BaseService } from './base.service';


@injectable()
export class InnovationActionsService extends BaseService {

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType,
    @inject(InnovationThreadsServiceSymbol) private innovationThreadsService: InnovationThreadsServiceType,
    @inject(IdentityProviderServiceSymbol) private identityProviderService: IdentityProviderServiceType
  ) { super(); }


  async getActionsList(
    domainContext: DomainContextType,
    filters: {
      innovationId?: string,
      innovationName?: string,
      sections?: CurrentCatalogTypes.InnovationSections[],
      status?: InnovationActionStatusEnum[],
      innovationStatus?: InnovationStatusEnum[],
      createdByMe?: boolean,
      allActions?: boolean,
      fields: ('notifications')[]
    },
    pagination: PaginationQueryParamsType<'displayId' | 'section' | 'innovationName' | 'createdAt' | 'status'>,
    entityManager?: EntityManager,
  ): Promise<{
    count: number,
    data: {
      id: string,
      displayId: string,
      description: string,
      innovation: { id: string, name: string },
      status: InnovationActionStatusEnum,
      section: CurrentCatalogTypes.InnovationSections,
      createdAt: DateISOType,
      updatedAt: DateISOType,
      updatedBy: { name: string, role?: ServiceRoleEnum | undefined },
      createdBy: { id: string, name: string, role?: ServiceRoleEnum | undefined, organisationUnit?: { id: string, name: string, acronym?: string } },
      notifications?: number
    }[]
  }> {

    const em = entityManager ?? this.sqlConnection.manager;


    const query = em.createQueryBuilder(InnovationActionEntity, 'action')
      .select([
        'action.id', 'action.displayId', 'action.description', 'action.status', 'action.createdAt', 'action.updatedAt',
        'innovation.name', 'innovation.id',
        'innovationSection.section',
        'innovationSupport.id',
        'updatedByUser.identityId', 'updatedByUserRole.role',
        'createdByUser.id', 'createdByUser.identityId', 'createdByUserRole.role',
        'organisationUnit.id', 'organisationUnit.acronym', 'organisationUnit.name'
      ])
      .innerJoin('action.innovationSection', 'innovationSection')
      .innerJoin('innovationSection.innovation', 'innovation')
      .innerJoin('action.createdByUser', 'createdByUser')
      .leftJoin('action.innovationSupport', 'innovationSupport')
      .leftJoin('innovationSupport.organisationUnit', 'organisationUnit')
      .leftJoin('action.createdByUserRole', 'createdByUserRole')
      .leftJoin('action.updatedByUserRole', 'updatedByUserRole')
      .leftJoin('updatedByUserRole.user', 'updatedByUser');

    if (domainContext.currentRole.role === ServiceRoleEnum.INNOVATOR) {
      query.leftJoin('innovation.collaborators', 'collaborator', 'collaborator.status = :status', { status: InnovationCollaboratorStatusEnum.ACTIVE });
      query.andWhere(new Brackets(qb => {
        qb.andWhere('innovation.owner_id = :ownerId', { ownerId: domainContext.id });
        qb.orWhere('collaborator.user_id = :userId', { userId: domainContext.id });
      }));
    }

    if (domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT) {
      if (!filters.allActions) {
        query.andWhere('action.innovation_support_id IS NULL');
      }
      query.andWhere('innovation.status IN (:...assessmentInnovationStatus)', { assessmentInnovationStatus: [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT, InnovationStatusEnum.NEEDS_ASSESSMENT, InnovationStatusEnum.IN_PROGRESS] });
    }

    if (isAccessorDomainContextType(domainContext)) {

      query.innerJoin('innovation.organisationShares', 'shares');
      query.leftJoin('innovation.innovationSupports', 'accessorSupports', 'accessorSupports.organisation_unit_id = :accessorSupportsOrganisationUnitId', { accessorSupportsOrganisationUnitId: domainContext.organisation.organisationUnit.id });
      query.andWhere('innovation.status IN (:...accessorInnovationStatus)', { accessorInnovationStatus: [InnovationStatusEnum.IN_PROGRESS, InnovationStatusEnum.COMPLETE] });
      query.andWhere('shares.id = :accessorOrganisationId', { accessorOrganisationId: domainContext.organisation.id });

      if (domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR) {
        query.andWhere('accessorSupports.status IN (:...accessorSupportsSupportStatuses01)', { accessorSupportsSupportStatuses01: [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.COMPLETE] });
        // query.andWhere('accessorSupports.organisation_unit_id = :organisationUnitId ', { organisationUnitId: user.organisationUnitId });
      }

      if (!filters.allActions) {
        query.andWhere('action.innovation_support_id IS NOT NULL');
      }

    }

    // Filters.
    if (filters.innovationId) {
      query.andWhere('innovation.id = :innovationId', { innovationId: filters.innovationId });
    }

    if (filters.innovationName) {
      query.andWhere('innovation.name LIKE :innovationName', { innovationName: `%${filters.innovationName}%` });
    }

    if (filters.sections && filters.sections.length > 0) {
      query.andWhere('innovationSection.section IN (:...sections)', { sections: filters.sections });
    }

    if (filters.status && filters.status.length > 0) {
      query.andWhere('action.status IN (:...statuses)', { statuses: filters.status });
    }

    if (filters.innovationStatus && filters.innovationStatus.length > 0) {
      query.andWhere('innovation.status IN (:...statuses)', { statuses: filters.innovationStatus });
    }

    if (filters.createdByMe) {
      query.andWhere('createdByUser.id = :createdBy', { createdBy: domainContext.id });
      if (isAccessorDomainContextType(domainContext)) {
        query.andWhere('innovationSupport.organisation_unit_id = :orgUnitId', { orgUnitId: domainContext.organisation.organisationUnit.id });
      }
    }

    // Pagination and ordering.
    query.skip(pagination.skip);
    query.take(pagination.take);

    for (const [key, order] of Object.entries(pagination.order)) {
      let field: string;
      switch (key) {
        case 'displayId': field = 'action.displayId'; break;
        case 'section': field = 'innovationSection.section'; break;
        case 'innovationName': field = 'innovation.name'; break;
        case 'createdAt': field = 'action.createdAt'; break;
        case 'updatedAt': field = 'action.updatedAt'; break;
        case 'status': field = 'action.status'; break;
        default:
          field = 'action.createdAt'; break;
      }
      query.addOrderBy(field, order);
    }

    const [actions, count] = await query.getManyAndCount();

    if (count === 0) {
      return { count: 0, data: [] };
    }


    let notifications: { id: string, contextType: NotificationContextTypeEnum, contextId: string, params: Record<string, unknown> }[] = [];

    if (filters.fields?.includes('notifications')) {
      notifications = await this.domainService.innovations.getUnreadNotifications(domainContext.currentRole.id, actions.map(action => action.id), em);
    }

    const usersIds = actions.flatMap(action => [action.createdByUser.identityId, action.updatedByUserRole?.user.identityId]).filter(((u): u is string => u !== undefined));
    const usersInfo = await this.identityProviderService.getUsersMap(usersIds);

    const data = actions.map((action) => ({
      id: action.id,
      displayId: action.displayId,
      description: action.description,
      innovation: { id: action.innovationSection.innovation.id, name: action.innovationSection.innovation.name },
      status: action.status,
      section: action.innovationSection.section,
      createdAt: action.createdAt,
      updatedAt: action.updatedAt,
      updatedBy: {
        name: (action.updatedByUserRole && usersInfo.get(action.updatedByUserRole.user.identityId)?.displayName) ?? '',
        role: action.updatedByUserRole?.role,
      },
      createdBy: {
        id: action.createdByUser.id,
        name: usersInfo.get(action.createdByUser.identityId)?.displayName ?? '',
        role: action.createdByUserRole?.role,
        ...(action.innovationSupport ? {
          organisationUnit: {
            id: action.innovationSupport?.organisationUnit?.id,
            name: action.innovationSupport?.organisationUnit?.name,
            acronym: action.innovationSupport?.organisationUnit?.acronym
          }
        } : {})
      },
      ...(!filters.fields?.includes('notifications') ? {} : {
        notifications: notifications.filter(item => item.contextId === action.id).length
      })
    }));

    return { count, data };

  }


  async getActionInfo(actionId: string, entityManager?: EntityManager): Promise<{
    id: string,
    displayId: string,
    status: InnovationActionStatusEnum,
    section: CurrentCatalogTypes.InnovationSections,
    description: string,
    createdAt: DateISOType,
    updatedAt: DateISOType,
    updatedBy: { name: string, role: ServiceRoleEnum, isOwner?: boolean },
    createdBy: { id: string, name: string, role: ServiceRoleEnum, organisationUnit?: { id: string, name: string, acronym?: string } },
    declineReason?: string
  }> {

    const em = entityManager ?? this.sqlConnection.manager;

    const dbAction = await em.createQueryBuilder(InnovationActionEntity, 'action')
      .select([
        'action.id', 'action.status', 'action.displayId', 'action.description', 'action.createdAt', 'action.updatedAt', 'action.createdBy', 'action.updatedBy',
        'innovationSection.id', 'innovationSection.section',
        'innovation.id',
        'owner.id',
        'createdByUserRole.id', 'createdByUserRole.role',
        'createdByUserOrganisationUnit.id', 'createdByUserOrganisationUnit.name', 'createdByUserOrganisationUnit.acronym',
        'createdByUser.id', 'createdByUser.identityId',
        'updatedByUserRole.id', 'updatedByUserRole.role',
        'updatedByUser.id', 'updatedByUser.identityId',
      ])
      .innerJoin('action.innovationSection', 'innovationSection')
      .innerJoin('innovationSection.innovation', 'innovation')
      .innerJoin('innovation.owner', 'owner')
      .innerJoin('action.createdByUserRole', 'createdByUserRole')
      .innerJoin('createdByUserRole.user', 'createdByUser')
      .leftJoin('createdByUserRole.organisationUnit', 'createdByUserOrganisationUnit')
      .innerJoin('action.updatedByUserRole', 'updatedByUserRole')
      .innerJoin('updatedByUserRole.user', 'updatedByUser')
      .where('action.id = :actionId', { actionId })
      .getOne();
    if (!dbAction) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ACTION_NOT_FOUND);
    }

    let declineReason: string | null = null;
    if (dbAction.status === InnovationActionStatusEnum.DECLINED) {
      const activityLogDeclineReason = await em
        .createQueryBuilder(ActivityLogEntity, 'activityLog')
        .where('activityLog.innovation_id = :innovationId', { innovationId: dbAction.innovationSection.innovation.id })
        .andWhere('activity = :activity', { activity: ActivityEnum.ACTION_STATUS_DECLINED_UPDATE })
        .andWhere('JSON_VALUE(param, \'$.actionId\') = :actionId', { actionId })
        .getOne();

      if (activityLogDeclineReason?.param) {
        const params = activityLogDeclineReason.param as ActivityLogListParamsType;
        declineReason = params.comment?.value ?? null;
      }
    }

    const createdByUser = await this.identityProviderService.getUserInfo(dbAction.createdByUserRole.user.identityId);
    const lastUpdatedByUser = await this.identityProviderService.getUserInfo(dbAction.updatedByUserRole.user.identityId);

    return {
      id: dbAction.id,
      displayId: dbAction.displayId,
      status: dbAction.status,
      description: dbAction.description,
      section: dbAction.innovationSection.section,
      createdAt: dbAction.createdAt,
      updatedAt: dbAction.updatedAt,
      updatedBy: {
        name: lastUpdatedByUser.displayName,
        role: dbAction.updatedByUserRole.role,
        ...(dbAction.updatedByUserRole.role === ServiceRoleEnum.INNOVATOR && {
          isOwner: dbAction.innovationSection.innovation.owner.id === dbAction.updatedByUserRole.user.id
        })
      },
      createdBy: {
        id: dbAction.createdByUserRole.user.id,
        name: createdByUser.displayName,
        role: dbAction.createdByUserRole.role,
        ...(dbAction.createdByUserRole.organisationUnit && {
          organisationUnit: {
            id: dbAction.createdByUserRole.organisationUnit.id,
            name: dbAction.createdByUserRole.organisationUnit.name,
            acronym: dbAction.createdByUserRole.organisationUnit.acronym
          }
        })
      },
      ...(declineReason ? { declineReason } : {})
    };

  }


  async createAction(
    user: { id: string, identityId: string },
    domainContext: DomainContextType,
    innovationId: string,
    data: { section: CurrentCatalogTypes.InnovationSections, description: string },
    entityManager?: EntityManager,
  ): Promise<{ id: string }> {

    const connection = entityManager ?? this.sqlConnection.manager;

    const innovation = await connection.createQueryBuilder(InnovationEntity, 'innovation')
      .innerJoinAndSelect('innovation.owner', 'owner')
      .leftJoinAndSelect('innovation.sections', 'sections')
      .leftJoinAndSelect('innovation.innovationSupports', 'supports')
      .leftJoinAndSelect('supports.organisationUnit', 'organisationUnit')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    // Get section & support data.
    const innovationSection = (await innovation.sections).find(sec => sec.section === data.section);
    if (!innovationSection) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SECTION_NOT_FOUND);
    }

    const innovationSupport = innovation.innovationSupports.find(
      is => is.organisationUnit.id === domainContext.organisation?.organisationUnit?.id
    );

    let actionCounter = (await innovationSection.actions).length;
    const displayId = CurrentDocumentConfig.InnovationSectionAliasEnum[data.section] + (++actionCounter).toString().slice(-2).padStart(2, '0');

    const actionObj = InnovationActionEntity.new({
      displayId: displayId,
      description: data.description,
      status: InnovationActionStatusEnum.REQUESTED,
      innovationSection: InnovationSectionEntity.new({ id: innovationSection.id }),
      createdBy: user.id,
      updatedBy: user.id,
      createdByUserRole: UserRoleEntity.new({ id: domainContext.currentRole.id }),
      updatedByUserRole: UserRoleEntity.new({ id: domainContext.currentRole.id }),
    });

    if (innovationSupport) {
      actionObj.innovationSupport = InnovationSupportEntity.new({ id: innovationSupport.id });
    } else if (!innovationSupport && (domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR || domainContext.currentRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR)) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND);
    }

    // Add new action to db and log action creation to innovation's activity log
    const result = await connection.transaction(async transaction => {

      const actionResult = await transaction.save<InnovationActionEntity>(actionObj);

      await this.domainService.innovations.addActivityLog(
        transaction,
        { innovationId: innovation.id, activity: ActivityEnum.ACTION_CREATION, domainContext },
        {
          sectionId: data.section,
          actionId: actionResult.id,
          comment: { value: data.description },
          role: domainContext.currentRole.role as ServiceRoleEnum,
        }
      );

      return { id: actionResult.id };

    });

    await this.notifierService.send(
      { id: user.id, identityId: user.identityId },
      NotifierTypeEnum.ACTION_CREATION,
      {
        innovationId: innovation.id,
        action: { id: result.id, section: data.section }
      },
      domainContext,
    );

    return result;

  }


  async updateActionAsAccessor(
    user: { id: string, identityId: string },
    domainContext: DomainContextType,
    innovationId: string,
    actionId: string,
    data: { status: InnovationActionStatusEnum },
    entityManager?: EntityManager,
  ): Promise<{ id: string }> {

    const connection = entityManager ?? this.sqlConnection.manager;

    const dbAction = await connection.createQueryBuilder(InnovationActionEntity, 'ia')
      .innerJoinAndSelect('ia.innovationSection', 'is')
      .innerJoinAndSelect('ia.innovationSupport', 'isup')
      .innerJoinAndSelect('is.innovation', 'i')
      .innerJoinAndSelect('isup.organisationUnit', 'ou')
      .innerJoinAndSelect('ou.organisation', 'o')
      .where('ia.id = :actionId', { actionId })
      .getOne();
    if (!dbAction) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ACTION_NOT_FOUND);
    }

    // Actions can only be updated from users from the same org unit
    if (dbAction.innovationSupport?.organisationUnit.id !== domainContext.organisation?.organisationUnit?.id) {
      throw new ForbiddenError(InnovationErrorsEnum.INNOVATION_ACTION_FROM_DIFFERENT_UNIT);
    }

    if (![InnovationActionStatusEnum.SUBMITTED, InnovationActionStatusEnum.REQUESTED].includes(dbAction.status)) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ACTION_WITH_UNPROCESSABLE_STATUS);
    }

    if (
      dbAction.status === InnovationActionStatusEnum.REQUESTED && data.status !== InnovationActionStatusEnum.CANCELLED
      || dbAction.status === InnovationActionStatusEnum.SUBMITTED && ![InnovationActionStatusEnum.COMPLETED, InnovationActionStatusEnum.REQUESTED].includes(data.status)) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ACTION_WITH_UNPROCESSABLE_STATUS);
    }

    dbAction.updatedByUserRole = UserRoleEntity.new({ id: domainContext.currentRole.id });

    const result = await this.saveAction(user, domainContext, innovationId, dbAction, data, connection);

    // Send action status update to innovation owner
    await this.notifierService.send(
      { id: user.id, identityId: user.identityId },
      NotifierTypeEnum.ACTION_UPDATE,
      {
        innovationId: dbAction.innovationSection.innovation.id,
        action: {
          id: dbAction.id,
          section: dbAction.innovationSection.section,
          status: result.status
        }
      },
      domainContext
    );

    return { id: result.id };

  }

  async updateActionAsNeedsAccessor(
    user: { id: string, identityId: string },
    domainContext: DomainContextType,
    innovationId: string,
    actionId: string,
    data: { status: InnovationActionStatusEnum },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {

    const connection = entityManager ?? this.sqlConnection.manager;

    const dbAction = await connection.createQueryBuilder(InnovationActionEntity, 'ia')
      .innerJoinAndSelect('ia.innovationSection', 'is')
      .innerJoinAndSelect('is.innovation', 'i')
      .leftJoinAndSelect('ia.innovationSupport', 'isup')
      .where('ia.id = :actionId', { actionId })
      .andWhere('ia.innovationSupport.id IS NULL')
      .getOne();
    if (!dbAction) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ACTION_NOT_FOUND);
    }

    if (![InnovationActionStatusEnum.SUBMITTED, InnovationActionStatusEnum.REQUESTED].includes(dbAction.status)) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ACTION_WITH_UNPROCESSABLE_STATUS);
    }

    if (
      dbAction.status === InnovationActionStatusEnum.REQUESTED && data.status !== InnovationActionStatusEnum.CANCELLED
      || dbAction.status === InnovationActionStatusEnum.SUBMITTED && ![InnovationActionStatusEnum.COMPLETED, InnovationActionStatusEnum.REQUESTED].includes(data.status)) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ACTION_WITH_UNPROCESSABLE_STATUS);
    }

    dbAction.updatedByUserRole = UserRoleEntity.new({ id: domainContext.currentRole.id });

    const result = await this.saveAction(user, domainContext, innovationId, dbAction, data, connection);

    // Send action status update to innovation owner
    await this.notifierService.send(
      { id: user.id, identityId: user.identityId },
      NotifierTypeEnum.ACTION_UPDATE,
      {
        innovationId: dbAction.innovationSection.innovation.id,
        action: {
          id: dbAction.id,
          section: dbAction.innovationSection.section,
          status: result.status
        }
      },
      domainContext
    );

    return { id: result.id };

  }

  async updateActionAsInnovator(
    user: { id: string, identityId: string },
    domainContext: DomainContextType,
    innovationId: string,
    actionId: string,
    data: { status: InnovationActionStatusEnum, message: string },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {

    const connection = entityManager ?? this.sqlConnection.manager;

    const dbAction = await connection.createQueryBuilder(InnovationActionEntity, 'action')
      .innerJoinAndSelect('action.innovationSection', 'section')
      .where('action.id = :actionId', { actionId })
      .getOne();

    if (!dbAction) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ACTION_NOT_FOUND);
    }

    if (dbAction.status !== InnovationActionStatusEnum.REQUESTED) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ACTION_WITH_UNPROCESSABLE_STATUS);
    }

    dbAction.updatedByUserRole = UserRoleEntity.new({ id: domainContext.currentRole.id });

    const result = await this.saveAction(user, domainContext, innovationId, dbAction, data, connection);

    await this.notifierService.send(
      { id: user.id, identityId: user.identityId },
      NotifierTypeEnum.ACTION_UPDATE,
      {
        innovationId: innovationId,
        action: {
          id: dbAction.id,
          section: dbAction.innovationSection.section,
          status: result.status
        },
        comment: data.message
      },
      domainContext,
    );

    return { id: result.id };

  }

  /**
   * returns ths action subject according to the status
   * @param dbAction the action to get the subject from
   * @param status the status to get the subject from
   * @returns the action subject according to the status
   */
  private getSaveActionSubject(dbAction: InnovationActionEntity, status: InnovationActionStatusEnum): string {
    switch (status) {
      case InnovationActionStatusEnum.DECLINED:
        return `Action ${dbAction.displayId} declined`;
      // TODO this should be reviewed as this never happens in current implementation
      default:
        return `Action ${dbAction.displayId} updated`;
    }
  }

  private async saveAction(
    user: { id: string, identityId: string },
    domainContext: DomainContextType,
    innovationId: string,
    dbAction: InnovationActionEntity,
    data: { status: InnovationActionStatusEnum, message?: string },
    entityManager?: EntityManager
  ): Promise<InnovationActionEntity> {

    const connection = entityManager ?? this.sqlConnection.manager;

    return connection.transaction(async transaction => {

      let thread;

      if (data.message) {

        thread = await this.innovationThreadsService.createThreadOrMessage(
          { id: user.id, identityId: user.identityId },
          domainContext,
          innovationId,
          this.getSaveActionSubject(dbAction, data.status),
          data.message,
          dbAction.id,
          ThreadContextTypeEnum.ACTION,
          transaction,
          true
        );

      }

      if (data.status === InnovationActionStatusEnum.DECLINED) {

        const actionCreatedBy = await connection.createQueryBuilder(UserEntity, 'user')
          .where('user.id = :id', { id: dbAction.createdBy })
          .getOne();

        await this.domainService.innovations.addActivityLog(
          transaction,
          { innovationId, activity: ActivityEnum.ACTION_STATUS_DECLINED_UPDATE, domainContext },
          {
            actionId: dbAction.id,
            interveningUserId: actionCreatedBy?.id || '',
            comment: { id: thread?.message?.id || '', value: thread?.message?.message || '' }
          });

      }

      if (data.status === InnovationActionStatusEnum.COMPLETED) {

        await this.domainService.innovations.addActivityLog(
          transaction,
          { innovationId, activity: ActivityEnum.ACTION_STATUS_COMPLETED_UPDATE, domainContext },
          { actionId: dbAction.id }
        );

      }

      if (data.status === InnovationActionStatusEnum.REQUESTED) {

        await this.domainService.innovations.addActivityLog(
          transaction,
          { innovationId, activity: ActivityEnum.ACTION_STATUS_REQUESTED_UPDATE, domainContext },
          { actionId: dbAction.id }
        );

      }

      if (data.status === InnovationActionStatusEnum.CANCELLED) {

        await this.domainService.innovations.addActivityLog(
          transaction,
          { innovationId, activity: ActivityEnum.ACTION_STATUS_CANCELLED_UPDATE, domainContext },
          { actionId: dbAction.id }
        );

      }

      dbAction.status = data.status;
      dbAction.updatedBy = user.id;
      dbAction.updatedByUserRole = UserRoleEntity.new({ id: domainContext.currentRole.id });

      return transaction.save(InnovationActionEntity, dbAction);

    });

  }

}
