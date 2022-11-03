import { CommentEntity, IdleSupportViewEntity, InnovationActionEntity, InnovationEntity, InnovationSupportEntity, InnovationThreadEntity, InnovationThreadMessageEntity, InnovationTransferEntity, NotificationEntity, OrganisationEntity, UserEntity } from '@notifications/shared/entities';
import { AccessorOrganisationRoleEnum, EmailNotificationPreferenceEnum, EmailNotificationTypeEnum, InnovationActionStatusEnum, InnovationStatusEnum, InnovationSupportStatusEnum, InnovationTransferStatusEnum, NotificationContextTypeEnum, OrganisationTypeEnum, UserTypeEnum } from '@notifications/shared/enums';
import { InnovationErrorsEnum, NotFoundError, OrganisationErrorsEnum, UnprocessableEntityError, UserErrorsEnum } from '@notifications/shared/errors';
import { IdentityProviderServiceSymbol, IdentityProviderServiceType } from '@notifications/shared/services';
import { inject, injectable } from 'inversify';

import { BaseService } from './base.service';

import * as _ from 'lodash';


@injectable()
export class RecipientsService extends BaseService {

  constructor(
    @inject(IdentityProviderServiceSymbol) private identityProviderService: IdentityProviderServiceType
  ) { super(); }


  /**
   * Fetch users information with notification preferences.
   */
  async usersInfo(userIds: string[]): Promise<{
    id: string, identityId: string, type: UserTypeEnum,
    emailNotificationPreferences: { type: EmailNotificationTypeEnum, preference: EmailNotificationPreferenceEnum }[]
  }[]> {

    if (userIds.length === 0) { return []; }

    const dbUsers = await this.sqlConnection.createQueryBuilder(UserEntity, 'user')
      .leftJoinAndSelect('user.notificationPreferences', 'notificationPreferences')
      .where('user.id IN (:...userIds)', { userIds })
      .andWhere('user.locked_at IS NULL')
      .getMany() || [];

    return Promise.all(
      dbUsers.map(async item => ({
        id: item.id,
        identityId: item.identityId,
        type: item.type,
        emailNotificationPreferences: (await item.notificationPreferences).map(emailPreference => ({
          type: emailPreference.notification_id,
          preference: emailPreference.preference,
        }))
      }))
    );
  }

  /**
   * Fetch user information with notification preferences.
   */
  async userInfo(userId: string): Promise<{
    id: string, identityId: string, name: string, email: string, type: UserTypeEnum, isActive: boolean,
    emailNotificationPreferences: { type: EmailNotificationTypeEnum, preference: EmailNotificationPreferenceEnum }[]
  }> {

    const dbUser = await this.sqlConnection.createQueryBuilder(UserEntity, 'user')
      .leftJoinAndSelect('user.notificationPreferences', 'notificationPreferences')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!dbUser) {
      throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
    }

    const authUser = await this.identityProviderService.getUserInfo(dbUser.identityId);

    return {
      id: dbUser.id,
      identityId: dbUser.identityId,
      email: authUser.email,
      name: authUser.displayName,
      type: dbUser.type,
      isActive: !dbUser.lockedAt,
      emailNotificationPreferences: (await dbUser.notificationPreferences).map(item => ({
        type: item.notification_id,
        preference: item.preference
      }))
    };

  }

  async usersIdentityInfo(userIds: string[]): Promise<{
    identityId: string;
    displayName: string;
    email: string;
    isActive: boolean;
  }[]> {
    try {
      const dbUsers = await this.sqlConnection.createQueryBuilder(UserEntity, 'users')
        .where(`users.id IN (:...userIds)`, { userIds })
        .andWhere(`users.locked_at IS NULL`)
        .getMany();

      const identityInfos = await this.identityProviderService.getUsersList(dbUsers.map(u => u.identityId));

      return identityInfos;
    } catch (error) {
      throw error
    }

  }

  async innovationInfoWithOwner(innovationId: string): Promise<{
    name: string,
    owner: { id: string, identityId: string, type: UserTypeEnum, emailNotificationPreferences: { type: EmailNotificationTypeEnum, preference: EmailNotificationPreferenceEnum }[] }
  }> {

    const dbInnovation = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .innerJoinAndSelect('innovation.owner', 'owner')
      .leftJoinAndSelect('owner.notificationPreferences', 'notificationPreferences')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!dbInnovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    return {
      name: dbInnovation.name,
      owner: {
        id: dbInnovation.owner.id,
        identityId: dbInnovation.owner.identityId,
        type: dbInnovation.owner.type,
        emailNotificationPreferences: (await dbInnovation.owner.notificationPreferences).map(item => ({
          type: item.notification_id,
          preference: item.preference
        }))
      }
    };

  }

  async innovationSharedOrganisationsWithUnits(innovationId: string): Promise<{
    id: string, name: string, acronym: null | string, organisationUnits: { id: string, name: string, acronym: string }[]
  }[]> {

    const dbInnovation = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .innerJoinAndSelect('innovation.organisationShares', 'organisationShares')
      .innerJoinAndSelect('organisationShares.organisationUnits', 'organisationUnits')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('organisationShares.inactivated_at IS NULL')
      .andWhere('organisationUnits.inactivated_at IS NULL')
      .getOne();

    if (!dbInnovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    return Promise.all(dbInnovation.organisationShares.map(async organisation => ({
      id: organisation.id,
      name: organisation.name,
      acronym: organisation.acronym,
      organisationUnits: (await organisation.organisationUnits).map(unit => ({ id: unit.id, name: unit.name, acronym: unit.acronym }))
    })));

  }

  async innovationAssignedUsers(data: { innovationId?: string, innovationSupportId?: string }): Promise<{
    id: string, identityId: string, type: UserTypeEnum,
    emailNotificationPreferences: { type: EmailNotificationTypeEnum, preference: EmailNotificationPreferenceEnum }[]
  }[]> {

    if (!data.innovationId && !data.innovationSupportId) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_INFO_EMPTY_INPUT);
    }

    const query = this.sqlConnection.createQueryBuilder(InnovationSupportEntity, 'support')
      .innerJoinAndSelect('support.organisationUnitUsers', 'organisationUnitUser')
      .innerJoinAndSelect('organisationUnitUser.organisationUser', 'organisationUser')
      .innerJoinAndSelect('organisationUser.user', 'user')
      .leftJoinAndSelect('user.notificationPreferences', 'notificationPreferences');

    if (data.innovationId) {
      query.where('support.innovation_id = :innovationId', { innovationId: data.innovationId });
    } else if (data.innovationSupportId) {
      query.where('support.id = :innovationSupportId', { innovationSupportId: data.innovationSupportId });
    }

    const dbInnovationSupport = await query.getOne();

    if (!dbInnovationSupport) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND);
    }

    return Promise.all(dbInnovationSupport.organisationUnitUsers.map(async item => ({
      id: item.organisationUser.user.id,
      identityId: item.organisationUser.user.identityId,
      type: item.organisationUser.user.type,
      emailNotificationPreferences: (await item.organisationUser.user.notificationPreferences).map(emailPreference => ({
        type: emailPreference.notification_id,
        preference: emailPreference.preference,
      }))
    })));

  }

  async userInnovationsWithAssignedUsers(userId: string): Promise<{ id: string, assignedUsers: { id: string, identityId: string }[] }[]> {

    const dbInnovations = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .innerJoinAndSelect('innovation.innovationSupports', 'support')
      .innerJoinAndSelect('support.organisationUnitUsers', 'organisationUnitUser')
      .innerJoinAndSelect('organisationUnitUser.organisationUser', 'organisationUser')
      .innerJoinAndSelect('organisationUser.user', 'user')
      .where('innovation.owner_id = :userId', { userId })
      .getMany() || [];

    return dbInnovations.map(innovation => ({
      id: innovation.id,
      assignedUsers: innovation.innovationSupports
        .flatMap(support => support.organisationUnitUsers.map(item => ({
          id: item.organisationUser.user.id,
          identityId: item.organisationUser.user.identityId,
          // type: item.organisationUser.user.type
        })))
    }));

  }

  async actionInfoWithOwner(actionId: string): Promise<{
    id: string, displayId: string, status: InnovationActionStatusEnum,
    owner: { id: string; identityId: string }
  }> {

    const dbAction = await this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'action')
      .select('action.id', 'actionId')
      .addSelect('action.display_id', 'actionDisplayId')
      .addSelect('action.status', 'actionStatus')
      .addSelect('user.id', 'userId')
      .addSelect('user.external_id', 'userIdentityId')
      .innerJoin(UserEntity, 'user', 'user.id = action.created_by AND user.locked_at IS NULL')
      .where(`action.id = :actionId`, { actionId })
      .getRawOne();

    if (!dbAction) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ACTION_NOT_FOUND);
    }

    return {
      id: dbAction.actionId,
      displayId: dbAction.actionDisplayId,
      status: dbAction.actionStatus,
      owner: { id: dbAction.userId, identityId: dbAction.userIdentityId },
    };

  }

  async threadInfo(threadId: string): Promise<{
    id: string, subject: string,
    author: { id: string, identityId: string, type: UserTypeEnum, emailNotificationPreferences: { type: EmailNotificationTypeEnum, preference: EmailNotificationPreferenceEnum }[] }
  }> {

    const dbThread = await this.sqlConnection.createQueryBuilder(InnovationThreadEntity, 'thread')
      .innerJoinAndSelect('thread.author', 'user')
      .leftJoinAndSelect('user.notificationPreferences', 'notificationPreferences')
      .where('thread.id = :threadId', { threadId })
      .getOne();

    if (!dbThread) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND);
    }

    return {
      id: dbThread.id,
      subject: dbThread.subject,
      author: {
        id: dbThread.author.id,
        identityId: dbThread.author.identityId,
        type: dbThread.author.type,
        emailNotificationPreferences: (await dbThread.author.notificationPreferences).map(emailPreference => ({ type: emailPreference.notification_id, preference: emailPreference.preference }))
      }
    };

  }

  /**
   * Fetch a thread intervenient users.
   * We only need to go by the thread messages because the first one, has also the thread author.
   */
  async threadIntervenientUsers(threadId: string): Promise<{
    id: string, identityId: string, type: UserTypeEnum,
    emailNotificationPreferences: { type: EmailNotificationTypeEnum, preference: EmailNotificationPreferenceEnum }[]
  }[]> {

    const dbThreadUsers = await this.sqlConnection.createQueryBuilder(UserEntity, 'user')
      .leftJoinAndSelect('user.notificationPreferences', 'notificationPreferences')
      .innerJoin(subQuery => subQuery
        .select('subQ_User.id', 'id')
        .from(InnovationThreadMessageEntity, 'subQ_TMessage')
        .innerJoin(UserEntity, 'subQ_User', 'subQ_User.id = subQ_TMessage.author_id AND subQ_User.locked_at IS NULL')
        .andWhere('subQ_TMessage.innovation_thread_id = :threadId', { threadId })
        .groupBy('subQ_User.id')
        , 'threadMessageUsers', 'threadMessageUsers.id = user.id')
      .getMany() || [];

    return Promise.all(dbThreadUsers.map(async item => ({
      id: item.id,
      identityId: item.identityId,
      type: item.type,
      emailNotificationPreferences: (await item.notificationPreferences).map(emailPreference => ({ type: emailPreference.notification_id, preference: emailPreference.preference }))
    })));

  }

  // TODO: Deprecated!
  async commentIntervenientUsers(commentId: string): Promise<{
    id: string, identityId: string, type: UserTypeEnum,
    emailNotificationPreferences: { type: EmailNotificationTypeEnum, preference: EmailNotificationPreferenceEnum, }[]
  }[]> {

    const dbCommentUsers = await this.sqlConnection.createQueryBuilder(UserEntity, 'user')
      .leftJoinAndSelect('user.notificationPreferences', 'notificationPreferences')
      .innerJoin(subQuery => subQuery
        .select('subQ_User.id', 'id')
        .from(CommentEntity, 'subQ_Comment')
        .innerJoin(UserEntity, 'subQ_User', 'subQ_User.id = subQ_Comment.created_by AND subQ_User.locked_at IS NULL')
        .andWhere('subQ_Comment.id = :commentId OR subQ_Comment.reply_to_id = :replyTo', { commentId, replyTo: commentId })
        .groupBy('subQ_User.id')
        , 'commentUsers', 'commentUsers.id = user.id')
      .getMany() || [];

    return Promise.all(dbCommentUsers.map(async item => ({
      id: item.id,
      identityId: item.identityId,
      type: item.type,
      emailNotificationPreferences: (await item.notificationPreferences).map(emailPreference => ({ type: emailPreference.notification_id, preference: emailPreference.preference }))
    })));

  }

  async innovationTransferInfoWithOwner(transferId: string): Promise<{ id: string, email: string, status: InnovationTransferStatusEnum, owner: { id: string; identityId: string } }> {

    const dbTransfer = await this.sqlConnection.createQueryBuilder(InnovationTransferEntity, 'innovationTransfer')
      .select('innovationTransfer.id', 'id')
      .addSelect('innovationTransfer.email', 'email')
      .addSelect('innovationTransfer.status', 'status')
      .addSelect('user.id', 'userId')
      .addSelect('user.external_id', 'userIdentityId')
      .innerJoin(UserEntity, 'user', 'user.id = innovationTransfer.created_by AND user.locked_at IS NULL')
      .where('innovationTransfer.id = :transferId', { transferId })
      .getRawOne();

    if (!dbTransfer) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_TRANSFER_NOT_FOUND);
    }

    return {
      id: dbTransfer.id,
      email: dbTransfer.email,
      status: dbTransfer.status,
      owner: { id: dbTransfer.userId, identityId: dbTransfer.userIdentityId }
    };

  }

  async needsAssessmentUsers(): Promise<{ id: string, identityId: string }[]> {

    const dbUsers = await this.sqlConnection.createQueryBuilder(UserEntity, 'users')
      .where('users.type = :type', { type: UserTypeEnum.ASSESSMENT })
      .andWhere('users.locked_at IS NULL')
      .getMany() || [];

    return dbUsers.map(user => ({ id: user.id, identityId: user.identityId }));

  }

  async organisationUnitInfo(organisationUnitId: string): Promise<{
    organisation: { id: string, name: string, acronym: null | string },
    organisationUnit: { id: string, name: string, acronym: string }
  }> {

    const dbOrganisation = await this.sqlConnection.createQueryBuilder(OrganisationEntity, 'organisation')
      .innerJoinAndSelect('organisation.organisationUnits', 'organisationUnits')
      .where('organisation.type = :type', { type: OrganisationTypeEnum.ACCESSOR })
      .andWhere('organisationUnits.id = :organisationUnitId', { organisationUnitId })
      .getOne();

    if (!dbOrganisation) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    return {
      organisation: { id: dbOrganisation.id, name: dbOrganisation.name, acronym: dbOrganisation.acronym },
      organisationUnit: (await dbOrganisation.organisationUnits).map(item => ({ id: item.id, name: item.name, acronym: item.acronym }))[0] ?? { id: '', name: '', acronym: '' }
    };

  }

  async organisationUnitsQualifyingAccessors(organisationUnitIds: string[]): Promise<{ id: string; identityId: string }[]> {

    if (organisationUnitIds.length === 0) { return []; }

    const dbUsers = await this.sqlConnection.createQueryBuilder(UserEntity, 'user')
      .innerJoin('user.userOrganisations', 'userOrganisations')
      .innerJoin('userOrganisations.userOrganisationUnits', 'userOrganisationUnits')
      .innerJoin('userOrganisationUnits.organisationUnit', 'organisationUnit')
      .innerJoin('organisationUnit.organisation', 'organisation')
      .where('userOrganisationUnits.organisation_unit_id IN (:...organisationUnitIds)', { organisationUnitIds })
      .andWhere('userOrganisations.role = :role', { role: AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR })
      .andWhere('organisation.inactivated_at IS NULL')
      .andWhere('organisationUnit.inactivated_at IS NULL')
      .andWhere('user.locked_at IS NULL')
      .getMany() || [];

    return dbUsers.map(item => ({ id: item.id, identityId: item.identityId }));

  }

  /**
   * Fetch daily digest users, this means users with notification preferences DAILY group by notification type (Actions, comments or support).
   */
  async dailyDigestUsersWithCounts(): Promise<{ id: string, identityId: string, type: UserTypeEnum, actionsCount: number, messagesCount: number, supportsCount: number }[]> {

    // Start date to yesterday at midnight.
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);

    // End date to today at midnight.
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);

    const dbUsers: { userId: string, userIdentityId: string, userType: UserTypeEnum, actionsCount: number, messagesCount: number, supportsCount: number }[] =
      await this.sqlConnection.createQueryBuilder(NotificationEntity, 'notification')
        .select('user.id', 'userId')
        .addSelect('user.external_id', 'userIdentityId')
        .addSelect('user.type', 'userType')
        .addSelect(`COUNT(CASE WHEN notification.context_type = '${NotificationContextTypeEnum.ACTION}' then 1 else null end)`, 'actionsCount')
        .addSelect(`COUNT(CASE WHEN notification.context_type = '${NotificationContextTypeEnum.THREAD}' then 1 else null end)`, 'messagesCount')
        .addSelect(`COUNT(CASE WHEN notification.context_type = '${NotificationContextTypeEnum.SUPPORT}' then 1 else null end)`, 'supportsCount')
        .innerJoin('notification.notificationUsers', 'notificationUsers')
        .innerJoin('notificationUsers.user', 'user')
        .innerJoin('user.notificationPreferences', 'notificationPreferences')
        .where('notification.created_at >= :startDate AND notification.created_at < :endDate', { startDate: startDate.toISOString(), endDate: endDate.toISOString() })
        .andWhere('notificationPreferences.preference = :preference', { preference: EmailNotificationPreferenceEnum.DAILY })
        .andWhere('user.locked_at IS NULL')
        .groupBy('user.id')
        .addGroupBy('user.external_id')
        .addGroupBy('user.type')
        .getRawMany() || [];

    return dbUsers
      .filter(item => item.actionsCount + item.messagesCount + item.supportsCount > 0)
      .map(item => ({
        id: item.userId,
        identityId: item.userIdentityId,
        type: item.userType,
        actionsCount: item.actionsCount,
        messagesCount: item.messagesCount,
        supportsCount: item.supportsCount,
      }));

  }

  async incompleteInnovationRecordOwners(): Promise<{ id: string; identityId: string; innovationId: string; innovationName: string; }[]> {

    const dbInnovations = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovations')
      .innerJoinAndSelect('innovations.owner', 'owner')
      .where(`innovations.status = '${InnovationStatusEnum.CREATED}'`)
      .andWhere('DATEDIFF(DAY, innovations.created_at, DATEADD(DAY, -1, GETDATE())) != 0')
      .andWhere('DATEDIFF(DAY, innovations.created_at, DATEADD(DAY, -1, GETDATE())) % 30 = 0')
      .getRawMany() || [];

    return dbInnovations.map(innovation => ({
      id: innovation.owner.id,
      identityId: innovation.owner.identityId,
      innovationId: innovation.id,
      innovationName: innovation.name
    }));

  }


  /**
   * @description Looks for Innovations actively supported by organisation units (ENGAGING, FURTHER INFO) whose assigned accessors have not interacted with the innovations for a given amount of time.
   * @description Inactivity is measured by:
   * @description - The last time an Innovation Support was updated (change the status from A to B) AND;
   * @description - The last time an Innovation Action was completed by an Innovator (Changed its status from REQUESTED to IN_REVIEW) OR no Innovation Actions are found AND;
   * @description - The last message posted on a thread or a thread was created (which also creates a message, so checking thread messages is enough) OR no messages or threads are found.
   * @param idlePeriod How many days are considered to be idle
   * @returns Promise<{userId: string; identityId: string, latestInteractionDate: Date}[]>
   */
  async idleOrganisationUnitsPerInnovation(idlePeriod = 90): Promise<{ userId: string; identityId: string, latestInteractionDate: Date }[]> {

    const latestSupportQuery = this.sqlConnection.createQueryBuilder(InnovationEntity, 'i')
      .select('u.id', 'unitId')
      .addSelect('i.id', 'innovationId')
      .addSelect('MAX(s.id)', 'supportId')
      .addSelect('MAX(s.updated_at)', 'latest')
      .innerJoinAndSelect('i.innovationSupports', 's')
      .innerJoinAndSelect('s.organisationUnit', 'u')
      .groupBy('u.id')
      .addGroupBy('i.id')

    const latestActionQuery = this.sqlConnection.createQueryBuilder(InnovationEntity, 'i')
      .select('u.id', 'unitId')
      .addSelect('i.id', 'innovationId')
      .addSelect('MAX(s.id)', 'supportId')
      .addSelect('MAX(actions.updated_at)', 'latest')
      .innerJoin('i.innovationSupports', 's')
      .innerJoin('s.organisationUnit', 'u')
      .leftJoin('s.action', 'actions')
      .where(`actions.status = '${InnovationActionStatusEnum.IN_REVIEW}'`)
      .groupBy('u.id')
      .addGroupBy('i.id')


    const latestMessageQuery = this.sqlConnection.createQueryBuilder(InnovationEntity, 'i')
      .select('u.id', 'unitId')
      .addSelect('i.id', 'innovationId')
      .addSelect('MAX(s.id)', 'supportId')
      .addSelect('MAX(s.updated_at)', 'latest')
      .innerJoin('i.innovationSupports', 's')
      .innerJoin('s.organisationUnit', 'u')
      .innerJoin(InnovationThreadEntity, 'threads', 'threads.innovation_id = i.id')
      .innerJoin(InnovationThreadMessageEntity, 'messages', 'threads.id = messages.innovation_thread_id')
      .groupBy('u.id')
      .addGroupBy('i.id')


    const mainQuery =
      this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovations')

        .select('users.id', 'userId')
        .addSelect('users.external_id', 'identityId')

        /**
         * maxSupports 01/01/2022 10:00:00
         * maxActions 02/01/2022 09:00:00
         * maxMessages 02/01/2022 09:01:00
         * 
         * latestInteractionDate = maxMessages = 02/01/2022 09:01:00
        */
        .addSelect('(SELECT MAX(v) FROM (VALUES (MAX(L.latest)), (MAX(l2.latest)), (MAX(l3.latest))) as value(v))', 'latestInteractionDate')

        .innerJoin('innovations.innovationSupports', 'supports')
        .innerJoin('supports.organisationUnitUsers', 'unitUsers')
        .innerJoin('unitUsers.organisationUser', 'organisationUsers')
        .innerJoin('organisationUsers.user', 'users')
        .innerJoin(
          _ => latestSupportQuery,
          'maxSupports',
          'maxSupports.innovationId = innovations.id and maxSupports.supportId = supports.id'
        )
        .leftJoin(
          _ => latestActionQuery,
          'maxActions',
          'maxActions.innovationId = innovations.id and maxActions.supportId = supports.id'
        )
        .leftJoin(
          _ => latestMessageQuery,
          'maxMessages',
          'maxMessages.innovationId = innovations.id and maxMessages.supportId = supports.id'
        )
        .where(`supports.status in ('${InnovationSupportStatusEnum.ENGAGING}','${InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED}')`)
        .andWhere(`DATEDIFF(day, maxSupports.latest, GETDATE()) >= ${idlePeriod}`)
        .andWhere(`(DATEDIFF(day, maxActions.latest, GETDATE()) >= ${idlePeriod} OR maxActions IS NULL)`)
        .andWhere(`(DATEDIFF(day, maxMessages.latest, GETDATE()) >= ${idlePeriod} OR maxMessages IS NULL)`)
        .groupBy('users.id')
        .addGroupBy('users.external_id')

    const result = await mainQuery.getRawMany<{ userId: string, identityId: string; latestInteractionDate: Date }>();

    return result;

  }

  async idleSupportsByInnovation() : Promise<{
    innovationId: string;
    values: {
        identityId: string;
        innovationId: string;
        ownerId: string;
        ownerIdentityId: string;
        unitId: string;
        unitName: string;
        innovationName: string;
    }[];
  }[]>{
    try {

      const idleSupports = await this.sqlConnection.manager.find(IdleSupportViewEntity);

      return _.reduce(_.groupBy(idleSupports, 'innovationId'), (res: { innovationId: string; values: { identityId: string, innovationId: string, ownerId: string; ownerIdentityId: string; unitId: string, unitName: string, innovationName: string }[] }[], val, key) => {
        res.push({
          innovationId: key,
          values: val.map(v => ({
            identityId: v.identityId,
            innovationName: v.innovationName,
            innovationId: v.innovationId,
            ownerId: v.ownerId,
            ownerIdentityId: v.ownerIdentityId,
            unitId: v.organisationUnitId,
            unitName: v.organisationUnitName,
          }))
        });
        return res;
      }, []);

    } catch (error) {
      throw error;
    }
  }

  // private mapIdleSupports(idleSupports: IdleSupportViewEntity[]) {
  //   const groupedByInnovation = _.reduce(
  //     _.groupBy(idleSupports, 'innovationId'),
  //     (result: any, value, key) => {
  //       result[key] = _.groupBy(value, 'organisationUnitId');
  //       return result;
  //     }, {});

  //   return groupedByInnovation;
  // }
}
