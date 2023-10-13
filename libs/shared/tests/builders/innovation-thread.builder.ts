import { randText } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import {
  InnovationEntity,
  InnovationThreadEntity,
  InnovationThreadMessageEntity,
  UserEntity,
  UserRoleEntity
} from '../../entities';
import { InnovationTaskStatusEnum, ThreadContextTypeEnum } from '../../enums';
import { BaseBuilder } from './base.builder';

export type TestInnovationThreadMessageType = {
  id: string;
  author: { id: string; roleId: string };
  message: string;
  createdAt: Date;
};

export type TestInnovationThreadType = {
  id: string;
  author: { id: string; roleId: string };
  subject: string;
  messages: Record<string, TestInnovationThreadMessageType>;
};

export class InnovationThreadBuilder extends BaseBuilder {
  private thread: InnovationThreadEntity;
  private messagesToAdd: Record<string, Pick<TestInnovationThreadMessageType, 'author' | 'message'>> = {};

  constructor(entityManager: EntityManager) {
    super(entityManager);
    this.thread = InnovationThreadEntity.new({
      subject: randText({ charCount: 10 })
    });
  }

  setInnovation(innovatonId: string): this {
    this.thread.innovation = InnovationEntity.new({ id: innovatonId });
    return this;
  }

  setContextType(contextType: ThreadContextTypeEnum): this {
    this.thread.contextType = contextType;
    return this;
  }

  setContextId(contextId: string): this {
    this.thread.contextId = contextId;
    return this;
  }

  setAuthor(userId: string, roleId: string): this {
    this.thread.author = UserEntity.new({ id: userId });
    this.thread.authorUserRole = UserRoleEntity.new({ id: roleId });
    return this;
  }

  setSubject(subject: string): this {
    this.thread.subject = subject;
    return this;
  }

  addMessage(author: { id: string; roleId: string }, key: string, message?: string): this {
    const messageText = message ?? randText({ charCount: 20 });
    this.messagesToAdd[key] = { author, message: messageText };
    return this;
  }

  async save(): Promise<TestInnovationThreadType> {
    const savedThread = await this.getEntityManager().getRepository(InnovationThreadEntity).save(this.thread);

    const savedMessages: Record<string, TestInnovationThreadMessageType> = {};
    for (const messageToAdd of Object.entries(this.messagesToAdd)) {
      const savedMessage = await this.getEntityManager()
        .getRepository(InnovationThreadMessageEntity)
        .save(
          InnovationThreadMessageEntity.new({
            message: messageToAdd[1].message,
            author: UserEntity.new({ id: messageToAdd[1].author.id }),
            createdBy: messageToAdd[1].author.id,
            authorUserRole: UserRoleEntity.new({ id: messageToAdd[1].author.roleId }),
            thread: savedThread
          })
        );
      savedMessages[messageToAdd[0]] = {
        id: savedMessage.id,
        author: messageToAdd[1].author,
        message: savedMessage.message,
        createdAt: savedMessage.createdAt
      };
      // special case for tasks (only creating open tasks for now)
      if (this.thread.contextType == ThreadContextTypeEnum.TASK && this.thread.contextId) {
        await this.getEntityManager().query('INSERT INTO innovation_task_message VALUES (@0, @1, @2)', [
          this.thread.contextId,
          savedMessage.id,
          InnovationTaskStatusEnum.OPEN
        ]);
      }
    }

    const result = await this.getEntityManager()
      .createQueryBuilder(InnovationThreadEntity, 'thread')
      .select(['thread.id', 'thread.subject', 'authorUser.id', 'authorRole.id'])
      .innerJoin('thread.author', 'authorUser')
      .innerJoin('thread.authorUserRole', 'authorRole')
      .where('thread.id = :threadId', { threadId: savedThread.id })
      .getOne();

    if (!result) {
      throw new Error('Error saving/retriving thread information.');
    }

    return {
      id: result.id,
      author: { id: result.author.id, roleId: result.authorUserRole.id },
      subject: result.subject,
      messages: savedMessages
    };
  }
}
