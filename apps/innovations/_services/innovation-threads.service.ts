import { inject, injectable } from 'inversify';
import type { EntityManager } from 'typeorm';

import {
  InnovationEntity,
  InnovationThreadEntity,
  InnovationThreadMessageEntity,
  NotificationEntity,
  OrganisationUnitEntity,
  UserEntity,
  UserRoleEntity
} from '@innovations/shared/entities';
import {
  ActivityEnum,
  NotifierTypeEnum,
  ServiceRoleEnum,
  ThreadContextTypeEnum,
  UserStatusEnum
} from '@innovations/shared/enums';
import {
  BadRequestError,
  GenericErrorsEnum,
  InnovationErrorsEnum,
  NotFoundError,
  UserErrorsEnum
} from '@innovations/shared/errors';
import type { DomainService, IdentityProviderService, NotifierService } from '@innovations/shared/services';
import type { DomainContextType, DomainUserInfoType } from '@innovations/shared/types';

import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import { BaseService } from './base.service';

@injectable()
export class InnovationThreadsService extends BaseService {
  constructor(
    @inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService,
    @inject(SHARED_SYMBOLS.IdentityProviderService) private identityProvider: IdentityProviderService,
    @inject(SHARED_SYMBOLS.NotifierService) private notifierService: NotifierService
  ) {
    super();
  }

  async createThreadOrMessage(
    requestUser: { id: string; identityId: string },
    domainContext: DomainContextType,
    innovationId: string,
    subject: string,
    message: string,
    contextId: string,
    contextType: ThreadContextTypeEnum,
    transaction: EntityManager,
    sendNotification: boolean
  ): Promise<{
    thread: InnovationThreadEntity;
    message: InnovationThreadMessageEntity | undefined;
  }> {
    const threadQuery = transaction
      .createQueryBuilder(InnovationThreadEntity, 'thread')
      .where('thread.context_id = :contextId', { contextId })
      .andWhere('thread.context_type = :contextType', { contextType });

    const thread = await threadQuery.getOne();

    if (!thread) {
      const t = await this.createThread(
        requestUser,
        domainContext,
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
        message: messages.find((_: any) => true)
      };
    }

    const result = await this.createThreadMessage(
      requestUser,
      domainContext,
      thread.id,
      message,
      sendNotification,
      false,
      transaction
    );

    return {
      thread,
      message: result.threadMessage
    };
  }

  async createEditableThread(
    requestUser: DomainUserInfoType,
    domainContext: DomainContextType,
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
      domainContext,
      innovationId,
      subject,
      message,
      sendNotification,
      undefined,
      undefined,
      undefined,
      true
    );
  }

  async createThread(
    requestUser: { id: string; identityId: string },
    domainContext: DomainContextType,
    innovationId: string,
    subject: string,
    message: string,
    sendNotification: boolean,
    contextId?: string,
    contextType?: ThreadContextTypeEnum,
    transaction?: EntityManager,
    editableMessage = false
  ): Promise<{
    thread: InnovationThreadEntity;
    messageCount: number;
  }> {
    if (!transaction) {
      return this.sqlConnection.transaction(t =>
        this.createThread(
          requestUser,
          domainContext,
          innovationId,
          subject,
          message,
          sendNotification,
          contextId,
          contextType,
          t,
          editableMessage
        )
      );
    }

    if (innovationId.length === 0 || message.length === 0 || subject.length === 0) {
      throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD);
    }

    const result = await this.createThreadWithTransaction(
      requestUser,
      domainContext,
      innovationId,
      subject,
      message,
      transaction,
      contextId,
      contextType,
      editableMessage
    );

    if (sendNotification) {
      const messages = await result.thread.messages;
      const sortedMessagesAsc = messages.sort(
        (a: { createdAt: string | number | Date }, b: { createdAt: string | number | Date }) => {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
      );
      const firstMessage = sortedMessagesAsc.find((_: any) => true); // a thread always have at least 1 message

      if (!firstMessage) {
        throw new Error(InnovationErrorsEnum.INNOVATION_THREAD_MESSAGE_NOT_FOUND);
      }

      await this.sendThreadCreateNotification(domainContext, firstMessage.id, result.thread);
    }

    return result;
  }

  async createEditableMessage(
    requestUser: DomainUserInfoType,
    domainContext: DomainContextType,
    threadId: string,
    message: string,
    sendNotification: boolean
  ): Promise<{ threadMessage: InnovationThreadMessageEntity }> {
    return this.createThreadMessage(requestUser, domainContext, threadId, message, sendNotification, true);
  }

  async createThreadMessage(
    requestUser: { id: string; identityId: string },
    domainContext: DomainContextType,
    threadId: string,
    message: string,
    sendNotification: boolean,
    isEditable = false,
    transaction?: EntityManager
  ): Promise<{
    threadMessage: InnovationThreadMessageEntity;
  }> {
    const connection = transaction || this.sqlConnection.manager;

    if (threadId.length === 0 || message.length === 0) {
      throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD);
    }

    const author = await connection
      .createQueryBuilder(UserEntity, 'user')
      .where('user.id = :userId', { userId: requestUser.id })
      .andWhere('user.status = :userActive', { userActive: UserStatusEnum.ACTIVE })
      .getOne();

    if (!author) {
      throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
    }

    const thread = await connection
      .createQueryBuilder(InnovationThreadEntity, 'threads')
      .innerJoinAndSelect('threads.innovation', 'innovations')
      .where('threads.id = :threadId', { threadId })
      .getOne();

    if (!thread) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND);
    }

    const threadMessageObj = InnovationThreadMessageEntity.new({
      author,
      authorOrganisationUnit: domainContext.organisation?.organisationUnit?.id
        ? OrganisationUnitEntity.new({ id: domainContext.organisation.organisationUnit.id })
        : null,
      message,
      thread: InnovationThreadEntity.new({ id: threadId }),
      createdBy: author.id,
      isEditable,
      authorUserRole: UserRoleEntity.new({ id: domainContext.currentRole.id })
    });

    const threadMessage: InnovationThreadMessageEntity = await this.createThreadMessageTransaction(
      threadMessageObj,
      requestUser,
      domainContext,
      thread,
      connection
    );

    if (sendNotification) {
      await this.sendThreadMessageCreateNotification(domainContext, thread, threadMessage);
    }

    return {
      threadMessage
    };
  }

  async getThread(
    //requestUser: DomainUserInfoType,
    threadId: string
  ): Promise<InnovationThreadEntity> {
    const thread = await this.sqlConnection
      .createQueryBuilder(InnovationThreadEntity, 'thread')
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
    const message = await this.sqlConnection
      .createQueryBuilder(InnovationThreadMessageEntity, 'message')
      .innerJoinAndSelect('message.thread', 'thread')
      .innerJoinAndSelect('thread.innovation', 'innovation')
      .innerJoinAndSelect('message.author', 'author')
      .where('message.id = :messageId', { messageId })
      .andWhere('author.status = :userActive', { userActive: UserStatusEnum.ACTIVE })
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

    const updatedMessage = await this.sqlConnection
      .getRepository<InnovationThreadMessageEntity>(InnovationThreadMessageEntity)
      .save(message);

    return { id: updatedMessage.id };
  }

  async getThreadInfo(threadId: string): Promise<{
    id: string;
    subject: string;
    createdAt: Date;
    createdBy: {
      id: string;
      name: string;
    };
  }> {
    let thread: InnovationThreadEntity;

    try {
      thread = await this.sqlConnection
        .createQueryBuilder(InnovationThreadEntity, 'thread')
        .select(['thread.id', 'thread.subject', 'thread.createdAt', 'author.id', 'author.identityId', 'author.status'])
        .leftJoin('thread.author', 'author')
        .where('thread.id = :threadId', { threadId })
        .getOneOrFail();
    } catch (error) {
      throw new Error(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND);
    }

    let author: DomainUserInfoType | null = null;
    if (thread.author.status !== UserStatusEnum.DELETED) {
      author = await this.domainService.users.getUserInfo({
        userId: thread.author.id,
        identityId: thread.author.identityId
      });
    }

    return {
      id: thread.id,
      subject: thread.subject,
      createdAt: thread.createdAt,
      createdBy: {
        id: author?.id ?? '',
        name: author ? author?.displayName || 'unknown user' : '[deleted user]'
      }
    };
  }

  async getThreadMessageInfo(messageId: string): Promise<{
    id: string;
    message: string;
    createdAt: Date;
  }> {
    const message = await this.sqlConnection
      .createQueryBuilder(InnovationThreadMessageEntity, 'message')
      .where('message.id = :messageId', { messageId })
      .getOneOrFail();

    return {
      id: message.id,
      message: message.message,
      createdAt: message.createdAt
    };
  }

  async getThreadMessagesList(
    domainContext: DomainContextType,
    threadId: string,
    skip = 0,
    take = 10,
    order?: {
      createdAt?: 'ASC' | 'DESC';
    },
    entityManager?: EntityManager
  ): Promise<{
    count: number;
    messages: {
      id: string;
      message: string;
      createdAt: Date;
      isNew: boolean;
      isEditable: boolean;
      createdBy: {
        id: string;
        name: string;
        role: string;
        isOwner?: boolean;
        organisation: { id: string; name: string; acronym: string | null } | undefined;
        organisationUnit: { id: string; name: string; acronym: string | null } | undefined;
      };
      updatedAt: Date;
    }[];
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const threadMessageQuery = em
      .createQueryBuilder(InnovationThreadMessageEntity, 'messages')
      .select([
        'messages.id',
        'messages.message',
        'messages.isEditable',
        'messages.createdAt',
        'messages.updatedAt',
        'messageAuthor.id',
        'messageAuthor.identityId',
        'messageAuthor.status',
        'authorUserRole.role',
        'organisation.id',
        'organisation.acronym',
        'organisation.name',
        'organisationUnit.id',
        'organisationUnit.acronym',
        'organisationUnit.name',
        'thread.id',
        'thread.subject',
        'thread.author',
        'users.identityId',
        'users.status',
        'innovation.id',
        'owner.id'
      ])
      .leftJoin('messages.author', 'messageAuthor')
      .leftJoin('messages.authorUserRole', 'authorUserRole')
      .leftJoin('messages.authorOrganisationUnit', 'organisationUnit')
      .innerJoin('messages.thread', 'thread')
      .leftJoin('organisationUnit.organisation', 'organisation')
      .innerJoin('thread.innovation', 'innovation')
      .leftJoin('innovation.owner', 'owner')
      .leftJoin('thread.author', 'users')
      .where('thread.id = :threadId', { threadId })
      .orderBy('messages.createdAt', order?.createdAt || 'DESC')
      .skip(skip)
      .take(take);

    const [messages, count] = await threadMessageQuery.getManyAndCount();

    const threadMessagesAuthors = messages
      .filter(tm => tm.author && tm.author.status !== UserStatusEnum.DELETED)
      .map(tm => tm.author.identityId);

    let authors = [...new Set([...threadMessagesAuthors])];

    const authorsMap = await this.identityProvider.getUsersMap(authors);

    const notifications = new Set(
      (
        await this.sqlConnection
          .createQueryBuilder(NotificationEntity, 'notification')
          .select(['notification.params'])
          .innerJoin('notification.notificationUsers', 'notificationUsers')
          .where('notification.context_id IN (:...contextIds)', {
            contextIds: messages.map(m => m.thread.id)
          })
          .andWhere('notificationUsers.user_role_id = :roleId', {
            roleId: domainContext.currentRole.id
          })
          .andWhere('notificationUsers.read_at IS NULL')
          .getMany()
      )
        .filter(Boolean)
        .map(n => n.params['messageId'])
    );

    const messageResult = messages.map(tm => {
      const organisationUnit = tm.authorOrganisationUnit ?? undefined;
      const organisation = tm.authorOrganisationUnit?.organisation;

      return {
        id: tm.id,
        message: tm.message,
        createdAt: tm.createdAt,
        isNew: notifications.has(tm.id),
        isEditable: tm.isEditable,
        createdBy: {
          id: tm.author?.id,
          name:
            tm.author && tm.author.status !== UserStatusEnum.DELETED
              ? authorsMap.get(tm.author.identityId)?.displayName || 'unknown user'
              : '[deleted user]',
          role: tm.authorUserRole?.role,
          ...(tm.authorUserRole?.role === ServiceRoleEnum.INNOVATOR && {
            isOwner: tm.author.id === tm.thread.innovation.owner?.id ?? false
          }),
          organisation,
          organisationUnit
        },
        updatedAt: tm.updatedAt
      };
    });

    return {
      count,
      messages: messageResult
    };
  }

  async getInnovationThreads(
    domainContext: DomainContextType,
    innovationId: string,
    pagination: PaginationQueryParamsType<'subject' | 'createdAt' | 'messageCount' | 'latestMessageCreatedAt'>,
    entityManager?: EntityManager
  ): Promise<{
    count: number;
    data: {
      id: string;
      subject: string;
      messageCount: number;
      createdAt: Date;
      isNew: boolean;
      lastMessage: {
        id: string;
        createdAt: Date;
        createdBy: {
          id: string;
          name: string;
          organisationUnit: null | { id: string; name: string; acronym: string };
          role: ServiceRoleEnum;
          isOwner?: boolean;
        };
      };
    }[];
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(InnovationThreadEntity, 'thread')
      .select([
        'thread.id as thread_id',
        'thread.subject as thread_subject',
        'thread.created_at as thread_created_at',
        'innovation.owner_id as innovation_owner_id',
        'count.count as n_messages',
        'message.id as message_id',
        'message.created_at as message_created_at',
        'author.id as author_id',
        'author.identityId as author_identity_id',
        'author.status as author_status',
        'role.id as role_id',
        'role.role as role_role',
        'unit.id as unit_id',
        'unit.name as unit_name',
        'unit.acronym as unit_acronym'
      ])
      .innerJoin('thread.innovation', 'innovation')
      // Get the information needed about Message
      .innerJoin('thread.messages', 'message')
      .leftJoin('message.authorUserRole', 'role')
      .leftJoin('message.author', 'author')
      .leftJoin('role.organisationUnit', 'unit')
      // Get the latest message from the Thread
      .innerJoin(
        subQuery =>
          subQuery
            .from(InnovationThreadMessageEntity, 'message')
            .select(['message.innovation_thread_id', 'MAX(message.createdAt) as createdAt'])
            .groupBy('message.innovation_thread_id'),
        'latestMessage',
        'latestMessage.innovation_thread_id = thread.id AND latestMessage.createdAt = message.created_at'
      )
      // Get the amount of messages that exists on a Thread
      .innerJoin(
        subQuery =>
          subQuery
            .from(InnovationThreadMessageEntity, 'message')
            .select(['message.innovation_thread_id', 'COUNT(*) as count'])
            .groupBy('message.innovation_thread_id'),
        'count',
        'count.innovation_thread_id = thread.id'
      )
      .where('thread.innovation_id = :innovationId', { innovationId });

    // Pagination and ordering.
    query.offset(pagination.skip);
    query.limit(pagination.take);

    for (const [key, order] of Object.entries(pagination.order)) {
      let field: string;
      switch (key) {
        case 'subject':
          field = 'thread.subject';
          break;
        case 'createdAt':
          field = 'thread.createdAt';
          break;
        case 'messageCount':
          field = 'count.count';
          break;
        case 'latestMessageCreatedAt':
          field = 'message.created_at';
          break;
        default:
          field = 'message.created_at';
          break;
      }
      query.addOrderBy(field, order);
    }

    const threads = await query.getRawMany();

    const authorIds = [
      ...new Set(threads.filter(t => t.author_status !== UserStatusEnum.DELETED).map(t => t.author_identity_id))
    ];
    const authors = await this.identityProvider.getUsersMap(authorIds);

    const notifications = await this.getUnreadMessageNotifications(
      domainContext.currentRole.id,
      threads.map(t => t.thread_id)
    );

    const data = threads.map(t => ({
      id: t.thread_id,
      subject: t.thread_subject,
      messageCount: t.n_messages,
      createdAt: t.thread_created_at,
      isNew: notifications.has(t.thread_id),
      lastMessage: {
        id: t.message_id,
        createdAt: t.message_created_at,
        createdBy: {
          id: t.author_id,
          name: authors.get(t.author_identity_id)?.displayName ?? '[deleted user]',
          organisationUnit:
            t.role_role !== ServiceRoleEnum.INNOVATOR && t.role_role !== ServiceRoleEnum.ASSESSMENT
              ? { id: t.unit_id, name: t.unit_name, acronym: t.unit_acronym }
              : null,
          role: t.role_role,
          isOwner: t.role_role === ServiceRoleEnum.INNOVATOR && t.innovation_owner_id === t.author_id
        }
      }
    }));

    const count = await em
      .createQueryBuilder(InnovationThreadEntity, 'thread')
      .where('thread.innovation_id = :innovationId', { innovationId })
      .getCount();

    return { count, data };
  }

  /*+
   * Private methods
   */

  private async threadCreateTransaction(
    transaction: EntityManager,
    threadObj: InnovationThreadEntity,
    requestUser: { id: string },
    domainContext: DomainContextType,
    innovation: InnovationEntity
  ): Promise<InnovationThreadEntity> {
    const result = await transaction.save<InnovationThreadEntity>(threadObj);

    try {
      const messages = await result.messages;
      const message = messages.find((_: any) => true);
      if (!message) {
        throw new Error(InnovationErrorsEnum.INNOVATION_THREAD_MESSAGE_NOT_FOUND);
      }

      const messageId = message.id; // all threads have at least one message

      await this.domainService.innovations.addActivityLog(
        transaction,
        { innovationId: innovation.id, activity: ActivityEnum.THREAD_CREATION, domainContext },
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
    requestUser: { id: string; identityId: string },
    domainContext: DomainContextType,
    thread: InnovationThreadEntity,
    transaction: EntityManager
  ): Promise<InnovationThreadMessageEntity> {
    const result = await this.sqlConnection
      .getRepository<InnovationThreadMessageEntity>(InnovationThreadMessageEntity)
      .save(threadMessageObj);

    try {
      await this.domainService.innovations.addActivityLog(
        transaction,
        {
          innovationId: thread.innovation.id,
          activity: ActivityEnum.THREAD_MESSAGE_CREATION,
          domainContext
        },
        {
          thread: { id: thread.id, subject: thread.subject },
          message: { id: result.id }
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

  private async createThreadWithTransaction(
    requestUser: { id: string; identityId: string },
    domainContext: DomainContextType,
    innovationId: string,
    subject: string,
    message: string,
    transaction: EntityManager,
    contextId?: string,
    contextType?: ThreadContextTypeEnum,
    editableMessage = false
  ): Promise<{
    thread: InnovationThreadEntity;
    messageCount: number;
  }> {
    const author = await transaction
      .createQueryBuilder(UserEntity, 'users')
      .where('users.id = :userId', { userId: requestUser.id })
      .andWhere('users.status = :userActive', { userActive: UserStatusEnum.ACTIVE })
      .getOneOrFail();

    const innovation = await transaction
      .createQueryBuilder(InnovationEntity, 'innovations')
      .leftJoinAndSelect('innovations.owner', 'owner')
      .where('innovations.id = :innovationId', { innovationId })
      .getOneOrFail();

    const threadObj = InnovationThreadEntity.new({
      subject,
      author: UserEntity.new({ id: author.id }),
      innovation: InnovationEntity.new({ id: innovation.id }),
      contextId,
      contextType,
      messages: [
        InnovationThreadMessageEntity.new({
          author,
          authorOrganisationUnit: domainContext.organisation?.organisationUnit?.id
            ? OrganisationUnitEntity.new({ id: domainContext.organisation.organisationUnit.id })
            : null,
          message,
          isEditable: editableMessage,
          authorUserRole: UserRoleEntity.new({ id: domainContext.currentRole.id })
        })
      ] as any,
      createdBy: author.id,
      authorUserRole: UserRoleEntity.new({ id: domainContext.currentRole.id })
    });

    const thread = await this.threadCreateTransaction(transaction, threadObj, requestUser, domainContext, innovation);

    const messages = await thread.messages;
    return {
      thread,
      messageCount: messages.length
    };
  }

  private async sendThreadCreateNotification(
    domainContext: DomainContextType,
    messageId: string,
    thread: InnovationThreadEntity
  ): Promise<void> {
    await this.notifierService.send(domainContext, NotifierTypeEnum.THREAD_CREATION, {
      threadId: thread.id,
      messageId,
      innovationId: thread.innovation.id
    });
  }

  private async sendThreadMessageCreateNotification(
    domainContext: DomainContextType,
    thread: InnovationThreadEntity,
    threadMessage: InnovationThreadMessageEntity
  ): Promise<void> {
    await this.notifierService.send(domainContext, NotifierTypeEnum.THREAD_MESSAGE_CREATION, {
      threadId: thread.id,
      messageId: threadMessage.id,
      innovationId: thread.innovation.id
    });
  }

  private async getUnreadMessageNotifications(roleId: string, threadIds: string[]): Promise<Set<string>> {
    const notifications = await this.sqlConnection
      .createQueryBuilder(NotificationEntity, 'notifications')
      .select(['notifications.contextId'])
      .innerJoin('notifications.notificationUsers', 'notificationUsers')
      .where('notifications.contextId IN (:...threadIds)', { threadIds })
      .andWhere('notificationUsers.user_role_id = :roleId', { roleId })
      .andWhere('notificationUsers.read_at IS NULL')
      .getMany();

    return new Set(notifications.map(n => n.contextId));
  }
}
