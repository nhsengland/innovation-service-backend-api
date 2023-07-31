import { randEmail, randRole } from '@ngneat/falso';
import type { DeepPartial, EntityManager } from 'typeorm';
import { InnovationCollaboratorEntity } from '../../entities/innovation/innovation-collaborator.entity';
import { UserEntity } from '../../entities/user/user.entity';
import { InnovationCollaboratorStatusEnum } from '../../enums/innovation.enums';
import { BaseBuilder } from './base.builder';

export type TestCollaboratorType = {
  id: string;
  email: string;
  status: InnovationCollaboratorStatusEnum;
  invitedAt: Date;
};

export class InnovationCollaboratorBuilder extends BaseBuilder {
  private collaborator: DeepPartial<InnovationCollaboratorEntity>;

  constructor(entityManager: EntityManager) {
    super(entityManager);

    this.collaborator = {
      status: InnovationCollaboratorStatusEnum.ACTIVE,
      email: randEmail(),
      invitedAt: new Date()
    };
  }

  setUser(userId: string): this {
    this.collaborator.user = UserEntity.new({ id: userId });
    return this;
  }

  setEmail(email: string): this {
    this.collaborator.email = email;
    return this;
  }

  setStatus(status: InnovationCollaboratorStatusEnum): this {
    this.collaborator.status = status;
    return this;
  }

  setInnovation(innovationId: string): this {
    this.collaborator.innovation = { id: innovationId };
    return this;
  }

  setInvitedAt(date: Date): this {
    this.collaborator.invitedAt = date;
    return this;
  }

  setRole(role?: string): this {
    this.collaborator.collaboratorRole = role ?? randRole();
    return this;
  }

  async save(): Promise<TestCollaboratorType> {
    const savedCollaborator = await this.getEntityManager()
      .getRepository(InnovationCollaboratorEntity)
      .save(this.collaborator);

    const result = await this.getEntityManager()
      .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
      .where('collaborator.id = :collabId', { collabId: savedCollaborator.id })
      .getOne();

    if (!result) {
      throw new Error('Error saving/retriving collaborator information.');
    }

    return {
      id: result.id,
      email: result.email,
      status: result.status,
      invitedAt: result.invitedAt
    };
  }
}
