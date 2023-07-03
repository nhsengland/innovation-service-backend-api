import { randEmail } from '@ngneat/falso';
import type { DeepPartial, EntityManager } from 'typeorm';
import { InnovationTransferEntity } from '../../entities/innovation/innovation-transfer.entity';
import { InnovationTransferStatusEnum } from '../../enums/innovation.enums';
import { BaseBuilder } from './base.builder';
import type { TestInnovationType } from './innovation.builder';

export type TestInnovationTransferType = {
  id: string;
  status: InnovationTransferStatusEnum;
  email: string;
  emailCount: number;
  finishedAt?: Date;
  ownerToCollaborator: boolean;
};

export class InnovationTransferBuilder extends BaseBuilder {
  private transfer: DeepPartial<InnovationTransferEntity> = {
    status: InnovationTransferStatusEnum.PENDING,
    email: randEmail(),
    emailCount: 1,
    ownerToCollaborator: false
  };

  constructor(entityManager: EntityManager) {
    super(entityManager);
  }

  setInnovation(innovation: TestInnovationType): this {
    this.transfer.innovation = { id: innovation.id };
    this.transfer.createdBy = innovation.ownerId;
    return this;
  }

  setStatus(status: InnovationTransferStatusEnum): this {
    this.transfer.status = status;
    return this;
  }

  setEmail(email: string): this {
    this.transfer.email = email;
    this.transfer.emailCount = 1;
    return this;
  }

  setFinishedAt(date: Date): this {
    this.transfer.finishedAt = date;
    return this;
  }

  ownerToCollaborator(): this {
    this.transfer.ownerToCollaborator = true;
    return this;
  }

  async save(): Promise<TestInnovationTransferType> {
    const savedTransfer = await this.getEntityManager().getRepository(InnovationTransferEntity).save(this.transfer);

    const result = await this.getEntityManager()
      .createQueryBuilder(InnovationTransferEntity, 'transfer')
      .where('transfer.id = :id', { id: savedTransfer.id })
      .getOne();

    if (!result) {
      throw new Error('Error saving/retriving innovation transfer information.');
    }

    return {
      id: result.id,
      status: result.status,
      email: result.email,
      emailCount: result.emailCount,
      finishedAt: result.finishedAt,
      ownerToCollaborator: result.ownerToCollaborator
    };
  }
}
