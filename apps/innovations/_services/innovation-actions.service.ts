import { inject, injectable } from 'inversify';

import { ActivityLogEntity, InnovationActionEntity, InnovationEntity, InnovationSectionEntity, InnovationSupportEntity, UserEntity } from '@innovations/shared/entities';
import { AccessorOrganisationRoleEnum, ActivityEnum, InnovationActionStatusEnum, InnovationSectionAliasEnum, InnovationSectionEnum, InnovationStatusEnum, InnovationSupportStatusEnum, InnovatorOrganisationRoleEnum, NotificationContextTypeEnum, NotifierTypeEnum, ThreadContextTypeEnum, UserTypeEnum } from '@innovations/shared/enums';
import { ForbiddenError, InnovationErrorsEnum, NotFoundError, UnprocessableEntityError } from '@innovations/shared/errors';
import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import { DomainServiceSymbol, DomainServiceType, IdentityProviderServiceSymbol, IdentityProviderServiceType, NotifierServiceSymbol, NotifierServiceType } from '@innovations/shared/services';
import type { DateISOType, DomainContextType, ActivityLogListParamsType } from '@innovations/shared/types';

import { InnovationThreadsServiceSymbol, InnovationThreadsServiceType } from './interfaces';

import { BaseService } from './base.service';


@injectable()
export class InnovationActionsService extends BaseService {

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(IdentityProviderServiceSymbol) private identityProviderService: IdentityProviderServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType,
    @inject(InnovationThreadsServiceSymbol) private innovationThreadsService: InnovationThreadsServiceType,
  ) { super(); }


  async getActionsList(
    user: { id: string, type: UserTypeEnum, organisationId?: string, organisationRole?: AccessorOrganisationRoleEnum | InnovatorOrganisationRoleEnum, organisationUnitId?: string },
    filters: {
      innovationId?: string,
      innovationName?: string,
      sections?: InnovationSectionEnum[],
      status?: InnovationActionStatusEnum[],
      createdByMe?: boolean,
      fields: ('notifications')[]
    },
    pagination: PaginationQueryParamsType<'displayId' | 'section' | 'innovationName' | 'createdAt' | 'status'>
  ): Promise<{
    count: number,
    data: {
      id: string,
      displayId: string,
      description: string,
      innovation: { id: string, name: string },
      status: InnovationActionStatusEnum,
      section: InnovationSectionEnum,
      createdAt: DateISOType,
      updatedAt: DateISOType,
      notifications?: number
    }[]
  }> {

    const query = this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'action')
      .innerJoinAndSelect('action.innovationSection', 'innovationSection')
      .innerJoinAndSelect('innovationSection.innovation', 'innovation');


    if (user.type === UserTypeEnum.INNOVATOR) {
      query.andWhere('innovation.owner_id = :innovatorUserId', { innovatorUserId: user.id });
    }

    if (user.type === UserTypeEnum.ASSESSMENT) {
      query.andWhere('innovation.status IN (:...assessmentInnovationStatus)', { assessmentInnovationStatus: [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT, InnovationStatusEnum.NEEDS_ASSESSMENT, InnovationStatusEnum.IN_PROGRESS] });
    }

    if (user.type === UserTypeEnum.ACCESSOR) {

      query.innerJoin('innovation.organisationShares', 'shares');
      query.leftJoin('innovation.innovationSupports', 'accessorSupports', 'accessorSupports.organisation_unit_id = :accessorSupportsOrganisationUnitId', { accessorSupportsOrganisationUnitId: user.organisationUnitId });
      query.andWhere('innovation.status IN (:...accessorInnovationStatus)', { accessorInnovationStatus: [InnovationStatusEnum.IN_PROGRESS, InnovationStatusEnum.COMPLETE] });
      query.andWhere('shares.id = :accessorOrganisationId', { accessorOrganisationId: user.organisationId });

      if (user.organisationRole === AccessorOrganisationRoleEnum.ACCESSOR) {
        query.andWhere('accessorSupports.status IN (:...accessorSupportsSupportStatuses01)', { accessorSupportsSupportStatuses01: [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.COMPLETE] });
        // query.andWhere('accessorSupports.organisation_unit_id = :organisationUnitId ', { organisationUnitId: user.organisationUnitId });
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

    if (filters.createdByMe) {
      query.andWhere('action.created_by = :createdBy', { createdBy: user.id });
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
        case 'status': field = 'action.status'; break;
        default:
          field = 'action.createdAt'; break;
      }
      query.addOrderBy(field, order);
    }

    const dbActions = await query.getManyAndCount();

    if (dbActions[1] === 0) {
      return { count: 0, data: [] };
    }


    let notifications: { id: string, contextType: NotificationContextTypeEnum, contextId: string, params: string }[] = [];

    if (filters.fields?.includes('notifications')) {
      notifications = await this.domainService.innovations.getUnreadNotifications(user.id, dbActions[0].map(action => action.id));
    }

    return {
      count: dbActions[1],
      data: dbActions[0].map(action => ({
        id: action.id,
        displayId: action.displayId,
        description: action.description,
        innovation: { id: action.innovationSection.innovation.id, name: action.innovationSection.innovation.name },
        status: action.status,
        section: action.innovationSection.section,
        createdAt: action.createdAt,
        updatedAt: action.updatedAt,
        ...(!filters.fields?.includes('notifications') ? {} : {
          notifications: notifications.filter(item => item.contextId === action.id).length
        })
      }))
    };

  }


  async getActionInfo(actionId: string): Promise<{
    id: string,
    displayId: string,
    status: InnovationActionStatusEnum,
    section: InnovationSectionEnum,
    description: string,
    createdAt: DateISOType,
    createdBy: { id: string, name: string, organisationUnit: string },
    declineReason?: string
  }> {

    const dbAction = await this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'action')
      .innerJoinAndSelect('action.innovationSection', 'innovationSection')
      .innerJoinAndSelect('innovationSection.innovation', 'innovation')
      .innerJoinAndSelect('action.createdByUser', 'createdByUser')
      .innerJoinAndSelect('action.innovationSupport', 'innovationSupport')
      .innerJoinAndSelect('innovationSupport.organisationUnit', 'organisationUnit')
      .where('action.id = :actionId', { actionId })
      .getOne();
    if (!dbAction) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ACTION_NOT_FOUND);
    }

    let declineReason: string | null = null;
    if (dbAction.status === InnovationActionStatusEnum.DECLINED) {
      const activityLogDeclineReason = await this.sqlConnection
        .createQueryBuilder(ActivityLogEntity, 'activityLog')
        .where('activityLog.innovation_id = :innovationId', { innovationId: dbAction.innovationSection.innovation.id })
        .andWhere('activity = :activity', { activity: ActivityEnum.ACTION_STATUS_DECLINED_UPDATE })
        .andWhere('JSON_VALUE(param, \'$.actionId\') = :actionId', { actionId })
        .getOne();

      if (activityLogDeclineReason?.param) {
        const params = JSON.parse(activityLogDeclineReason.param) as ActivityLogListParamsType;
        declineReason = params.comment?.value ?? null;
      }
    }

    return {
      id: dbAction.id,
      displayId: dbAction.displayId,
      status: dbAction.status,
      description: dbAction.description,
      section: dbAction.innovationSection.section,
      createdAt: dbAction.createdAt,
      createdBy: {
        id: dbAction.createdByUser.id,
        name: (await this.identityProviderService.getUserInfo(dbAction.createdByUser.identityId)).displayName,
        organisationUnit: dbAction.innovationSupport.organisationUnit.name
      },
      ...(declineReason ? { declineReason } : {})
    };

  }


  async createAction(
    user: { id: string, identityId: string, type: UserTypeEnum },
    domainContext: DomainContextType,
    innovationId: string,
    data: { section: InnovationSectionEnum, description: string }
  ): Promise<{ id: string }> {

    const innovation = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
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
    const displayId = InnovationSectionAliasEnum[data.section] + (++actionCounter).toString().slice(-2).padStart(2, '0');

    const actionObj = InnovationActionEntity.new({
      displayId: displayId,
      description: data.description,
      status: InnovationActionStatusEnum.REQUESTED,
      innovationSection: InnovationSectionEntity.new({ id: innovationSection.id }),
      createdBy: user.id,
      updatedBy: user.id
    });

    if (innovationSupport) {
      actionObj.innovationSupport = InnovationSupportEntity.new({ id: innovationSupport.id });
    }

    // Add new action to db and log action creation to innovation's activity log
    const result = await this.sqlConnection.transaction(async transaction => {

      const actionResult = await transaction.save<InnovationActionEntity>(actionObj);

      await this.domainService.innovations.addActivityLog(
        transaction,
        { userId: user.id, innovationId: innovation.id, activity: ActivityEnum.ACTION_CREATION },
        {
          sectionId: data.section,
          actionId: actionResult.id,
          comment: { value: data.description }
        }
      );

      return { id: actionResult.id };

    });

    await this.notifierService.send(
      { id: user.id, identityId: user.identityId, type: user.type },
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
    user: { id: string, identityId: string, type: UserTypeEnum },
    domainContext: DomainContextType,
    innovationId: string,
    actionId: string,
    data: { status: InnovationActionStatusEnum }
  ): Promise<{ id: string }> {

    const dbAction = await this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'ia')
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

    if (![InnovationActionStatusEnum.IN_REVIEW, InnovationActionStatusEnum.REQUESTED].includes(dbAction.status)) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ACTION_WITH_UNPROCESSABLE_STATUS);
    }

    //Accessor can only decline actions requested by himself
    if (dbAction.status === InnovationActionStatusEnum.REQUESTED && dbAction.createdBy !== user.id) {
      throw new ForbiddenError(InnovationErrorsEnum.INNOVATION_ACTION_NOT_CREATED_BY_USER)
    }

    const result = await this.saveAction(user, domainContext, innovationId, dbAction, data);

    // Send action status update to innovation owner
    await this.notifierService.send(
      { id: user.id, identityId: user.identityId, type: user.type },
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
    user: { id: string, identityId: string, type: UserTypeEnum },
    domainContext: DomainContextType,
    innovationId: string,
    actionId: string,
    data: { status: InnovationActionStatusEnum, message: string }
  ): Promise<{ id: string }> {

    const dbAction = await this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'action')
      .innerJoinAndSelect('action.innovationSection', 'section')
      .where('action.id = :actionId', { actionId })
      .getOne();

    if (!dbAction) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ACTION_NOT_FOUND);
    }

    if (dbAction.status !== InnovationActionStatusEnum.REQUESTED) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ACTION_WITH_UNPROCESSABLE_STATUS);
    }

    const result = await this.saveAction(user, domainContext, innovationId, dbAction, data);

    await this.notifierService.send(
      { id: user.id, identityId: user.identityId, type: user.type },
      NotifierTypeEnum.ACTION_UPDATE,
      {
        innovationId: innovationId,
        action: {
          id: dbAction.id,
          section: dbAction.innovationSection.section,
          status: result.status
        },
        comment: data.message
      }
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
    user: { id: string, identityId: string, type: UserTypeEnum },
    domainContext: DomainContextType,
    innovationId: string,
    dbAction: InnovationActionEntity,
    data: { status: InnovationActionStatusEnum, message?: string }
  ): Promise<InnovationActionEntity> {

    return this.sqlConnection.transaction(async transaction => {

      let thread;

      if (data.message) {

        thread = await this.innovationThreadsService.createThreadOrMessage(
          { id: user.id, identityId: user.identityId, type: user.type },
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

        const actionCreatedBy = await this.sqlConnection.createQueryBuilder(UserEntity, 'user')
          .where('user.id = :id', { id: dbAction.createdBy })
          .getOne();

        await this.domainService.innovations.addActivityLog(
          transaction,
          { userId: user.id, innovationId, activity: ActivityEnum.ACTION_STATUS_DECLINED_UPDATE },
          {
            actionId: dbAction.id,
            interveningUserId: actionCreatedBy?.id || '',
            comment: { id: thread?.message?.id || '', value: thread?.message?.message || '' }
          });

      }

      if (data.status === InnovationActionStatusEnum.COMPLETED) {

        await this.domainService.innovations.addActivityLog(
          transaction,
          { userId: user.id, innovationId, activity: ActivityEnum.ACTION_STATUS_COMPLETED_UPDATE },
          { actionId: dbAction.id }
        );

      }

      if (data.status === InnovationActionStatusEnum.REQUESTED) {

        await this.domainService.innovations.addActivityLog(
          transaction,
          { userId: user.id, innovationId, activity: ActivityEnum.ACTION_STATUS_REQUESTED_UPDATE },
          { actionId: dbAction.id }
        );

      }

      if (data.status === InnovationActionStatusEnum.CANCELLED) {

        await this.domainService.innovations.addActivityLog(
          transaction,
          { userId: user.id, innovationId, activity: ActivityEnum.ACTION_STATUS_CANCELLED_UPDATE },
          { actionId: dbAction.id }
        );

      }

      dbAction.status = data.status;
      dbAction.updatedBy = user.id;

      return transaction.save(InnovationActionEntity, dbAction);

    });

  }

}
