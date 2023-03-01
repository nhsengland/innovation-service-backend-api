import { InnovationEntity, UserEntity } from "@innovations/shared/entities";
import { InnovationCollaboratorEntity } from "@innovations/shared/entities/innovation/innovation-collaborator.entity";
import { InnovationCollaboratorStatusEnum, NotifierTypeEnum } from "@innovations/shared/enums";
import { InnovationErrorsEnum, UnprocessableEntityError } from "@innovations/shared/errors";
import { DomainServiceSymbol, DomainServiceType, NotifierServiceSymbol, NotifierServiceType } from "@innovations/shared/services";
import type { DomainContextType } from "@innovations/shared/types";
import { inject, injectable } from "inversify";
import type { EntityManager } from "typeorm";
import { BaseService } from "./base.service";

@injectable()
export class InnovationCollaboratorsService extends BaseService {

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType
  ) { super(); }

  async createCollaborator(
    domainContext: DomainContextType,
    innovationId: string,
    data: { email: string, role: string | null },
    entityManager?: EntityManager,
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const invite = await connection.createQueryBuilder(InnovationCollaboratorEntity, 'collaborators')
      .where('collaborators.email = :email', { email: data.email })
      .andWhere('collaborators.innovation_id = :innovationId', { innovationId })
      .getCount();

    if (invite) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_ALREADY_CREATED_REQUEST);
    }

    const [user] = await this.domainService.users.getUserByEmail(data.email);

    const collaboratorObj = InnovationCollaboratorEntity.new({
      email: data.email,
      collaboratorRole: data.role,
      status: InnovationCollaboratorStatusEnum.PENDING,
      innovation: InnovationEntity.new({ id: innovationId }),
      createdBy: domainContext.id,
      updatedBy: domainContext.id,
      invitedAt: new Date().toISOString(),
      ...(user && { user: UserEntity.new({ id: user.id }) })
    });

    const collaborator = await connection.save(InnovationCollaboratorEntity, collaboratorObj);

    await this.notifierService.send(
      { id: domainContext.id, identityId: domainContext.identityId },
      NotifierTypeEnum.INNOVATION_COLLABORATOR_INVITE,
      {
        innovationCollaboratorId: collaborator.id,
        innovationId: innovationId
      },
      domainContext,
    );

    return { id: collaborator.id };
  }
}
