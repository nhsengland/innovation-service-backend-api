import { randEmail, randRole } from "@ngneat/falso";
import type { EntityManager } from "typeorm";
import type { InnovationEntity, UserEntity } from "../entities";
import { InnovationCollaboratorEntity } from "../entities/innovation/innovation-collaborator.entity";
import { InnovationCollaboratorStatusEnum } from "../enums";
import type { DateISOType, DomainContextType } from "../types";

export class InnovationCollaboratorBuilder {

  innovationCollaborator: Partial<InnovationCollaboratorEntity> = {};

  constructor(
    domainContext: DomainContextType,
    innovation: InnovationEntity,
  ) {
    this.innovationCollaborator = {
      email: randEmail(),
      collaboratorRole: randRole(),
      status: InnovationCollaboratorStatusEnum.PENDING,
      innovation: innovation,
      createdBy: domainContext.id,
      updatedBy: domainContext.id,
      invitedAt: new Date().toISOString()
    }
  }

  setEmail(email: string): InnovationCollaboratorBuilder {
    this.innovationCollaborator.email = email;
    return this;
  }

  setCollaboratorRole(role: string): InnovationCollaboratorBuilder {
    this.innovationCollaborator.collaboratorRole = role;
    return this;
  }

  setStatus(status: InnovationCollaboratorStatusEnum): InnovationCollaboratorBuilder {
    this.innovationCollaborator.status = status;
    return this;
  }

  setInvitedAt(date: DateISOType): InnovationCollaboratorBuilder {
    this.innovationCollaborator.invitedAt = date;
    return this;
  }

  setUser(user: UserEntity): InnovationCollaboratorBuilder {
    this.innovationCollaborator.user = user;
    return this;
  }

  async build(entityManager: EntityManager): Promise<InnovationCollaboratorEntity> {
    const innovationCollaborator = await entityManager.getRepository(InnovationCollaboratorEntity).save(this.innovationCollaborator);
    return innovationCollaborator;
  }
}
