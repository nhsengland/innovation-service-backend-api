import { InnovationActionEntity, InnovationSectionEntity, InnovationSupportEntity, InnovationThreadEntity, InnovationThreadMessageEntity, NotificationEntity } from '@innovations/shared/entities';
import { InnovationActionStatusEnum, InnovationSectionStatusEnum, InnovationSupportStatusEnum } from '@innovations/shared/enums';
import { UnprocessableEntityError, OrganisationErrorsEnum } from '@innovations/shared/errors';
import type { DateISOType, DomainUserInfoType } from '@innovations/shared/types';
import { injectable } from 'inversify';
import { BaseService } from './base.service';

@injectable()
export class StatisticsService  extends BaseService {

  constructor() {
    super();
  }

  async getActions(innovationId: string, statuses: InnovationActionStatusEnum[]): Promise<InnovationActionEntity[]> {
    
    const openActions = await  this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'action')
    .innerJoinAndSelect('action.innovationSection', 'section')
    .innerJoinAndSelect('section.innovation', 'innovation')
    .where('innovation.id = :innovationId', { innovationId })
    .andWhere('action.status IN(:...statuses)', { statuses })
    .orderBy('action.createdAt', 'DESC')
    .getMany();

    return openActions;
  }

  async getSubmittedSections(innovationId: string): Promise<InnovationSectionEntity[]> {
    const sections = await this.sqlConnection.createQueryBuilder(InnovationSectionEntity, 'section')
    .innerJoinAndSelect('section.innovation', 'innovation')
    .where('innovation.id = :innovationId', { innovationId })
    .andWhere('section.status = :status', { status: InnovationSectionStatusEnum.SUBMITTED })
    .orderBy('section.updatedAt', 'DESC')
    .getMany();

    return sections;
  }

  async getUnreadMessages(innovationId: string, userId: string): Promise<{
    count: number;
    lastSubmittedAt: null | string;
  }> {

    const unreadMessages = await this.sqlConnection.createQueryBuilder(NotificationEntity, 'notification')
    .innerJoinAndSelect('notification.innovation', 'innovation')
    .innerJoinAndSelect('notification.notificationUsers', 'users')
    .where('innovation.id = :innovationId', { innovationId })
    .andWhere('notification.context_type = :context_type', { context_type: 'THREAD' })
    .andWhere('users.user_id = :userId', { userId })
    .andWhere('users.readAt IS NULL')
    .getMany();

    if (unreadMessages.length === 0) {
      return {
        count: 0,
        lastSubmittedAt: null,
      }
    }

    const unreadThreads = await this.sqlConnection.createQueryBuilder(InnovationThreadEntity, 'thread')
    .where('thread.id IN(:...ids)', { ids: unreadMessages.map(x => x.contextId) })
    .orderBy('thread.created_at', 'DESC')
    .getMany();

    const unreadThreadMessages = await this.sqlConnection.createQueryBuilder(InnovationThreadMessageEntity, 'threadMessage')
    .where('threadMessage.id IN(:...ids)', { ids: unreadMessages.map(x => x.contextId) })
    .orderBy('threadMessage.created_at', 'DESC')
    .getMany();


    const latestMessage = [...unreadThreads, ...unreadThreadMessages].sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }).find(_ => true);

    return {
      count: unreadMessages.length,
      lastSubmittedAt: latestMessage?.createdAt || null,
    }
  }

  async actionsToReview(
    innovationId: string,
    requestUser: DomainUserInfoType,
  ): Promise<{count: number, total: number, lastSubmittedAt: null | DateISOType}> {

    const organisationUnit = requestUser.organisations.find(_ => true)?.organisationUnits.find(_ => true)?.id;

    if (!organisationUnit) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    const baseQuery = this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'actions')
    .innerJoinAndSelect('actions.innovationSupport', 'innovationSupport')
    .innerJoinAndSelect('innovationSupport.organisationUnitUsers', 'organisationUnitUsers')
    .innerJoinAndSelect('organisationUnitUsers.organisationUser', 'organisationUser')
    .innerJoinAndSelect('organisationUser.user', 'user')
    .where('actions.created_by = :userId', { userId: requestUser.id })
    .andWhere('innovartionSupports.innovation_id = :innovationId', { innovationId })

    const [myUnitActions, myUnitActionsCount] = await baseQuery
      .andWhere('actions.status in (:...status)', { status: [InnovationActionStatusEnum.IN_REVIEW, InnovationActionStatusEnum.REQUESTED] })
      .orderBy('actions.updated_at', 'DESC')
      .getManyAndCount();
    
    const myActionsCount = await baseQuery
      .andWhere('actions.status = :status', { status: InnovationActionStatusEnum.IN_REVIEW }).getCount();    

    return {
      count: myActionsCount,
      total: myUnitActionsCount,
      lastSubmittedAt: myUnitActions.find(_ => true)?.updatedAt || null,
    }
  }

  async getSubmittedSectionsSinceSupportStart(innovationId: string, requestUser: DomainUserInfoType): Promise<[InnovationSectionEntity[], number]> {
   
    const organisationUnit = requestUser.organisations.find(_ => true)?.organisationUnits.find(_ => true)?.id;

    if (!organisationUnit) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    const innovationSupport  = await this.sqlConnection.createQueryBuilder(InnovationSupportEntity, 'innovationSupport')
      .innerJoinAndSelect('innovationSupport.innovation', 'innovation')
      .innerJoinAndSelect('innovationSupport.organisationUnit', 'organisationUnit')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('organisationUnit.id = :organisationUnit', { organisationUnit })
      .andWhere('innovationSupport.status IN (:...status)', { status:[InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED] })
      .getOne();

    const supportStartedAt = innovationSupport?.updatedAt;
    
    const sections = await this.sqlConnection.createQueryBuilder(InnovationSectionEntity, 'section')
      .innerJoinAndSelect('section.innovation', 'innovation')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('section.status = :status', { status: InnovationSectionStatusEnum.SUBMITTED })
      .andWhere('section.updated_at >= :supportStartedAt', { supportStartedAt })
      .orderBy('section.updatedAt', 'DESC')
      .getManyAndCount();

    return sections;
  }
}