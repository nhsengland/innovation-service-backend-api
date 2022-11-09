import { inject, injectable } from 'inversify';
import type { EntityManager } from 'typeorm';

import { InnovationActionEntity, InnovationEntity, InnovationSectionEntity, InnovationSupportEntity, UserEntity } from '@innovations/shared/entities';
import { AccessorOrganisationRoleEnum, ActivityEnum, InnovationActionStatusEnum, InnovationSectionAliasEnum, InnovationSectionEnum, InnovationStatusEnum, InnovationSupportStatusEnum, InnovatorOrganisationRoleEnum, NotificationContextTypeEnum, NotifierTypeEnum, ThreadContextTypeEnum, UserTypeEnum } from '@innovations/shared/enums';
import { InnovationErrorsEnum, NotFoundError, OrganisationErrorsEnum, UnprocessableEntityError } from '@innovations/shared/errors';
import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import { DomainServiceSymbol, DomainServiceType, IdentityProviderServiceSymbol, IdentityProviderServiceType, NotifierServiceSymbol, NotifierServiceType } from '@innovations/shared/services';
import type { DateISOType, DomainUserInfoType } from '@innovations/shared/types';

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
    user: { id: string, type: UserTypeEnum, organisationId?: string, organisationRole?: AccessorOrganisationRoleEnum | InnovatorOrganisationRoleEnum, organizationUnitId?: string },
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
      query.leftJoin('innovation.innovationSupports', 'accessorSupports', 'accessorSupports.organisation_unit_id = :accessorSupportsOrganisationUnitId', { accessorSupportsOrganisationUnitId: user.organizationUnitId });
      query.andWhere('innovation.status IN (:...accessorInnovationStatus)', { accessorInnovationStatus: [InnovationStatusEnum.IN_PROGRESS, InnovationStatusEnum.COMPLETE] });
      query.andWhere('shares.id = :accessorOrganisationId', { accessorOrganisationId: user.organisationId });

      if (user.organisationRole === AccessorOrganisationRoleEnum.ACCESSOR) {
        query.andWhere('accessorSupports.status IN (:...accessorSupportsSupportStatuses01)', { accessorSupportsSupportStatuses01: [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.COMPLETE] });
        // query.andWhere('accessorSupports.organisation_unit_id = :organisationUnitId ', { organisationUnitId: user.organizationUnitId });
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

    for (const [key, order] of Object.entries(pagination.order || { 'default': 'DESC' })) {
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
    createdBy: string
  }> {

    const dbAction = await this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'action')
      .leftJoinAndSelect('action.innovationSection', 'innovationSection')
      .where('action.id = :actionId', { actionId })
      .getOne();
    if (!dbAction) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ACTION_NOT_FOUND);
    }

    return {
      id: dbAction.id,
      displayId: dbAction.displayId,
      status: dbAction.status,
      description: dbAction.description,
      section: dbAction.innovationSection.section,
      createdAt: dbAction.createdAt,
      createdBy: (await this.identityProviderService.getUserInfo(dbAction.createdBy)).displayName
    };

  }


  async createInnovationAction(
    requestUser: DomainUserInfoType,
    innovationId: string,
    action: { sectionKey: InnovationSectionEnum, description: string }
  ): Promise<{ id: string }> {

    // Get innovation information.

    const innovation = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'i')
      .innerJoinAndSelect('i.owner', 'o')
      .leftJoinAndSelect('i.sections', 's')
      .leftJoinAndSelect('i.innovationSupports', 'is')
      .leftJoinAndSelect('is.organisationUnit', 'ou')
      .where('i.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    // Get section & support data
    const innovationSection = (await innovation.sections).find(sec => sec.section === action.sectionKey);
    if (!innovationSection) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SECTIONS_CONFIG_UNAVAILABLE);
    }

    const innovationSupports = await innovation.innovationSupports;

    const innovationSupport = innovationSupports.find(
      is => is.organisationUnit.id === requestUser.organisations[0]?.organisationUnits[0]!.id
    );

    let actionCounter = (await innovationSection.actions).length;
    const displayId = InnovationSectionAliasEnum[action.sectionKey] + (++actionCounter).toString().slice(-2).padStart(2, '0');

    const actionObj = InnovationActionEntity.new({
      displayId: displayId,
      description: action.description,
      status: InnovationActionStatusEnum.REQUESTED,
      innovationSection: InnovationSectionEntity.new({ id: innovationSection.id }),
      createdBy: requestUser.id,
      updatedBy: requestUser.id,
    });

    if (innovationSupport) {
      actionObj.innovationSupport = InnovationSupportEntity.new({ id: innovationSupport.id });
    }

    // Add new action to db and log action creation to innovation's activity log
    const result = await this.sqlConnection.transaction(async (transactionManager: EntityManager) => {
      const actionResult = await transactionManager.save<InnovationActionEntity>(actionObj);

      await this.domainService.innovations.addActivityLog<'ACTION_CREATION'>(
        transactionManager,
        { userId: requestUser.id, innovationId: innovation.id, activity: ActivityEnum.ACTION_CREATION },
        {
          sectionId: action.sectionKey,
          actionId: actionResult.id,
          comment: {
            value: action.description
          }
        }
      );

      return { id: actionResult.id };
    });

    // Send action requested email to innovation owner
    await this.notifierService.send<NotifierTypeEnum.ACTION_CREATION>(
      requestUser,
      NotifierTypeEnum.ACTION_CREATION,
      {
        innovationId: innovation.id,
        action: {
          id: result.id,
          section: action.sectionKey,
        },
      }
    );

    return result;
  }

  async updateInnovationAction(requestUser: DomainUserInfoType, actionId: string, innovationId: string, action: any): Promise<InnovationActionEntity | undefined> {

    if (requestUser.type === UserTypeEnum.ACCESSOR) {
      return await this.updateInnovationActionAsAccessor(requestUser, actionId, innovationId, action);
    }

    if (requestUser.type === UserTypeEnum.INNOVATOR) {
      return await this.updateInnovationActionAsInnovator(requestUser, actionId, innovationId, action);
    }

  }

  private async updateInnovationActionAsAccessor(requestUser: DomainUserInfoType, actionId: string, innovationId: string, actionData: any): Promise<InnovationActionEntity> {

    if (!requestUser.organisations || requestUser.organisations.length === 0) {
      throw new Error(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND);
    }

    if (!requestUser.organisations[0]?.organisationUnits || requestUser.organisations[0].organisationUnits.length === 0) {
      throw new Error(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    const organisationUnit = requestUser.organisations[0].organisationUnits[0];

    const innovationAction = await this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'ia')
      .innerJoinAndSelect('ia.innovationSection', 'is')
      .innerJoinAndSelect('ia.innovationSupport', 'isup')
      .innerJoinAndSelect('is.innovation', 'i')
      .innerJoinAndSelect('isup.organisationUnit', 'ou')
      .innerJoinAndSelect('ou.organisation', 'o')
      .where('ia.id = :actionId', { actionId })
      .getOne();

    if (!innovationAction || innovationAction.innovationSupport.organisationUnit.id !== organisationUnit?.id) {
      throw new Error(InnovationErrorsEnum.INNOVATION_ACTION_FORBIDDEN_ACCESS)
    }

    const result = await this.updateAction(requestUser, innovationId, innovationAction, actionData);

    // Send action status update to innovation owner
    await this.notifierService.send<NotifierTypeEnum.ACTION_UPDATE>(
      requestUser,
      NotifierTypeEnum.ACTION_UPDATE,
      {
        innovationId: innovationAction.innovationSection.innovation.id,
        action: {
          id: innovationAction.id,
          section: innovationAction.innovationSection.section,
          status: result.status
        },
      }
    );

    return result;
  }

  private async updateInnovationActionAsInnovator(requestUser: DomainUserInfoType, actionId: string, innovationId: string, actionData: any): Promise<InnovationActionEntity> {

    const innovationAction = await this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'ia')
      .innerJoinAndSelect('ia.innovationSection', 'is')
      .innerJoinAndSelect('is.innovation', 'i')
      .where('ia.id = :actionId', { actionId })
      .getOne();

    if (!innovationAction) {
      throw new Error(InnovationErrorsEnum.INNOVATION_ACTION_NOT_FOUND)
    }

    const result = await this.updateAction(requestUser, innovationId, innovationAction, actionData);

    // Send action status update to accessor
    await this.notifierService.send<NotifierTypeEnum.ACTION_UPDATE>(
      requestUser,
      NotifierTypeEnum.ACTION_UPDATE,
      {
        innovationId: innovationAction.innovationSection.innovation.id,
        action: {
          id: innovationAction.id,
          section: innovationAction.innovationSection.section,
          status: result.status
        },
      }
    );

    return result;
  }


  private async updateAction(
    requestUser: DomainUserInfoType,
    innovationId: string,
    innovationAction: InnovationActionEntity,
    actionData: { message: string; status: InnovationActionStatusEnum },
  ): Promise<InnovationActionEntity> {

    return this.sqlConnection.transaction(async (trs) => {

      let thread;
      if (actionData.message) {

        thread = await this.innovationThreadsService.createThreadOrMessage(
          requestUser,
          innovationId,
          `Action ${innovationAction.displayId} - ${innovationAction.description}`,
          actionData.message,
          innovationAction.id,
          ThreadContextTypeEnum.ACTION,
          trs,
          true,
        );

      }

      innovationAction.status = actionData.status;
      innovationAction.updatedBy = requestUser.id;

      if (actionData.status === InnovationActionStatusEnum.DECLINED) {

        const actionCreatedBy = await this.sqlConnection.createQueryBuilder(UserEntity, 'u')
          .where('u.id = :id', { id: innovationAction.createdBy })
          .getOne();

        await this.domainService.innovations.addActivityLog<ActivityEnum.ACTION_STATUS_DECLINED_UPDATE>(
          trs,
          {
            userId: requestUser.id,
            innovationId,
            activity: ActivityEnum.ACTION_STATUS_DECLINED_UPDATE
          },
          {
            actionId: innovationAction.id,
            interveningUserId: actionCreatedBy?.identityId || '',
            comment: { id: thread?.message?.id || '', value: thread?.message?.message || '' }
          })
      }

      if (actionData.status === InnovationActionStatusEnum.COMPLETED) {
        try {
          await this.domainService.innovations.addActivityLog<ActivityEnum.ACTION_STATUS_COMPLETED_UPDATE>(
            trs,
            {
              userId: requestUser.id,
              innovationId,
              activity: ActivityEnum.ACTION_STATUS_COMPLETED_UPDATE,
            },
            {
              actionId: innovationAction.id,
              comment: {
                id: thread?.message?.id || '',
                value: thread?.message?.message || '',
              }
            }
          );
        } catch (error) {
          this.logger.error(
            `An error has occured while creating activity log from ${requestUser.id}`,
            error
          );
          throw error;
        }
      }

      return trs.save(InnovationActionEntity, innovationAction);

    });

  }

}
