import { inject, injectable } from 'inversify';
import { EntityManager, In } from 'typeorm';

import { InnovationActionEntity, InnovationEntity, InnovationSupportEntity, InnovationSupportLogEntity, OrganisationUnitEntity, OrganisationUnitUserEntity } from '@innovations/shared/entities';
import { ActivityEnum, InnovationActionStatusEnum, InnovationSupportLogTypeEnum, InnovationSupportStatusEnum, NotifierTypeEnum, ThreadContextTypeEnum } from '@innovations/shared/enums';
import { InnovationErrorsEnum, NotFoundError, OrganisationErrorsEnum, UnprocessableEntityError } from '@innovations/shared/errors';
import { DomainServiceSymbol, NotifierServiceSymbol, NotifierServiceType, type DomainServiceType } from '@innovations/shared/services';
import type { DomainContextType, DomainUserInfoType } from '@innovations/shared/types';

import { InnovationThreadSubjectEnum } from '../_enums/innovation.enums';
import type { InnovationSupportsLogType } from '../_types/innovation.types';

import { BaseService } from './base.service';
import { InnovationThreadsServiceSymbol, InnovationThreadsServiceType } from './interfaces';


@injectable()
export class InnovationSupportsService extends BaseService {

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType,
    @inject(InnovationThreadsServiceSymbol) private innovationThreadsService: InnovationThreadsServiceType,
  ) { super(); }


  async getInnovationSupportsList(
    innovationId: string,
    filters: { fields: ('engagingAccessors')[] },
    entityManager?: EntityManager
  ): Promise<{
    id: string,
    status: InnovationSupportStatusEnum,
    organisation: {
      id: string, name: string, acronym: string | null,
      unit: { id: string, name: string, acronym: string | null }
    },
    engagingAccessors?: { id: string, organisationUnitUserId: string, name: string }[]
  }[]> {

    const connection = entityManager ?? this.sqlConnection.manager;

    const query = connection.createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.innovationSupports', 'supports')
      .leftJoinAndSelect('supports.organisationUnit', 'organisationUnit')
      .leftJoinAndSelect('organisationUnit.organisation', 'organisation')
      .where('innovation.id = :innovationId', { innovationId });

    if (filters.fields.includes('engagingAccessors')) {
      query.leftJoinAndSelect('supports.organisationUnitUsers', 'organisationUnitUser');
      query.leftJoinAndSelect('organisationUnitUser.organisationUser', 'organisationUser');
      query.leftJoinAndSelect('organisationUser.user', 'user');
    }

    const innovation = await query.getOne();
    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const innovationSupports = innovation.innovationSupports;

    // Fetch users names.
    let usersInfo: { id: string, identityId: string, email: string, displayName: string, isActive: boolean }[] = [];

    if (filters.fields.includes('engagingAccessors')) {

      const assignedAccessorsIds = innovationSupports
        .filter(support => support.status === InnovationSupportStatusEnum.ENGAGING)
        .flatMap(support => support.organisationUnitUsers.map(item => item.organisationUser.user.id));

      usersInfo = (await this.domainService.users.getUsersList({ userIds: assignedAccessorsIds }));

    }

    return innovationSupports.map(support => {

      let engagingAccessors: { id: string, organisationUnitUserId: string, name: string }[] | undefined = undefined;

      if (filters.fields.includes('engagingAccessors')) {
        engagingAccessors = support.organisationUnitUsers.map(su => ({
          id: su.organisationUser.user.id,
          organisationUnitUserId: su.id,
          name: usersInfo.find(item => item.id === su.organisationUser.user.id && item.isActive)?.displayName || ''
        })).filter(authUser => authUser.name);
      }

      return {
        id: support.id,
        status: support.status,
        organisation: {
          id: support.organisationUnit.organisation.id,
          name: support.organisationUnit.organisation.name,
          acronym: support.organisationUnit.organisation.acronym,
          unit: {
            id: support.organisationUnit.id,
            name: support.organisationUnit.name,
            acronym: support.organisationUnit.acronym,
          }
        },
        ...(engagingAccessors === undefined ? {} : { engagingAccessors })
      };

    });
  }

  async getInnovationSupportLogs(
    innovationId: string,
  ): Promise<InnovationSupportsLogType[]> {

    const query = this.sqlConnection
      .createQueryBuilder(InnovationSupportLogEntity, 'supports')
      .leftJoinAndSelect('supports.innovation', 'innovation')
      .leftJoinAndSelect('supports.organisationUnit', 'organisationUnit')
      .leftJoinAndSelect('organisationUnit.organisation', 'organisation')
      .leftJoinAndSelect('supports.suggestedOrganisationUnits', 'suggestedOrganisationUnits')
      .leftJoinAndSelect('suggestedOrganisationUnits.organisation', 'suggestedOrganisation')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('suggestedOrganisation.inactivated_at IS NULL')
      .orderBy('supports.createdAt', 'ASC');

    const supportLogs = await query.getMany();

    const usersIds = supportLogs.map(item => item.createdBy);
    const usersInfo = (await this.domainService.users.getUsersList({ userIds: [...usersIds] }));
    const userNames: { [key: string]: string } = usersInfo.reduce((map: { [key: string]: string }, obj) => {
      map[obj.id] = obj.displayName;
      return map;
    }, {});

    const response: InnovationSupportsLogType[] = supportLogs.map((log) => {
      const rec: InnovationSupportsLogType = {
        id: log.id,
        type: log.type,
        description: log.description,
        innovationSupportStatus: log.innovationSupportStatus,
        createdBy: userNames[log.createdBy] ?? '',
        createdAt: log.createdAt,
        organisationUnit: log.organisationUnit ? {
          id: log.organisationUnit.id,
          name: log.organisationUnit.name,
          acronym: log.organisationUnit.acronym,
          organisation: {
            id: log.organisationUnit.organisation.id,
            name: log.organisationUnit.organisation.name,
            acronym: log.organisationUnit.organisation.acronym,
          },
        } : null,
      };

      if (
        log.suggestedOrganisationUnits &&
        log.suggestedOrganisationUnits.length > 0
      ) {
        rec.suggestedOrganisationUnits = log.suggestedOrganisationUnits.map((orgUnit: OrganisationUnitEntity) => ({
          id: orgUnit.id,
          name: orgUnit.name,
          acronym: orgUnit.acronym,
          organisation: {
            id: orgUnit.organisation.id,
            name: orgUnit.organisation.name,
            acronym: orgUnit.organisation.acronym,
          },
        })
        );
      }

      return rec;
    });

    return response;
  }


  async getInnovationSupportInfo(
    innovationSupportId: string,
    entityManager?: EntityManager
  ): Promise<{
    id: string,
    status: InnovationSupportStatusEnum,
    engagingAccessors: { id: string, organisationUnitUserId: string, name: string }[]
  }> {

    const connection = entityManager ?? this.sqlConnection.manager;
    
    const innovationSupport = await connection.createQueryBuilder(InnovationSupportEntity, 'support')
      .innerJoinAndSelect('support.innovation', 'innovation')
      .innerJoinAndSelect('support.organisationUnit', 'orgUnit')
      .innerJoinAndSelect('orgUnit.organisation', 'org')
      .leftJoinAndSelect('support.organisationUnitUsers', 'orgUnitUser')
      .leftJoinAndSelect('orgUnitUser.organisationUser', 'orgUser')
      .leftJoinAndSelect('orgUser.user', 'user')
      .where('support.id = :innovationSupportId', { innovationSupportId })
      .getOne(); 

    if (!innovationSupport) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND);
    }

    // Fetch users names.

    const assignedAccessorsIds = innovationSupport.organisationUnitUsers.map(item => item.organisationUser.user.id);
    const usersInfo = (await this.domainService.users.getUsersList({ userIds: assignedAccessorsIds }));

    return {
      id: innovationSupport.id,
      status: innovationSupport.status,
      engagingAccessors: innovationSupport.organisationUnitUsers.map(su => ({
        id: su.organisationUser.user.id,
        organisationUnitUserId: su.id,
        name: usersInfo.find(item => item.id === su.organisationUser.user.id && item.isActive)?.displayName || ''
      })).filter(authUser => authUser.name)
    };

  }


  async createInnovationSupport(
    user: { id: string, identityId: string },
    domainContext: DomainContextType,
    innovationId: string,
    data: { status: InnovationSupportStatusEnum, message: string, accessors?: { id: string, organisationUnitUserId: string }[] },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {

    const connection = entityManager ?? this.sqlConnection.manager;

    const organisationUnitId = domainContext.organisation?.organisationUnit?.id || '';

    if (!organisationUnitId) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_WITH_UNPROCESSABLE_ORGANISATION_UNIT);
    }

    const organisationUnit = await connection.createQueryBuilder(OrganisationUnitEntity, 'unit')
      .where('unit.id = :organisationUnitId', { organisationUnitId })
      .getOne();

    if (!organisationUnit) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    const support = await connection.createQueryBuilder(InnovationSupportEntity, 'support')
      .where('support.innovation.id = :innovationId ', { innovationId, })
      .andWhere('support.organisation_unit_id = :organisationUnitId', { organisationUnitId })
      .getOne();
    if (support) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_ALREADY_EXISTS);
    }

    const result = await connection.transaction(async transaction => {

      const newSupport = InnovationSupportEntity.new({
        status: data.status,
        createdBy: user.id,
        updatedBy: user.id,
        innovation: InnovationEntity.new({ id: innovationId }),
        organisationUnit: OrganisationUnitEntity.new({ id: organisationUnit.id }),
        organisationUnitUsers: (data.accessors || []).map(item => OrganisationUnitUserEntity.new({ id: item.organisationUnitUserId }))
      });

      const savedSupport = await transaction.save(InnovationSupportEntity, newSupport);


      const thread = await this.innovationThreadsService.createThreadOrMessage(
        { id: user.id, identityId: user.identityId },
        domainContext,
        innovationId,
        InnovationThreadSubjectEnum.INNOVATION_SUPPORT_UPDATE,
        data.message,
        savedSupport.id,
        ThreadContextTypeEnum.SUPPORT,
        transaction,
        true,
      );

      await this.domainService.innovations.addActivityLog(
        transaction,
        { userId: user.id, innovationId: innovationId, activity: ActivityEnum.SUPPORT_STATUS_UPDATE, domainContext },
        {
          innovationSupportStatus: savedSupport.status,
          organisationUnit: organisationUnit.name,
          comment: { id: thread.message?.id ?? '', value: thread.message?.message ?? '' }
        }
      );

      await this.domainService.innovations.addSupportLog(
        transaction,
        { id: user.id, organisationUnitId: organisationUnitId },
        { id: innovationId },
        savedSupport.status,
        { type: InnovationSupportLogTypeEnum.STATUS_UPDATE, description: thread.message?.message ?? '', suggestedOrganisationUnits: [] }
      );

      return { id: savedSupport.id };

    });

    await this.notifierService.send(
      user,
      NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE,
      {
        innovationId,
        innovationSupport: {
          id: result.id,
          status: data.status,
          statusChanged: true,
          message: data.message,
          newAssignedAccessors: data.status === InnovationSupportStatusEnum.ENGAGING ? (data.accessors ?? []).map(item => ({ id: item.id })) : []
        }
      },
      domainContext,
    );

    return result;

  }


  async updateInnovationSupport(
    user: { id: string, identityId: string },
    domainContext: DomainContextType,
    innovationId: string,
    supportId: string,
    data: { status: InnovationSupportStatusEnum, message: string, accessors?: { id: string, organisationUnitUserId: string }[] },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {

    const connection = entityManager ?? this.sqlConnection.manager;

    const dbSupport = await connection.createQueryBuilder(InnovationSupportEntity, 'support')
      .innerJoinAndSelect('support.organisationUnit', 'organisationUnit')
      .leftJoinAndSelect('support.organisationUnitUsers', 'organisationUnitUsers')
      .where('support.id = :supportId ', { supportId })
      .getOne();
    if (!dbSupport) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND);
    }

    const previousUsersOrganisationUnitUsersIds = new Set(dbSupport.organisationUnitUsers.map(item => item.id));
    const previousStatus = dbSupport.status;


    const result = await connection.transaction(async transaction => {

      if (data.status === InnovationSupportStatusEnum.ENGAGING) {

        dbSupport.organisationUnitUsers = (data.accessors || []).map(item => OrganisationUnitUserEntity.new({ id: item.organisationUnitUserId }));

      } else { // In the case that previous support was ENGAGING, cleanup several relations!

        dbSupport.organisationUnitUsers = [];

        // Cleanup actions if the status is not ENGAGING or FURTHER_INFO_REQUIRED
        if (data.status !== InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED) {
          await transaction.createQueryBuilder().update(InnovationActionEntity)
            .set({ status: InnovationActionStatusEnum.DELETED, updatedBy: user.id })
            .where({
              innovationSupport: dbSupport.id,
              status: In([InnovationActionStatusEnum.REQUESTED, InnovationActionStatusEnum.SUBMITTED])
            })
            .execute();
        }

      }

      dbSupport.status = data.status;
      dbSupport.updatedBy = user.id;

      const savedSupport = await transaction.save(InnovationSupportEntity, dbSupport);


      const thread = await this.innovationThreadsService.createThreadOrMessage(
        { id: user.id, identityId: user.identityId },
        domainContext,
        innovationId,
        InnovationThreadSubjectEnum.INNOVATION_SUPPORT_UPDATE,
        data.message,
        savedSupport.id,
        ThreadContextTypeEnum.SUPPORT,
        transaction,
        true,
      );

      if (!thread.message) {
        throw new Error(InnovationErrorsEnum.INNOVATION_THREAD_MESSAGE_NOT_FOUND);
      }

      await this.domainService.innovations.addActivityLog(
        transaction,
        { userId: user.id, innovationId: innovationId, activity: ActivityEnum.SUPPORT_STATUS_UPDATE, domainContext },
        {
          innovationSupportStatus: savedSupport.status,
          organisationUnit: savedSupport.organisationUnit.name,
          comment: { id: thread.message.id, value: thread.message.message }
        }
      );

      await this.domainService.innovations.addSupportLog(
        transaction,
        { id: user.id, organisationUnitId: savedSupport.organisationUnit.id },
        { id: innovationId },
        savedSupport.status,
        { type: InnovationSupportLogTypeEnum.STATUS_UPDATE, description: thread.message.message, suggestedOrganisationUnits: [] }
      );

      return { id: savedSupport.id };

    });

    await this.notifierService.send(
      user,
      NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE,
      {
        innovationId,
        innovationSupport: {
          id: result.id,
          status: data.status,
          statusChanged: previousStatus !== data.status,
          message: data.message,
          newAssignedAccessors: data.status === InnovationSupportStatusEnum.ENGAGING ?
            (data.accessors ?? [])
              .filter(item => !previousUsersOrganisationUnitUsersIds.has(item.organisationUnitUserId))
              .map(item => ({ id: item.id }))
            : []
        }
      },
      domainContext,
    );

    return result;

  }

  async changeInnovationSupportStatusRequest(requestUser: DomainUserInfoType, domainContext: DomainContextType, innovationId: string, supportId: string, status: InnovationSupportStatusEnum, requestReason: string): Promise<boolean> {
    await this.notifierService.send(
      requestUser,
      NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_CHANGE_REQUEST,
      { innovationId, supportId, proposedStatus: status, requestStatusUpdateComment: requestReason },
      domainContext,
    );

    return true;
  }
}
