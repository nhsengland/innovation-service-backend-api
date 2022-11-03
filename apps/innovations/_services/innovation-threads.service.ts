import { inject, injectable } from 'inversify';
import type { EntityManager } from 'typeorm';

import { InnovationEntity, InnovationThreadEntity, InnovationThreadMessageEntity, NotificationEntity, UserEntity } from '@innovations/shared/entities';
import { ActivityEnum, NotifierTypeEnum, ThreadContextTypeEnum, UserTypeEnum } from '@innovations/shared/enums';
import { GenericErrorsEnum, InnovationErrorsEnum, UserErrorsEnum } from '@innovations/shared/errors';
import { DomainServiceSymbol, DomainServiceType, NotifierServiceSymbol, NotifierServiceType } from '@innovations/shared/services';
import type { DateISOType, DomainUserInfoType } from '@innovations/shared/types';

import { BaseService } from './base.service';


@injectable()
export class InnovationThreadsService extends BaseService {

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType,
  ) {
    super();
  }

  async createThreadOrMessage(
    requestUser: DomainUserInfoType,
    innovationId: string,
    subject: string,
    message: string,
    contextId: string,
    contextType: ThreadContextTypeEnum,
    transaction: EntityManager,
    sendNotification: boolean
  ): Promise<{ thread: InnovationThreadEntity; message: InnovationThreadMessageEntity | undefined }> {

    const threadQuery = transaction
      .createQueryBuilder(InnovationThreadEntity, 'thread')
      .where('thread.context_id = :contextId', { contextId })
      .andWhere('thread.context_type = :contextType', { contextType });

    const thread = await threadQuery.getOne();

    if (!thread) {
      const t = await this.createThread(
        requestUser,
        innovationId,
        subject,
        message,
        sendNotification,
        contextId,
        contextType,
        transaction,
        false
      );

      const messages = await t.thread.messages;

      return {
        thread: t.thread,
        message: messages.find((_: any) => true),
      };
    }

    const result = await this.createThreadMessage(
      requestUser,
      thread.id,
      message,
      sendNotification,
      false,
      transaction
    );

    return {
      thread,
      message: result.threadMessage,
    };
  }

  async createEditableThread(
    requestUser: DomainUserInfoType,
    innovationId: string,
    subject: string,
    message: string,
    sendNotification: boolean
  ): Promise<{
    thread: InnovationThreadEntity;
    messageCount: number;
  }> {
    return this.createThread(
      requestUser,
      innovationId,
      subject,
      message,
      sendNotification,
      undefined,
      undefined,
      undefined,
      true,
    );
  }

  async createThread(
    requestUser: DomainUserInfoType,
    innovationId: string,
    subject: string,
    message: string,
    sendNotification: boolean,
    contextId?: string,
    contextType?: ThreadContextTypeEnum,
    transaction?: EntityManager,
    editableMessage = false,
  ): Promise<{
    thread: InnovationThreadEntity;
    messageCount: number;
  }> {
    this.createThreadGuard(requestUser, innovationId, message, subject);

    let result: {
      thread: InnovationThreadEntity;
      messageCount: number;
    };

    if (transaction) {
      result = await this.createThreadWithTransaction(
        requestUser,
        innovationId,
        subject,
        message,
        transaction,
        contextId,
        contextType,
        editableMessage
      );
    } else {
      result = await this.createThreadNoTransaction(
        requestUser,
        innovationId,
        subject,
        message,
        editableMessage,
        contextId,
        contextType
      );
    }

    if (sendNotification) {
      const messages = await result.thread.messages;
      const sortedMessagesAsc = messages.sort(
        (a: { createdAt: string | number | Date; }, b: { createdAt: string | number | Date; }) => {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
      );
      const firstMessage = sortedMessagesAsc.find((_: any) => true); // a thread always have at least 1 message

      await this.sendThreadCreateNotification(
        requestUser,
        firstMessage!.id,
        result.thread
      );
    }

    return result;
  }

  async createEditableMessage(
    requestUser: DomainUserInfoType,
    threadId: string,
    message: string,
    sendNotification: boolean
  ): Promise<{ threadMessage: InnovationThreadMessageEntity }> {
    return this.createThreadMessage(
      requestUser,
      threadId,
      message,
      sendNotification,
      true,
    );
  }

  async createThreadMessage(
    requestUser: DomainUserInfoType,
    threadId: string,
    message: string,
    sendNotification: boolean,
    isEditable = false,
    transaction?: EntityManager
  ): Promise<{
    threadMessage: InnovationThreadMessageEntity;
  }> {
    this.createThreadMessageGuard(requestUser, threadId, message);

    let author: UserEntity;
    if (!transaction) {
      try {
        author = await this.sqlConnection
          .createQueryBuilder(UserEntity, 'user')
          .where('user.id = :userId', { userId: requestUser.id })
          .andWhere('user.locked_at IS NULL')
          .getOneOrFail();
      } catch (error) {
        throw new Error(UserErrorsEnum.USER_SQL_NOT_FOUND);
      }
    } else {

      try {
        author = await transaction
          .createQueryBuilder(UserEntity, 'users')
          .where('users.id = :userId', { userId: requestUser.id })
          .andWhere('users.locked_at IS NULL')
          .getOneOrFail();
      } catch (error) {
        throw new Error(UserErrorsEnum.USER_SQL_NOT_FOUND);
      }
    }

    let thread: InnovationThreadEntity;
    try {

      if (!transaction) {
        thread = await this.sqlConnection
          .createQueryBuilder(InnovationThreadEntity, 'threads')
          .innerJoinAndSelect('threads.innovation', 'innovations')
          .innerJoinAndSelect('threads.author', 'users')
          .where('threads.id = :threadId', { threadId })
          .getOneOrFail();
      } else {
        thread = await transaction
          .createQueryBuilder(InnovationThreadEntity, 'threads')
          .innerJoinAndSelect('threads.innovation', 'innovations')
          .innerJoinAndSelect('threads.author', 'users')
          .where('threads.id = :threadId', { threadId })
          .getOneOrFail();
      }

    } catch (error) {
      throw new Error(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND)
    }

    const threadMessageObj = InnovationThreadMessageEntity.new({
      author,
      message,
      thread: InnovationThreadEntity.new({ id: threadId }),
      createdBy: author.id,
      isEditable,
    });

    let threadMessage: InnovationThreadMessageEntity;
    if (transaction) {
      threadMessage = await this.createThreadMessageTransaction(
        threadMessageObj,
        requestUser,
        thread,
        transaction
      );
    } else {
      threadMessage = await this.sqlConnection.transaction(async (transaction: EntityManager) => {
        return this.createThreadMessageTransaction(
          threadMessageObj,
          requestUser,
          thread,
          transaction
        );
      });
    }

    if (sendNotification) {
      await this.sendThreadMessageCreateNotification(
        requestUser,
        thread,
        threadMessage
      );
    }

    return {
      threadMessage,
    };
  }

  async getThread(
    //requestUser: DomainUserInfoType,
    threadId: string
  ): Promise<InnovationThreadEntity> {
    const thread = await this.sqlConnection.createQueryBuilder(InnovationThreadEntity, 'thread')
      .innerJoinAndSelect('thread.author', 'author')
      .innerJoinAndSelect('thread.innovation', 'messages')
      .where('thread.id = :threadId', { threadId })
      .getOne();

    if (!thread) {
      throw new Error(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND);
    }

    // await this.validationService
    //   .checkInnovation(requestUser, thread.innovation.id)
    //   .checkQualifyingAccessor()
    //   .checkAccessor()
    //   .checkInnovationOwner()
    //   .validate();

    return thread;
  }

  async updateThreadMessage(
    requestUser: DomainUserInfoType,
    messageId: string,
    payload: { message: string }
  ): Promise<{ id: string }> {

    const message = await this.sqlConnection.createQueryBuilder(InnovationThreadMessageEntity, 'message')
      .innerJoinAndSelect('message.thread', 'thread')
      .innerJoinAndSelect('thread.innovation', 'innovation')
      .innerJoinAndSelect('message.author', 'author')
      .where('message.id = :messageId', { messageId })
      .getOne();


    if (!message) {
      throw new Error(InnovationErrorsEnum.INNOVATION_THREAD_MESSAGE_NOT_FOUND);
    }


    if (message.isEditable === false) {
      throw new Error(InnovationErrorsEnum.INNOVATION_THREAD_MESSAGE_NOT_EDITABLE);
    }

    if (message.author.id !== requestUser.id) {
      throw new Error(InnovationErrorsEnum.INNOVATION_THREAD_MESSAGE_EDIT_UNAUTHORIZED);
    }

    message.message = payload.message;

    const updatedMessage =
      await this.sqlConnection.getRepository<InnovationThreadMessageEntity>(InnovationThreadMessageEntity)
        .save(message);

    return { id: updatedMessage.id };
  }

  async getThreadInfo(
    threadId: string
  ): Promise<{
    id: string;
    subject: string;
    createdAt: string;
    createdBy: {
      id: string;
      name: string;
      type: UserTypeEnum;
    };
  }> {

    let thread: InnovationThreadEntity;
    try {
      thread = await this.sqlConnection.createQueryBuilder(InnovationThreadEntity, 'thread')
        .innerJoinAndSelect('thread.author', 'author')
        .innerJoinAndSelect('thread.innovation', 'innovation')
        .where('thread.id = :threadId', { threadId })
        .getOneOrFail();
    } catch (error) {
      throw new Error(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND);
    }

    const author = await this.domainService.users.getUserInfo({
      userId: thread.author.id,
      identityId: thread.author.identityId,
    });

    return {
      id: thread.id,
      subject: thread.subject,
      createdAt: thread.createdAt,
      createdBy: {
        id: author.id,
        name: author?.displayName || 'unknown user',
        type: thread.author.type,
      },
    };
  }

  async getThreadMessageInfo(
    messageId: string
  ): Promise<{
    id: string;
    message: string;
    createdAt: string;
  }> {

    const message = await this.sqlConnection.createQueryBuilder(InnovationThreadMessageEntity, 'message')
      .where('message.id = :messageId', { messageId })
      .getOneOrFail();

    return {
      id: message.id,
      message: message.message,
      createdAt: message.createdAt,
    };
  }

  async getThreadMessagesList(
    requestUser: DomainUserInfoType,
    threadId: string,
    skip = 0,
    take = 10,
    order?: {
      createdAt?: 'ASC' | 'DESC';
    }
  ): Promise<{
    count: number;
    messages: {
      id: string;
      message: string;
      createdAt: DateISOType;
      isNew: boolean;
      isEditable: boolean;
      createdBy: {
        id: string;
        name: string;
        type: UserTypeEnum;
        organisation: { id: string; name: string; acronym: string | null } | undefined;
        organisationUnit: { id: string; name: string; acronym: string | null } | undefined;
      };
      updatedAt: DateISOType;
    }[];
  }> {
    const threadMessageQuery = this.sqlConnection
      .createQueryBuilder(InnovationThreadMessageEntity, 'messages')
      .addSelect('messages.created_at', 'createdAt')
      .leftJoinAndSelect('messages.author', 'messageAuthor')
      .leftJoinAndSelect('messages.thread', 'thread')
      .leftJoinAndSelect('thread.innovation', 'innovation')
      .leftJoinAndSelect('thread.author', 'users')
      .leftJoinAndSelect('users.userOrganisations', 'userOrgs')
      .leftJoinAndSelect('userOrgs.organisation', 'organisation')
      .leftJoinAndSelect('userOrgs.userOrganisationUnits', 'userOrgUnits')
      .leftJoinAndSelect('userOrgUnits.organisationUnit', 'orgUnit')
      .leftJoinAndSelect('messageAuthor.userOrganisations', 'messageUserOrgs')
      .leftJoinAndSelect('messageUserOrgs.user', 'messageUser') // load user relation
      .leftJoinAndSelect(
        'messageUserOrgs.userOrganisationUnits',
        'messageUserOrgUnits'
      )
      .leftJoinAndSelect('messageUserOrgs.organisation', 'messageOrganisation')
      .leftJoinAndSelect(
        'messageUserOrgUnits.organisationUnit',
        'messageOrgUnits'
      );

    threadMessageQuery.where('thread.id = :threadId', { threadId });

    const direction = order?.createdAt || 'DESC';

    threadMessageQuery.addOrderBy('createdAt', direction);

    threadMessageQuery.skip(skip);
    threadMessageQuery.take(take);

    const [messages, count] = await threadMessageQuery.getManyAndCount();

    const firstMessage = messages.find((_) => true);

    //const innovationId = firstMessage?.thread.innovation.id;

    // await this.validationService
    //   .checkInnovation(requestUser, innovationId)
    //   .checkQualifyingAccessor()
    //   .checkAccessor()
    //   .checkInnovationOwner()
    //   .validate();

    const threadAuthor = firstMessage!.thread.author.identityId; // a thread always have at least 1 message
    const threadMessagesAuthors = messages.map((tm) => tm.author.identityId);

    const authors = [...new Set([threadAuthor, ...threadMessagesAuthors])];
    // const authorsMap = await this.userService.getListOfUsers(
    //   authors,
    //   false,
    //   true
    // );

    const authorsMap = await this.domainService.users.getUsersList({
      identityIds: authors,
    });

    const messageAuthorOrgsanisationsPromises = await Promise.all(
      messages.map((tm) => tm.author.userOrganisations)
    );
    const messageAuthorOrganisations = messageAuthorOrgsanisationsPromises.flatMap(
      (maop) => maop.map((mao) => mao)
    );

    const notifications = await this.sqlConnection
      .createQueryBuilder(NotificationEntity, 'notification')
      .innerJoinAndSelect('notification.notificationUsers', 'notificationUsers')
      .innerJoinAndSelect('notificationUsers.user', 'users')
      .where('notification.context_id IN (:...contextIds)', {
        contextIds: messages.map((m) => m.id),
      })
      .andWhere('users.id = :userId', { userId: requestUser.id })
      .andWhere('notificationUsers.read_at IS NULL')
      .getMany();

    const messageResult = messages.map((tm) => {
      const organisationUser = messageAuthorOrganisations.find(
        (mao) => mao.user.id === tm.author.id
      );
      const organisationObj = organisationUser?.organisation;

      const organisationUnitObj = organisationUser?.userOrganisationUnits?.find(
        (_) => true
      )?.organisationUnit;

      const author = authorsMap.find(
        (author) => author.identityId === tm.author.identityId
      );

      let organisation;

      if (organisationObj) {
        organisation = {
          id: organisationObj.id,
          name: organisationObj.name,
          acronym: organisationObj.acronym,
        };
      }

      let organisationUnit;

      if (organisationUnitObj) {
        organisationUnit = {
          id: organisationUnitObj.id,
          name: organisationUnitObj.name,
          acronym: organisationUnitObj.acronym,
        };
      }

      return {
        id: tm.id,
        message: tm.message,
        createdAt: tm.createdAt,
        isNew: notifications.find((n) => n.contextId === tm.id) ? true : false,
        isEditable: tm.isEditable,
        createdBy: {
          id: tm.author.id,
          name: author?.displayName || 'unknown user',
          type: tm.author.type,
          organisation,
          organisationUnit,
        },
        updatedAt: tm.updatedAt,
      };
    });

    return {
      count,
      messages: messageResult,
    };
  }

  async getInnovationThreads(
    requestUser: DomainUserInfoType,
    innovationId: string,
    skip = 0,
    take = 10,
    order?: {
      subject?: 'ASC' | 'DESC';
      createdAt?: 'ASC' | 'DESC';
      messageCount?: 'ASC' | 'DESC';
    }
  ): Promise<{
    count: number,
    threads: {
      id: string,
      subject: string,
      messageCount: number,
      createdAt: DateISOType,
      isNew: boolean,
      lastMessage: {
        id: string,
        createdAt: DateISOType,
        createdBy: {
          id: string, name: string, type: UserTypeEnum
          organisationUnit: null | { id: string; name: string; acronym: string }
        }
      }
    }[]
  }> {
    const messageCountQuery = this.sqlConnection
      .createQueryBuilder()
      .addSelect('COUNT(messagesSQ.id)', 'messageCount')
      .from(InnovationThreadEntity, 'threadSQ')
      .leftJoin('threadSQ.messages', 'messagesSQ')
      .andWhere('threadSQ.id = thread.id')
      .groupBy('messagesSQ.innovation_thread_id');

    const countQuery = this.sqlConnection
      .createQueryBuilder()
      .addSelect('COUNT(threadSQ.id)', 'count')
      .from(InnovationThreadEntity, 'threadSQ')
      .where('threadSQ.innovation_id = :innovationId', { innovationId });

    const query = this.sqlConnection
      .createQueryBuilder(InnovationThreadEntity, 'thread')
      .distinct(false)
      .innerJoinAndSelect('thread.author', 'author')
      .addSelect(`(${messageCountQuery.getSql()})`, 'messageCount')
      .addSelect(`(${countQuery.getSql()})`, 'count');

    query.where('thread.innovation_id = :innovationId', { innovationId });

    if (order) {
      if (order.createdAt) {
        query.addOrderBy('thread.created_at', order.createdAt);
      } else if (order.messageCount) {
        query.addOrderBy('messageCount', order.messageCount);
      } else if (order.subject) {
        query.addOrderBy('thread.subject', order.subject);
      } else {
        query.addOrderBy('thread.created_at', 'DESC');
      }
    } else {
      query.addOrderBy('thread.created_at', 'DESC');
    }

    query.offset(skip);
    query.limit(take);

    const threads = await query.getRawMany();

    if (threads.length === 0) {
      return {
        count: 0,
        threads: [],
      };
    }

    const threadIds = threads.map((t) => t.thread_id) as string[];

    const threadMessagesQuery = this.sqlConnection
      .createQueryBuilder(InnovationThreadMessageEntity, 'messages')
      .innerJoinAndSelect('messages.author', 'author')
      .innerJoinAndSelect('messages.thread', 'thread')
      .leftJoinAndSelect('author.userOrganisations', 'userOrgs')
      .leftJoinAndSelect('userOrgs.userOrganisationUnits', 'userOrgUnits')
      .leftJoinAndSelect('userOrgUnits.organisationUnit', 'unit')
      .where('thread.id IN (:...threadIds)', { threadIds })
      .orderBy('messages.created_at', 'DESC');

    const threadMessages = await threadMessagesQuery.getMany();

    const userIds = [...new Set(threadMessages.map((tm) => tm.author.id))];
    const messageAuthors = await this.domainService.users.getUsersList({
      userIds,
    });

    const count = threads.find((_) => true)?.count || 0;

    const notificationsQuery = this.sqlConnection
      .createQueryBuilder(NotificationEntity, 'notifications')
      .innerJoinAndSelect(
        'notifications.notificationUsers',
        'notificationUsers'
      )
      .innerJoinAndSelect('notificationUsers.user', 'users')
      .where('notifications.context_id IN (:...threadIds)', { threadIds })
      .andWhere('users.id = :userId', { userId: requestUser.id })

      .andWhere('notificationUsers.read_at IS NULL');

    const notifications = await notificationsQuery.getMany();

    const result = await Promise.all(
      threads.map(async (t) => {
        const message = threadMessages.find(
          (tm) => tm.thread.id === t.thread_id
        );

        const authorDB = message?.author;
        const authorIdP = messageAuthors.find(
          (ma) => ma.id === message?.author.id
        );

        const userOrganisations = await message?.author.userOrganisations || [];

        const organisationUnit = userOrganisations
          ?.find((_) => true)
          ?.userOrganisationUnits?.find((_) => true)?.organisationUnit;

        const hasUnreadNotification = notifications.find(
          (n) => n.contextId === t.thread_id
        );

        return {
          id: t.thread_id,
          subject: t.thread_subject,
          messageCount: t.messageCount,
          createdAt: t.thread_created_at.toISOString(),
          isNew: hasUnreadNotification ? true : false,
          lastMessage: {
            id: message!.id,
            createdAt: message!.createdAt,
            createdBy: {
              id: authorDB!.id,
              name: authorIdP?.displayName || 'unknown user',
              type: authorDB!.type,
              organisationUnit: organisationUnit
                ? {
                  id: organisationUnit.id,
                  name: organisationUnit.name,
                  acronym: organisationUnit.acronym,
                }
                : null,
            },
          },
        };
      })
    );

    return {
      count,
      threads: result,
    };
  }

  /*+
    * Private methods
  */

  private async threadCreateTransaction(
    transaction: EntityManager,
    threadObj: InnovationThreadEntity,
    requestUser: DomainUserInfoType,
    innovation: InnovationEntity
  ) : Promise<InnovationThreadEntity> {
    const result = await transaction.save<InnovationThreadEntity>(threadObj);

    try {

      const messages = await result.messages;
      const messageId = messages.find((_: any) => true)!.id; // all threads have at least one message

      await this.domainService.innovations.addActivityLog<'THREAD_CREATION'>(
        transaction,
        { userId: requestUser.id, innovationId: innovation.id, activity: ActivityEnum.THREAD_CREATION },
        {
          thread: { id: result.id, subject: result.subject },
          message: { id: messageId }
        }
      );
    } catch (error) {
      this.logger.error(
        `An error has occured while creating activity log from ${requestUser.id} for the Activity ${ActivityEnum.THREAD_CREATION}`,
        error
      );
      throw error;
    }

    return result;
  }

  private async createThreadMessageTransaction(
    threadMessageObj: InnovationThreadMessageEntity,
    requestUser: DomainUserInfoType,
    thread: InnovationThreadEntity,
    transaction: EntityManager
  ) : Promise<InnovationThreadMessageEntity>{
    const result = await this.sqlConnection.getRepository<InnovationThreadMessageEntity>(InnovationThreadMessageEntity).save(
      threadMessageObj
    );

    try {
      await this.domainService.innovations.addActivityLog<'THREAD_MESSAGE_CREATION'>(
        transaction,
        { userId: requestUser.id, innovationId: thread.innovation.id, activity: ActivityEnum.THREAD_MESSAGE_CREATION },
        {
          thread: { id: thread.id, subject: thread.subject },
          message: { id: result.id },
        }
      );
    } catch (error) {
      this.logger.error(
        `An error has occured while creating activity log from ${requestUser.id} for the Activity ${ActivityEnum.THREAD_MESSAGE_CREATION}`,
        error
      );
      throw error;
    }

    return result;
  }

  private createThreadGuard(
    requestUser: DomainUserInfoType,
    innovationId: string,
    message: string,
    subject: string
  ) : void {
    if (
      !requestUser ||
      !innovationId ||
      !message ||
      message.length === 0 ||
      !subject ||
      subject.length === 0
    ) {
      throw new Error(GenericErrorsEnum.INVALID_PAYLOAD);
    }
  }

  private createThreadMessageGuard(
    requestUser: DomainUserInfoType,
    threadId: string,
    message: string
  ) : void {
    if (
      !requestUser ||
      !threadId ||
      threadId.length === 0 ||
      !message ||
      message.length === 0
    ) {
      throw new Error(GenericErrorsEnum.INVALID_PAYLOAD);
    }
  }

  private async createThreadNoTransaction(
    requestUser: DomainUserInfoType,
    innovationId: string,
    subject: string,
    message: string,
    editableMessage = false,
    contextId?: string,
    contextType?: ThreadContextTypeEnum,
  ): Promise<{
    thread: InnovationThreadEntity;
    messageCount: number;
  }> {

    const author = await this.sqlConnection.createQueryBuilder(UserEntity, 'user')
      .where('user.id = :userId', { userId: requestUser.id })
      .andWhere('locked_at IS NULL')
      .getOneOrFail();

    const innovation = await this.sqlConnection
      .createQueryBuilder(InnovationEntity, 'innovations')
      .innerJoinAndSelect('innovations.owner', 'owner')
      .where('innovations.id = :innovationId', { innovationId })
      .getOneOrFail();

    const threadObj = InnovationThreadEntity.new({
      subject,
      author,
      innovation,
      contextId,
      contextType,
      messages: Promise.resolve([InnovationThreadMessageEntity.new({
        author,
        message,
        isEditable: editableMessage,
      })]),
      createdBy: author.id,
    });

    const thread = await this.sqlConnection.transaction(async (transaction: EntityManager) => {
      return this.threadCreateTransaction(
        transaction,
        threadObj,
        requestUser,
        innovation
      );
    });

    const messages = await thread.messages;

    return {
      thread,
      messageCount: messages.length,
    };
  }

  private async createThreadWithTransaction(
    requestUser: DomainUserInfoType,
    innovationId: string,
    subject: string,
    message: string,
    transaction: EntityManager,
    contextId?: string,
    contextType?: ThreadContextTypeEnum,
    editableMessage = false,
  ): Promise<{
    thread: InnovationThreadEntity;
    messageCount: number;
  }> {

    const author = await transaction
      .createQueryBuilder(UserEntity, 'users')
      .where('users.id = :userId', { userId: requestUser.id })
      .andWhere('users.locked_at IS NULL')
      .getOneOrFail();

    const innovation = await transaction
      .createQueryBuilder(InnovationEntity, 'innovations')
      .innerJoinAndSelect('innovations.owner', 'owner')
      .where('innovations.id = :innovationId', { innovationId })
      .getOneOrFail();

    const threadObj = InnovationThreadEntity.new({
      subject,
      author,
      innovation,
      contextId,
      contextType,
      messages: [InnovationThreadMessageEntity.new({
        author,
        message,
        isEditable: editableMessage,
      })] as any,
      createdBy: author.id,
    });

    const thread = await this.threadCreateTransaction(
      transaction,
      threadObj,
      requestUser,
      innovation
    );

    const messages = await thread.messages;
    return {
      thread,
      messageCount: messages.length,
    };
  }

  private async sendThreadCreateNotification(
    requestUser: DomainUserInfoType,
    messageId: string,
    thread: InnovationThreadEntity
  ) : Promise<void> {
    await this.notifierService.send(
      { id: requestUser.id, identityId: requestUser.identityId, type: requestUser.type },
      NotifierTypeEnum.THREAD_CREATION,
      {
        threadId: thread.id,
        messageId,
        innovationId: thread.innovation.id,
      });
  }

  private async sendThreadMessageCreateNotification(
    requestUser: DomainUserInfoType,
    thread: InnovationThreadEntity,
    threadMessage: InnovationThreadMessageEntity
  ) : Promise<void> {

    await this.notifierService.send(
      { id: requestUser.id, identityId: requestUser.identityId, type: requestUser.type },
      NotifierTypeEnum.THREAD_MESSAGE_CREATION,
      {
        threadId: thread.id,
        messageId: threadMessage.id,
        innovationId: thread.innovation.id,
      });
  }
}
