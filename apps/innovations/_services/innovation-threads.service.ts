import type { DomainUserInfoType } from "@innovations/shared/types";
import type { EntityManager } from "typeorm";
import { NotifierTypeEnum, ThreadContextTypeEnum, UserTypeEnum } from "@innovations/shared/enums";
import { InnovationThreadEntity, InnovationThreadMessageEntity, NotificationEntity, UserEntity } from "@innovations/shared/entities";
import { InnovationErrorsEnum, UserErrorsEnum } from "@innovations/shared/errors";
import { injectable, inject } from "inversify";
import { BaseAppService } from './base-app.service'

@injectable()
export class InnovationThreadsService extends BaseAppService {

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
      .createQueryBuilder(InnovationThreadEntity, "thread")
      .where("thread.context_id = :contextId", { contextId })
      .andWhere("thread.context_type = :contextType", { contextType });

    const thread = await threadQuery.getOne();

    if (!thread) {
      const t = await this.createThread(
        requestUser,
        innovationId,
        subject,
        message,
        false,
        sendNotification,
        contextId,
        contextType,
        transaction
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
        editableMessage,
        transaction,
        contextId,
        contextType
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
      const firstMessage = sortedMessagesAsc.find((_: any) => true);

      this.sendThreadCreateNotification(
        requestUser,
        firstMessage?.id,
        result.thread
      );
    }

    return result;
  }

  async createThreadMessage(
    requestUser: DomainUserInfoType,
    threadId: string,
    message: string,
    sendNotification: boolean,
    isEditable: boolean = false,
    transaction?: EntityManager
  ): Promise<{
    threadMessage: InnovationThreadMessageEntity;
  }> {
    this.createThreadMessageGuard(requestUser, threadId, message);

    let author: UserEntity;
    if (!transaction) {
      try {
        author = await this.sqlConnection.createQueryBuilder(UserEntity, 'user')
          .where('locked_at IS NULL').getOneOrFail();
      } catch (error) {
        throw new Error(UserErrorsEnum.USER_SQL_NOT_FOUND);
      }
    } else {

      try {
        author = await transaction
          .createQueryBuilder(UserEntity, "users")
          .where("users.id = :userId", { userId: requestUser.id })
          .andWhere("users.locked_at IS NULL")
          .getOneOrFail();
      } catch (error) {
        throw new Error(UserErrorsEnum.USER_SQL_NOT_FOUND);
      }
    }

    let thread: InnovationThreadEntity;
    try {

      if (!transaction) {
        thread = await this.sqlConnection
          .createQueryBuilder(InnovationThreadEntity, "threads")
          .innerJoinAndSelect("threads.innovation", "innovations")
          .innerJoinAndSelect("threads.author", "users")
          .where("threads.id = :threadId", { threadId })
          .getOneOrFail();
      } else {
        thread = await transaction
          .createQueryBuilder(InnovationThreadEntity, "threads")
          .innerJoinAndSelect("threads.innovation", "innovations")
          .innerJoinAndSelect("threads.author", "users")
          .where("threads.id = :threadId", { threadId })
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
    //requestUser: DomainUserInfoType,
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

    // this.validationService
    //   .checkThreadMessageSync(requestUser, message)
    //   .checkMessageAuthor()
    //   .checkCanEdit()
    //   .validateSync();

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
      createdAt: thread.createdAt.toISOString(),
      createdBy: {
        id: author.id,
        name: author?.displayName || "unknown user",
        type: thread.author.type,
      },
    };
  }

  private async threadCreateTransaction(
    transaction: EntityManager,
    threadObj: InnovationThreadEntity,
    requestUser: DomainUserInfoType,
    innovation: InnovationThreadEntity
  ) {
    const result = await transaction.save<InnovationThreadEntity>(InnovationThreadEntity, threadObj);

    if (result.length === 0) {
      throw new Error(InnovationErrorsEnum.INNOVATION_THREAD_CREATION_FAILED);
    }

    try {

      const messages = await result[0].messages;
      const messageId = messages.find((_: any) => true)?.id;

      await this.domainService.innovations.addActivityLog<'INNOVATTION_THREAD_CREATE'>(
        transaction,
        { userId: requestUser.id, innovationId: innovation.id, activity: ActivityEnum.INNOVATTION_THREAD_CREATE },
        {
          thread: { id: result.id, subject: result.subject },
          message: { id: messageId }
        }
      );
    } catch (error) {
      this.logger.error(
        `An error has occured while creating activity log from ${requestUser.id} for the Activity ${ActivityEnum.INNOVATTION_THREAD_CREATE}`,
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
  ) {
    const result = await this.sqlConnection.getRepository<InnovationThreadMessageEntity>(InnovationThreadMessageEntity).save(
      threadMessageObj
    );

    try {
      await this.domainService.innovations.addActivityLog<'INNOVATTION_THREAD_MESSAGE_CREATE'>(
        transaction,
        { userId: requestUser.id, innovationId: thread.innovation.id, activity: ActivityEnum.INNOVATTION_THREAD_MESSAGE_CREATE },
        {
          thread: { id: thread.id, subject: thread.subject },
          message: { id: result.id },
        }
      );
    } catch (error) {
      this.logger.error(
        `An error has occured while creating activity log from ${requestUser.id} for the Activity ${ActivityEnum.INNOVATTION_THREAD_MESSAGE_CREATE}`,
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
  ) {
    if (
      !requestUser ||
      !innovationId ||
      !message ||
      message.length === 0 ||
      !subject ||
      subject.length === 0
    ) {
      throw new Error(GenericErrorsEnum.MISSING_PARAMS);
    }
  }

  private createThreadMessageGuard(
    requestUser: DomainUserInfoType,
    threadId: string,
    message: string
  ) {
    if (
      !requestUser ||
      !threadId ||
      threadId.length === 0 ||
      !message ||
      message.length === 0
    ) {
      throw new Error(GenericErrorsEnum.MISSING_PARAMS);
    }
  }

  private async createThreadNoTransaction(
    requestUser: DomainUserInfoType,
    innovationId: string,
    subject: string,
    message: string,
    editableMessage = false,
    contextId?: string,
    contextType?: ThreadContextTypeEnum
  ): Promise<{
    thread: InnovationThreadEntity;
    messageCount: number;
  }> {

    const author = await this.sqlConnection.createQueryBuilder(UserEntity, 'user')
      .where('user.id = :userId', { userId: requestUser.id })
      .andWhere('locked_at IS NULL')
      .getOneOrFail();

    const innovation = await this.sqlConnection
      .createQueryBuilder(InnovationEntity, "innovations")
      .innerJoinAndSelect("innovations.owner", "owner")
      .where("innovations.id = :innovationId", { innovationId })
      .getOneOrFail();

    const threadObj = InnovationThreadEntity.new({
      subject,
      author,
      innovation,
      contextId,
      contextType,
      messages: [
        InnovationThreadMessageEntity.new({
          author,
          message,
          isEditable: editableMessage,
        }),
      ],
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

    return {
      thread,
      messageCount: await thread.getMessageCount(),
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
      .createQueryBuilder(UserEntity, "users")
      .where("users.id = :userId", { userId: requestUser.id })
      .andWhere("users.locked_at IS NULL")
      .getOne();

    if (!author) {
      throw new UserDBNotFound(`Could not find user with id ${requestUser.id}`);
    }

    const innovation = await transaction
      .createQueryBuilder(InnovationEntity, "innovations")
      .innerJoinAndSelect("innovations.owner", "owner")
      .where("innovations.id = :innovationId", { innovationId })
      .getOne();

    if (!innovation) {
      throw new InnovationNotFoundError(
        `Could not find innovation with id ${innovationId}`
      );
    }

    const threadObj = InnovationThreadEntity.new({
      subject,
      author,
      innovation,
      contextId,
      contextType,
      messages: [
        InnovationThreadMessageEntity.new({
          author,
          message,
          isEditable: editableMessage,
        }),
      ],
      createdBy: author.id,
    });

    const thread = await this.threadCreateTransaction(
      transaction,
      threadObj,
      requestUser,
      innovation
    );

    return {
      thread,
      messageCount: await thread.getMessageCount(),
    };
  }

  private async sendThreadCreateNotification(
    requestUser: DomainUserInfoType,
    messageId: string | undefined,
    thread: InnovationThreadEntity
  ) {
    try {
      await this.notifierService.sendNotification(
        NotifierTypeEnum.THREAD_CREATION,
        {
          id: requestUser.id,
          identityId: requestUser.identityId,
          type: requestUser.type,
        },
        {
          innovationId: thread.innovation.id,
          threadId: thread.id,
          messageId,
        }
      );
    } catch (error) {
      this.logger.error(
        `An error has occured while writing notification on queue of type ${NotificationActionTypeEnum.THREAD_CREATION}`,
        error
      );
    }
  }

  private async sendThreadMessageCreateNotification(
    requestUser: DomainUserInfoType,
    thread: InnovationThreadEntity,
    threadMessage: InnovationThreadMessageEntity
  ) {
    try {
      await this.queueProducer.sendNotification(
        NotificationActionTypeEnum.THREAD_MESSAGE_CREATION,
        {
          id: requestUser.id,
          identityId: requestUser.externalId,
          type: requestUser.type,
        },
        {
          innovationId: thread.innovation.id,
          threadId: thread.id,
          messageId: threadMessage.id,
        }
      );
    } catch (error) {
      this.logger.error(
        `An error has occured while writing notification on queue of type ${NotificationActionTypeEnum.THREAD_MESSAGE_CREATION}`,
        error
      );
    }
  }
}
