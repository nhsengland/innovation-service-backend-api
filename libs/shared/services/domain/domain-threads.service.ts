import type { DomainUserInfoType } from "../../types";
import type { DataSource, EntityManager } from "typeorm";
import { NotifierTypeEnum, ThreadContextTypeEnum, UserTypeEnum } from "../../enums";
import { InnovationThreadEntity, InnovationThreadMessageEntity, NotificationEntity, UserEntity } from "../../entities";
import type { DomainUsersService } from "./domain-users.service";
import type { NotifierService } from "../integrations/notifier.service";
import { InnovationErrorsEnum, UserErrorsEnum } from "libs/shared/errors";

export class DomainThreadsService {

  constructor(
    private connection: DataSource,
    private notifierService: NotifierService,
    private userService: DomainUsersService,
  ) { }

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
        message: messages.find((_) => true),
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
    editableMessage = false,
    sendNotification: boolean,
    contextId?: string,
    contextType?: ThreadContextTypeEnum,
    transaction?: EntityManager
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
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const firstMessage = sortedMessagesAsc.find((_) => true);

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
        author = await this.connection.createQueryBuilder(UserEntity, 'user')
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
        thread = await this.connection
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
      threadMessage = await this.connection.transaction(async (transaction) => {
        return await this.createThreadMessageTransaction(
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

  async getInnovationThreads(
    requestUser: DomainUserInfoType,
    innovationId: string,
    skip = 0,
    take = 10,
    order?: {
      subject?: "ASC" | "DESC";
      createdAt?: "ASC" | "DESC";
      messageCount?: "ASC" | "DESC";
    }
  ): Promise<ThreadListModel> {
    const messageCountQuery = this.connection
      .createQueryBuilder()
      .addSelect("COUNT(messagesSQ.id)", "messageCount")
      .from(InnovationThreadEntity, "threadSQ")
      .leftJoin("threadSQ.messages", "messagesSQ")
      .andWhere("threadSQ.id = thread.id")
      .groupBy("messagesSQ.innovation_thread_id");

    const countQuery = this.connection
      .createQueryBuilder()
      .addSelect("COUNT(threadSQ.id)", "count")
      .from(InnovationThreadEntity, "threadSQ")
      .where("threadSQ.innovation_id = :innovationId", { innovationId });

    const query = this.connection
      .createQueryBuilder(InnovationThreadEntity, "thread")
      .distinct(false)
      .innerJoinAndSelect("thread.author", "author")
      .addSelect(`(${messageCountQuery.getSql()})`, "messageCount")
      .addSelect(`(${countQuery.getSql()})`, "count");

    query.where("thread.innovation_id = :innovationId", { innovationId });

    if (order) {
      if (order.createdAt) {
        query.addOrderBy("thread.created_at", order.createdAt);
      } else if (order.messageCount) {
        query.addOrderBy("messageCount", order.messageCount);
      } else if (order.subject) {
        query.addOrderBy("thread.subject", order.subject);
      } else {
        query.addOrderBy("thread.created_at", "DESC");
      }
    } else {
      query.addOrderBy("thread.created_at", "DESC");
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

    const threadMessagesQuery = this.connection
      .createQueryBuilder(InnovationThreadMessageEntity, "messages")
      .innerJoinAndSelect("messages.author", "author")
      .innerJoinAndSelect("messages.thread", "thread")
      .leftJoinAndSelect("author.userOrganisations", "userOrgs")
      .leftJoinAndSelect("userOrgs.userOrganisationUnits", "userOrgUnits")
      .leftJoinAndSelect("userOrgUnits.organisationUnit", "unit")
      .where("thread.id IN (:...threadIds)", { threadIds })
      .orderBy("messages.created_at", "DESC");

    const threadMessages = await threadMessagesQuery.getMany();

    const userIds = [...new Set(threadMessages.map((tm) => tm.author.id))];
    const messageAuthors = await this.userService.getUsersList({ userIds });

    const count = threads.find((_) => true)?.count || 0;

    const notificationsQuery = this.connection
      .createQueryBuilder(NotificationEntity, "notifications")
      .innerJoinAndSelect(
        "notifications.notificationUsers",
        "notificationUsers"
      )
      .innerJoinAndSelect("notificationUsers.user", "users")
      .where("notifications.context_id IN (:...threadIds)", { threadIds })
      .andWhere("users.id = :userId", { userId: requestUser.id })

      .andWhere("notificationUsers.read_at IS NULL");

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

        const userOrganisations = await message?.author.userOrganisations;

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
            id: message?.id,
            createdAt: message?.createdAt,
            createdBy: {
              id: authorDB?.id,
              name: authorIdP?.displayName || "unknown user",
              type: authorDB?.type,
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

  async getThread(
    //requestUser: DomainUserInfoType,
    threadId: string
  ): Promise<InnovationThreadEntity> {
    const thread = await this.connection.createQueryBuilder(InnovationThreadEntity, 'thread')
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

    const message = await this.connection.createQueryBuilder(InnovationThreadMessageEntity, 'message')
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
      await this.connection.getRepository<InnovationThreadMessageEntity>(InnovationThreadMessageEntity)
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
    const thread = await this.getInnovationThreads.findOne(threadId, {
      relations: ["innovation", "author"],
    });

    if (!thread) {
      throw new Error(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND);
    }

    const author = await this.userService.getUserInfo({
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
  async getThreadMessageInfo(
    messageId: string
  ): Promise<{
    id: string;
    message: string;
    createdAt: string;
  }> {

    const message = await this.connection.createQueryBuilder(InnovationThreadMessageEntity, 'message')
      .where('message.id = :messageId', { messageId })
      .getOne();

    if (!message) {
      throw new Error(InnovationErrorsEnum.INNOVATION_THREAD_MESSAGE_NOT_FOUND);
    }

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
      createdAt?: "ASC" | "DESC";
    }
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
        type: UserTypeEnum;
        organisation: { id: string; name: string; acronym: string };
        organisationUnit: { id: string; name: string; acronym: string };
      };
      updatedAt: Date;
    }[];
  }> {
    const threadMessageQuery = this.connection
      .createQueryBuilder(InnovationThreadMessageEntity, "messages")
      .addSelect("messages.created_at", "createdAt")
      .leftJoinAndSelect("messages.author", "messageAuthor")
      .leftJoinAndSelect("messages.thread", "thread")
      .leftJoinAndSelect("thread.innovation", "innovation")
      .leftJoinAndSelect("thread.author", "users")
      .leftJoinAndSelect("users.userOrganisations", "userOrgs")
      .leftJoinAndSelect("userOrgs.organisation", "organisation")
      .leftJoinAndSelect("userOrgs.userOrganisationUnits", "userOrgUnits")
      .leftJoinAndSelect("userOrgUnits.organisationUnit", "orgUnit")
      .leftJoinAndSelect("messageAuthor.userOrganisations", "messageUserOrgs")
      .leftJoinAndSelect("messageUserOrgs.user", "messageUser") // load user relation
      .leftJoinAndSelect(
        "messageUserOrgs.userOrganisationUnits",
        "messageUserOrgUnits"
      )
      .leftJoinAndSelect("messageUserOrgs.organisation", "messageOrganisation")
      .leftJoinAndSelect(
        "messageUserOrgUnits.organisationUnit",
        "messageOrgUnits"
      );

    threadMessageQuery.where("thread.id = :threadId", { threadId });

    if (order) {
      for (const key in order) {
        if (Object.prototype.hasOwnProperty.call(order, key)) {
          // TODO: Kill this any
          const element = (order as any)[key];
          threadMessageQuery.addOrderBy(key, element);
        }
      }
    } else {
      threadMessageQuery.addOrderBy("createdAt", "DESC");
    }

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

    const threadAuthor = firstMessage?.thread.author.identityId;
    const threadMessagesAuthors = messages.map((tm) => tm.author.identityId);

    const authors = [...new Set([threadAuthor, ...threadMessagesAuthors])];
    const authorsMap = await this.userService.getUsersList(
      authors.map((a) => ({ userId: a })),
    );

    const messageAuthorOrgsanisationsPromises = await Promise.all(
      messages.map((tm) => tm.author.userOrganisations)
    );
    const messageAuthorOrganisations = messageAuthorOrgsanisationsPromises.flatMap(
      (maop) => maop.map((mao) => mao)
    );

    const notifications = await this.connection
      .createQueryBuilder(Notification, "notification")
      .innerJoinAndSelect("notification.notificationUsers", "notificationUsers")
      .innerJoinAndSelect("notificationUsers.user", "users")
      .where("notification.context_id IN (:...contextIds)", {
        contextIds: messages.map((m) => m.id),
      })
      .andWhere("users.id = :userId", { userId: requestUser.id })
      .andWhere("notificationUsers.read_at IS NULL")
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
        (author) => author.id === tm.author.externalId
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
          name: author?.displayName || "unknown user",
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

  private async threadCreateTransaction(
    transaction: EntityManager,
    threadObj: InnovationThread,
    requestUser: RequestUser,
    innovation: Innovation
  ) {
    const result = await transaction.save(InnovationThread, threadObj);

    try {
      const messages = await result.messages;
      const messageId = messages.find((_) => true)?.id;

      await this.activityLogService.createLog(
        requestUser,
        innovation,
        Activity.THREAD_CREATION,
        transaction,
        {
          threadId: result.id,
          threadSubject: result.subject,
          threadMessageId: messageId,
        }
      );
    } catch (error) {
      this.logService.error(
        `An error has occured while creating activity log from ${requestUser.id} for the Activity ${Activity.THREAD_CREATION}`,
        error
      );
      throw error;
    }

    return result;
  }

  private async createThreadMessageTransaction(
    threadMessageObj: InnovationThreadMessage,
    requestUser: RequestUser,
    thread: InnovationThread,
    transaction: EntityManager
  ) {
    const result = await this.innovationThreadMessageRepo.save(
      threadMessageObj
    );

    try {
      await this.activityLogService.createLog(
        requestUser,
        thread.innovation,
        Activity.THREAD_MESSAGE_CREATION,
        transaction,
        {
          threadId: thread.id,
          threadSubject: thread.subject,
          threadMessageId: result.id,
        }
      );
    } catch (error) {
      this.logService.error(
        `An error has occured while creating activity log from ${requestUser.id} for the Activity ${Activity.THREAD_MESSAGE_CREATION}`,
        error
      );
      throw error;
    }

    return result;
  }

  private createThreadGuard(
    requestUser: RequestUser,
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
      throw new InvalidParamsError("Invalid parameters for createThread.");
    }
  }

  private createThreadMessageGuard(
    requestUser: RequestUser,
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
      throw new InvalidParamsError(
        "Invalid parameters for createThreadMessage"
      );
    }
  }

  private async createThreadNoTransaction(
    requestUser: RequestUser,
    innovationId: string,
    subject: string,
    message: string,
    editableMessage = false,
    contextId?: string,
    contextType?: ThreadContextType
  ): Promise<{
    thread: InnovationThread;
    messageCount: number;
  }> {
    const author = await this.userService.getUser(requestUser.id, {
      where: `locked_at IS NULL`,
    });

    if (!author) {
      throw new UserDBNotFound(`Could not find user with id ${requestUser.id}`);
    }

    const innovation = await this.connection
      .createQueryBuilder(Innovation, "innovations")
      .innerJoinAndSelect("innovations.owner", "owner")
      .where("innovations.id = :innovationId", { innovationId })
      .getOne();

    if (!innovation) {
      throw new InnovationNotFoundError(
        `Could not find innovation with id ${innovationId}`
      );
    }

    const threadObj = InnovationThread.new({
      subject,
      author,
      innovation,
      contextId,
      contextType,
      messages: [
        InnovationThreadMessage.new({
          author,
          message,
          isEditable: editableMessage,
        }),
      ],
      createdBy: author.id,
    });

    const thread = await this.connection.transaction(async (transaction) => {
      return await this.threadCreateTransaction(
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
    requestUser: RequestUser,
    innovationId: string,
    subject: string,
    message: string,
    editableMessage = false,
    transaction: EntityManager,
    contextId?: string,
    contextType?: ThreadContextType
  ): Promise<{
    thread: InnovationThread;
    messageCount: number;
  }> {
    const author = await transaction
      .createQueryBuilder(User, "users")
      .where("users.id = :userId", { userId: requestUser.id })
      .andWhere("users.locked_at IS NULL")
      .getOne();

    if (!author) {
      throw new UserDBNotFound(`Could not find user with id ${requestUser.id}`);
    }

    const innovation = await transaction
      .createQueryBuilder(Innovation, "innovations")
      .innerJoinAndSelect("innovations.owner", "owner")
      .where("innovations.id = :innovationId", { innovationId })
      .getOne();

    if (!innovation) {
      throw new InnovationNotFoundError(
        `Could not find innovation with id ${innovationId}`
      );
    }

    const threadObj = InnovationThread.new({
      subject,
      author,
      innovation,
      contextId,
      contextType,
      messages: [
        InnovationThreadMessage.new({
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
      this.logService.error(
        `An error has occured while writing notification on queue of type ${NotificationActionType.THREAD_CREATION}`,
        error
      );
    }
  }

  private async sendThreadMessageCreateNotification(
    requestUser: RequestUser,
    thread: InnovationThread,
    threadMessage: InnovationThreadMessage
  ) {
    try {
      await this.queueProducer.sendNotification(
        NotificationActionType.THREAD_MESSAGE_CREATION,
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
      this.logService.error(
        `An error has occured while writing notification on queue of type ${NotificationActionType.THREAD_MESSAGE_CREATION}`,
        error
      );
    }
  }
}
