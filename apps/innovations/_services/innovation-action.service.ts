import { inject, injectable } from 'inversify';
import type { EntityManager, Repository } from 'typeorm';

import {
  DomainServiceSymbol, DomainServiceType, IdentityProviderServiceSymbol, IdentityProviderServiceType, NotifierServiceSymbol, NotifierServiceType,
} from '@innovations/shared/services';

import { BaseAppService } from './base-app.service';
import { InnovationActionEntity, InnovationEntity, UserEntity, NotificationEntity, InnovationSectionEntity, InnovationSupportEntity } from '@innovations/shared/entities';
import { type InnovationSectionCatalogueEnum, InnovationActionStatusEnum, AccessorOrganisationRoleEnum, type InnovatorOrganisationRoleEnum, InnovationSectionAliasCatalogueEnum, ActivityEnum, UserTypeEnum, NotifierTypeEnum, ThreadContextTypeEnum } from '@innovations/shared/enums';
import { NotFoundError, InnovationErrorsEnum, UnprocessableEntityError, OrganisationErrorsEnum } from '@innovations/shared/errors';
import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import type { DateISOType, DomainUserInfoType } from '@innovations/shared/types';
import { InnovationThreadsServiceSymbol, InnovationThreadsServiceType } from './interfaces';


type ActionRequestDTO = {
  sectionKey: InnovationSectionCatalogueEnum;
  description: string;
}

type ActionResponseDTO = {
  id: string;
  displayId: string;
  status: InnovationActionStatusEnum;
  section: InnovationSectionCatalogueEnum;
  description: string;
  createdAt: DateISOType;
  createdBy: string;
}

@injectable()
export class InnovationActionService extends BaseAppService {

  innovationActionRepository: Repository<InnovationActionEntity>;
  innovationRepository: Repository<InnovationEntity>;
  userRepository: Repository<UserEntity>;

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(IdentityProviderServiceSymbol) private identityProviderService: IdentityProviderServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType,
    @inject(InnovationThreadsServiceSymbol) private innovationThreadsService: InnovationThreadsServiceType,
  ) {
    super();
    this.innovationActionRepository = this.sqlConnection.getRepository<InnovationActionEntity>(InnovationActionEntity);
    this.innovationRepository = this.sqlConnection.getRepository<InnovationEntity>(InnovationEntity);
  }

  async getInnovationActionInfo(actionId: string): Promise<ActionResponseDTO> {

    const innovationAction = await this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'ia')
      .leftJoinAndSelect('ia.innovationSection', 'is')
      .where('ia.id = :actionId', { actionId: actionId })
      .getOne();

    if (!innovationAction) {
      throw new Error(InnovationErrorsEnum.INNOVATION_ACTION_NOT_FOUND);
    }

    const actionCreator = await this.identityProviderService.getUserInfo(innovationAction.createdBy);

    return {
      id: innovationAction.id,
      displayId: innovationAction.displayId,
      status: innovationAction.status,
      description: innovationAction.description,
      section: innovationAction.innovationSection.section,
      createdAt: innovationAction.createdAt,
      createdBy: actionCreator.displayName,
    };
  }

  async getInnovationActionList(
    user: {
      id: string,
      organisationId?: string,
      organisationRole?: AccessorOrganisationRoleEnum | InnovatorOrganisationRoleEnum,
      organizationUnitId?: string
    },
    filters: {
      innovationId?: string,
      innovationName?: string,
      openActions?: boolean,
      sections?: InnovationSectionCatalogueEnum[],
      status?: InnovationActionStatusEnum[]
    },
    pagination: PaginationQueryParamsType<'displayId' | 'section' | 'innovationName' | 'createdAt' | 'status'>): Promise<{ count: number; data: { id: string; displayId: string; description: string; innovation: { id: string; name: string; }; status: InnovationActionStatusEnum; section: InnovationSectionCatalogueEnum; createdAt: DateISOType; updatedAt: DateISOType; notifications: { count: number; }; }[]; }> {

    let innovationActions;

    if (filters.innovationId) {
      const innovation = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'i')
        .where('i.id = :innovationId', { innovationId: filters.innovationId })

      if (!innovation) {
        throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
      }

      innovationActions = await this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'ia')
        .leftJoinAndSelect('ia.innovationSection', 'is')
        .where('ia.innovation_id = :innovationId', { innovationId: filters.innovationId })
        .getManyAndCount();
    }

    else {
      const query = this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'innovationAction')
        .innerJoinAndSelect('innovationAction.innovationSection', 'innovationSection')
        .innerJoinAndSelect('innovationSection.innovation', 'innovation')
        .where('innovationAction.created_by = :created_by', { created_by: user.id, });

      if (user.organisationRole === AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR) {
        query
          .innerJoinAndSelect('innovation.organisationShares', 'organisationShares')
          .andWhere('organisation_id = :organisationId', {
            organisationId: user.organisationId,
          });
      }
      else {
        query
          .innerJoinAndSelect('innovation.innovationSupports', 'innovationSupports')
          .andWhere('organisation_unit_id = :organisationUnitId', {
            organisationUnitId: user.organizationUnitId,
          });
      }

      if (filters.status && filters.status.length > 0) {
        query.andWhere('innovationAction.status IN (:...statuses)', {
          statuses: filters.status,
        });

        query.andWhere('innovationAction.status != :status', {
          status: InnovationActionStatusEnum.DELETED,
        });
      }

      else if (filters.openActions) {
        query.andWhere('innovationAction.status IN (:...statuses)', {
          statuses: this.getFilterStatusList(filters.openActions),
        });
      }

      if (filters.sections && filters.sections.length > 0) {
        query.andWhere('innovationSection.section IN (:...sections)', {
          sections: filters.sections,
        });
      }

      if (filters.innovationName) {
        query.andWhere('innovation.name LIKE :name', { name: `%${filters.innovationName}%` });
      }

      // Pagination and ordering.
      query.skip(pagination.skip);
      query.take(pagination.take);

      for (const [key, order] of Object.entries(pagination.order || { 'default': 'DESC' })) {
        let field: string;
        switch (key) {
          case 'displayId': field = 'innovationAction.displayId'; break;
          case 'section': field = 'innovationSection.section'; break;
          case 'innovationName': field = 'innovation.name'; break;
          case 'createdAt': field = 'innovationAction.createdAt'; break;
          case 'status': field = 'innovationAction.status'; break;
          default:
            field = 'innovationAction.createdAt'; break;
        }
        query.addOrderBy(field, order);
      }

      innovationActions = await query.getManyAndCount();
    }

    const notifications = await this.sqlConnection.createQueryBuilder(NotificationEntity, 'n')
      .innerJoinAndSelect('n.notificationUsers', 'nu')
      .innerJoinAndSelect('nu.user', 'u')
      .where('n.context_id in (:...actions)', { actions: innovationActions[0].map((action) => action.id) })
      .andWhere('u.id = :userId', { userId: user.id })
      .andWhere('nu.is_read = :isRead', { isRead: false })
      .getMany();

    return {
      count: innovationActions[1],
      data: innovationActions[0]?.map((ia: InnovationActionEntity) => {

        const unread = notifications.filter((n) => n.contextId === ia.id).length;

        return {
          id: ia.id,
          displayId: ia.displayId,
          description: ia.description,
          innovation: {
            id: ia.innovationSection.innovation?.id,
            name: ia.innovationSection.innovation?.name,
          },
          status: ia.status,
          section: ia.innovationSection.section,
          createdAt: ia.createdAt,
          updatedAt: ia.updatedAt,
          notifications: {
            count: unread,
          },
        };
      })
    };

  }

  async createInnovationAction(
    requestUser: DomainUserInfoType,
    innovationId: string,
    action: ActionRequestDTO
  ): Promise<{ id: string }> {

    // Get innovation information.

    const innovation = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'i')
      .innerJoinAndSelect('i.owner', 'o')
      .leftJoinAndSelect('i.sections', 'is')
      .leftJoinAndSelect('i.innovationSupports', 'is')
      .leftJoinAndSelect('is.organisationUnit', 'ou')
      .where('i.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new Error(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    //Get section & support data
    const innovationSection = (await innovation.sections).find(sec => sec.section === action.sectionKey);
    if (!innovationSection) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SECTIONS_CONFIG_UNAVAILABLE);
    }

    const innovationSupports = await innovation.innovationSupports;

    const innovationSupport = innovationSupports.find(
      is => is.organisationUnit.id === requestUser.organisations[0]?.organisationUnits[0]!.id
    );

    let actionCounter = (await innovationSection.actions).length;
    const displayId = InnovationSectionAliasCatalogueEnum[action.sectionKey] + (++actionCounter).toString().slice(-2).padStart(2, '0');

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

    //Add new action to db and log action creation to innovation's activity log
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

    //TODO: Create notification

    //Send action requested email to innovation owner

    this.notifierService.send(
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

    return;
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
      .innerJoinAndSelect('isup.organisationUnit', 'ou')
      .innerJoinAndSelect('ou.organisation', 'o')
      .where('ia.id = :actionId', { actionId })
      .getOne();

    if (!innovationAction || innovationAction.innovationSupport.organisationUnit.id !== organisationUnit?.id) {
      throw new Error(InnovationErrorsEnum.INNOVATION_ACTION_FORBIDDEN_ACCESS)
    }

    const result = await this.updateAction(requestUser, innovationId, innovationAction, actionData);

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

    return result;
  }

  private async updateAction(requestUser: DomainUserInfoType, innovationId: string, innovationAction: InnovationActionEntity, actionData: { message: string; status: InnovationActionStatusEnum }): Promise<InnovationActionEntity> {
    return await this.sqlConnection.transaction(async (trs) => {

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

        await this.domainService.innovations.addActivityLog<ActivityEnum.ACTION_STATUS_DECLINED_UPDATE>(trs, {
          userId: requestUser.id,
          innovationId,
          activity: ActivityEnum.ACTION_STATUS_DECLINED_UPDATE
        }, {
          actionId: innovationAction.id,
          interveningUserId: actionCreatedBy?.identityId || '',
          comment: {
            id: thread?.message?.id || '',
            value: thread?.message?.message || ''
          }
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

      return await trs.save(InnovationActionEntity, innovationAction);
    });
  }
  private getFilterStatusList(openActions: boolean): InnovationActionStatusEnum[] {
    if (openActions) {
      return [
        InnovationActionStatusEnum.IN_REVIEW,
        InnovationActionStatusEnum.REQUESTED,
        InnovationActionStatusEnum.CONTINUE,
        InnovationActionStatusEnum.STARTED,
      ];
    } else {
      return [
        InnovationActionStatusEnum.COMPLETED,
        InnovationActionStatusEnum.DECLINED,
        InnovationActionStatusEnum.DELETED,
      ];
    }
  }
}