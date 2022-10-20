

import { InnovationEntity, InnovationSupportEntity, CommentEntity, UserEntity, OrganisationUnitEntity, OrganisationUnitUserEntity, InnovationActionEntity } from '@innovations/shared/entities';
import { InnovationSupportStatusEnum, type UserTypeEnum, ActivityEnum, InnovationSupportLogTypeEnum, InnovationActionStatusEnum, NotifierTypeEnum } from '@innovations/shared/enums';
import { NotFoundError, InnovationErrorsEnum, InternalServerError, GenericErrorsEnum, UnprocessableEntityError, OrganisationErrorsEnum } from '@innovations/shared/errors';
import { DomainServiceSymbol, NotifierServiceSymbol, NotifierServiceType, type DomainServiceType } from '@innovations/shared/services';
import type { DomainUserInfoType } from '@innovations/shared/types';
import { injectable, inject } from 'inversify';
import type { Repository } from 'typeorm';
import { BaseAppService } from './base-app.service';


@injectable()
export class InnovationSupportsService extends BaseAppService {

  innovationRepository: Repository<InnovationEntity>;
  innovationSupportRepository: Repository<InnovationSupportEntity>;

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType,
  ) {
    super();
    this.innovationRepository = this.sqlConnection.getRepository<InnovationEntity>(InnovationEntity);
    this.innovationSupportRepository = this.sqlConnection.getRepository<InnovationSupportEntity>(InnovationSupportEntity);
  }


  async getInnovationSupportsList(innovationId: string, filters: { fields?: ('engagingAccessors')[] }): Promise<{
    id: string,
    status: InnovationSupportStatusEnum,
    organisation: {
      id: string, name: string, acronym: string | null,
      unit: { id: string, name: string, acronym: string | null }
    },
    engagingAccessors?: { id: string, organisationUnitUserId: string, name: string }[] | undefined,
  }[]> {

    const query = this.innovationRepository.createQueryBuilder('innovation')
      .leftJoinAndSelect('innovation.innovationSupports', 'supports')
      .leftJoinAndSelect('supports.organisationUnit', 'organisationUnit')
      .leftJoinAndSelect('organisationUnit.organisation', 'organisation')
      .where('innovation.id = :innovationId', { innovationId });

    if (filters.fields?.includes('engagingAccessors')) {
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
    let usersInfo: {
      id: string,
      identityId: string,
      email: string,
      displayName: string,
      type: UserTypeEnum
      isActive: boolean
    }[] = [];

    if (filters.fields?.includes('engagingAccessors')) {

      const assignedAccessorsIds = innovationSupports
        .filter(support => support.status === InnovationSupportStatusEnum.ENGAGING)
        .flatMap(support => support.organisationUnitUsers.map(item => item.organisationUser.user.id));

      usersInfo = (await this.domainService.users.getUsersList({ userIds: assignedAccessorsIds }));
    }

    try {


      return innovationSupports.map(support => {

        let engagingAccessors: { id: string, organisationUnitUserId: string, name: string }[] | undefined = undefined;

        if (filters.fields?.includes('engagingAccessors')) {
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
          engagingAccessors,
        };

      });

    } catch (error) {
      throw new InternalServerError(GenericErrorsEnum.UNKNOWN_ERROR);
    }

  }


  async getInnovationSupportInfo(innovationSupportId: string): Promise<{
    id: string,
    status: InnovationSupportStatusEnum,
    engagingAccessors?: { id: string, organisationUnitUserId: string, name: string }[]
  }> {

    const query = this.innovationRepository.createQueryBuilder('innovation')
      .innerJoinAndSelect('innovation.innovationSupports', 'support')
      .innerJoinAndSelect('support.organisationUnit', 'organisationUnit')
      .innerJoinAndSelect('organisationUnit.organisation', 'organisation')
      .leftJoinAndSelect('support.organisationUnitUsers', 'organisationUnitUser')
      .leftJoinAndSelect('organisationUnitUser.organisationUser', 'organisationUser')
      .leftJoinAndSelect('organisationUser.user', 'user')
      .where('support.id = :innovationSupportId', { innovationSupportId });

    const innovation = await query.getOne();
    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const innovationSupport = innovation.innovationSupports.find(item => item.id === innovationSupportId);
    if (!innovationSupport) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND);
    }

    // Fetch users names.
    const assignedAccessorsIds = innovationSupport.organisationUnitUsers.map(item => item.organisationUser.user.id);
    const usersInfo = (await this.domainService.users.getUsersList({ userIds: assignedAccessorsIds }));

    try {

      return {
        id: innovationSupport.id,
        status: innovationSupport.status,
        engagingAccessors: innovationSupport.organisationUnitUsers.map(su => ({
          id: su.organisationUser.user.id,
          organisationUnitUserId: su.id,
          name: usersInfo.find(item => item.id === su.organisationUser.user.id && item.isActive)?.displayName || ''
        })).filter(authUser => authUser.name)
      };

    } catch (error) {
      throw new InternalServerError(GenericErrorsEnum.UNKNOWN_ERROR);
    }

  }


  async createInnovationSupport(
    requestUser: DomainUserInfoType,
    innovationId: string,
    data: { status: InnovationSupportStatusEnum, comment: string, accessors?: { id: string, organisationUnitUserId: string }[] }
  ): Promise<{ id: string }> {

    const organisationUnit = requestUser.organisations.find(_ => true)?.organisationUnits.find(_ => true);

    if (!organisationUnit) {
      new Error(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND)
    }

    const query = this.innovationSupportRepository.createQueryBuilder('support')
      .where('support.innovation.id = :innovationId ', { innovationId, })
      .andWhere('support.organisation_unit_id = :organisationUnitId', { organisationUnitId: organisationUnit!.id });
    const support = await query.getOne();
    if (support) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_ALREADY_EXISTS);
    }

    const result = await this.sqlConnection.transaction(async transaction => {

      const comment = await transaction.save(CommentEntity, CommentEntity.new({
        user: UserEntity.new({ id: requestUser.id }),
        innovation: InnovationEntity.new({ id: innovationId }),
        message: data.comment,
        createdBy: requestUser.id,
        updatedBy: requestUser.id,
        organisationUnit: OrganisationUnitEntity.new({ id: organisationUnit!.id })
      }));

      const innovationSupport = InnovationSupportEntity.new({
        status: data.status,
        createdBy: requestUser.id,
        updatedBy: requestUser.id,
        innovation: InnovationEntity.new({ id: innovationId }),
        organisationUnit: OrganisationUnitEntity.new({ id: organisationUnit!.id }),
        organisationUnitUsers: (data.accessors || []).map(item => OrganisationUnitUserEntity.new({ id: item.organisationUnitUserId }))
      });

      const savedSupport = await transaction.save(InnovationSupportEntity, innovationSupport);

      await this.domainService.innovations.addActivityLog<'SUPPORT_STATUS_UPDATE'>(
        transaction,
        { userId: requestUser.id, innovationId: innovationId, activity: ActivityEnum.SUPPORT_STATUS_UPDATE },
        {
          innovationSupportStatus: savedSupport.status,
          organisationUnit: organisationUnit!.name,
          comment: { id: comment.id, value: comment.message }
        }
      );

      // Don't really know why are we just storing support log for these 2 states.
      // Kept the existing rules for now...
      if (data.status === InnovationSupportStatusEnum.ENGAGING || data.status === InnovationSupportStatusEnum.COMPLETE) {
        await this.domainService.innovations.addSupportLog(
          transaction,
          { id: requestUser.id, organisationUnitId: organisationUnit!.id },
          { id: innovationId },
          { type: InnovationSupportLogTypeEnum.STATUS_UPDATE, description: comment.message, suggestedOrganisationUnits: [] }
        );
      }

      return { id: savedSupport.id, status: savedSupport.status };

    });

    this.notifierService.send(
      requestUser,
      NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE,
      {
        innovationId: innovationId,
        innovationSupport: {
          id: result.id,
          status: result.status,
          statusChanged: true,
          newAssignedAccessors: data.accessors || [],
        }
      }
    );

    return result;

  }


  async updateInnovationSupport(
    user: { id: string, organisationUnit: { id: string, name: string } },
    innovationId: string,
    supportId: string,
    data: { status: InnovationSupportStatusEnum, message: string, accessors?: { id: string, organisationUnitUserId: string }[] }
  ): Promise<{ id: string }> {

    const query = this.innovationSupportRepository.createQueryBuilder('support').where('support.id = :supportId ', { supportId })
    const dbSupport = await query.getOne();
    if (!dbSupport) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND);
    }

    const result = await this.sqlConnection.transaction(async transaction => {

      const comment = await transaction.save(CommentEntity, CommentEntity.new({
        user: UserEntity.new({ id: user.id }),
        innovation: InnovationEntity.new({ id: innovationId }),
        message: data.message,
        createdBy: user.id,
        updatedBy: user.id,
        organisationUnit: OrganisationUnitEntity.new({ id: user.organisationUnit.id })
      }));


      if (data.status === InnovationSupportStatusEnum.ENGAGING) {

        dbSupport.organisationUnitUsers = (data.accessors || []).map(item => OrganisationUnitUserEntity.new({ id: item.organisationUnitUserId }))

      } else { // In the case that previous support was ENGAGING, cleanup several relations!

        dbSupport.organisationUnitUsers = [];

        const openActions = (await dbSupport.actions).filter(action =>
          [
            InnovationActionStatusEnum.REQUESTED,
            InnovationActionStatusEnum.STARTED,
            InnovationActionStatusEnum.IN_REVIEW
          ].includes(action.status)
        );

        for (const action of openActions) {
          await transaction.update(InnovationActionEntity,
            { id: action.id },
            { status: InnovationActionStatusEnum.DELETED, updatedBy: user.id }
          );
        }

      }

      dbSupport.status = data.status;
      dbSupport.updatedBy = user.id;

      const savedSupport = await transaction.save(InnovationSupportEntity, dbSupport);

      await this.domainService.innovations.addActivityLog<'SUPPORT_STATUS_UPDATE'>(
        transaction,
        { userId: user.id, innovationId: innovationId, activity: ActivityEnum.SUPPORT_STATUS_UPDATE },
        {
          innovationSupportStatus: savedSupport.status,
          organisationUnit: user.organisationUnit.name,
          comment: { id: comment.id, value: comment.message }
        }
      );

      // Don't really know why are we just storing support log for these 2 states.
      // Kept the existing rules for now...
      if (data.status === InnovationSupportStatusEnum.ENGAGING || data.status === InnovationSupportStatusEnum.COMPLETE) {

        await this.domainService.innovations.addSupportLog(
          transaction,
          { id: user.id, organisationUnitId: user.organisationUnit.id },
          { id: innovationId },
          { type: InnovationSupportLogTypeEnum.STATUS_UPDATE, description: comment.message, suggestedOrganisationUnits: [] }
        );
      }

      return { id: savedSupport.id };

      // TODO: All code below is regarding notifications!
      // Review when they are implemented
      // if (
      //   [
      //     InnovationSupportStatus.WITHDRAWN,
      //     InnovationSupportStatus.NOT_YET,
      //     InnovationSupportStatus.WAITING,
      //   ].includes(innovationSupport.status)
      // ) {
      //   try {
      //     await this.notificationService.create(
      //       requestUser,
      //       NotificationAudience.ASSESSMENT_USERS,
      //       innovationId,
      //       NotificationContextType.INNOVATION,
      //       innovationId,
      //       `The innovation with id ${innovationId} has had its support status changed to ${innovationSupport.status}`
      //     );
      //   } catch (error) {
      //     this.logService.error(
      //       `An error has occured while creating a notification of type ${NotificationContextType.INNOVATION} from ${requestUser.id}`,
      //       error
      //     );
      //   }
      // }

      // if (
      //   innovationSupport.status === InnovationSupportStatus.ENGAGING ||
      //   innovationSupport.status === InnovationSupportStatus.COMPLETE
      // ) {
      //   try {
      //     await this.notificationService.create(
      //       requestUser,
      //       NotificationAudience.ACCESSORS,
      //       innovationId,
      //       NotificationContextType.INNOVATION,
      //       innovationId,
      //       `The innovation with id ${innovationId} has had its support status changed to ${innovationSupport.status}`
      //     );
      //   } catch (error) {
      //     this.logService.error(
      //       `An error has occured while creating a notification of type ${NotificationContextType.INNOVATION} from ${requestUser.id}`,
      //       error
      //     );
      //   }

      //   try {
      //     const targetUsers = await this.organisationService.findUserFromUnitUsers(
      //       innovationSupport.organisationUnitUsers.map((u) => u.id)
      //     );

      //     await this.notificationService.sendEmail(
      //       requestUser,
      //       EmailNotificationTemplate.ACCESSORS_ASSIGNED_TO_INNOVATION,
      //       innovationId,
      //       innovationId,
      //       targetUsers
      //     );
      //   } catch (error) {
      //     this.logService.error(
      //       `An error has occured while sending an email with template ${EmailNotificationTemplate.ACCESSORS_ASSIGNED_TO_INNOVATION} from ${requestUser.id}`,
      //       error
      //     );
      //   }
      // }

      // try {
      //   const innovation = await this.innovationService.find(innovationId, {
      //     relations: ["owner"],
      //   });

      //   const owner = innovation.owner.id;
      //   await this.notificationService.sendEmail(
      //     requestUser,
      //     EmailNotificationTemplate.INNOVATORS_SUPPORT_STATUS_UPDATE,
      //     innovationId,
      //     innovationId,
      //     [owner],
      //     {
      //       organisation_name: organisationUnit.name,
      //       innovation_name: innovation.name,
      //     }
      //   );
      // } catch (error) {
      //   this.logService.error(
      //     `An error has occured while sending an email with template ${EmailNotificationTemplate.INNOVATORS_SUPPORT_STATUS_UPDATE} from ${requestUser.id}`,
      //     error
      //   );
      // }
      // const result = await transactionManager.save(
      //   InnovationSupport,
      //   innovationSupport
      // );

    });

    return result;

  }

}
