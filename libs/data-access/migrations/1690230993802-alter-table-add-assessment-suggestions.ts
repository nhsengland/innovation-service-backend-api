import type { MigrationInterface, QueryRunner } from 'typeorm';

import {
  InnovationAssessmentEntity,
  InnovationEntity,
  InnovationSupportLogEntity,
  OrganisationUnitEntity,
  UserRoleEntity
} from '../../shared/entities';
import { InnovationSupportLogTypeEnum, ServiceRoleEnum } from '../../shared/enums';

export class alterTableAddAssessmentSuggestions1690230993802 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const connection = queryRunner.manager;

    const assessments = await connection
      .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
      .select(['assessment.id', 'assessment.updatedBy', 'assessment.updatedAt', 'suggestedUnit.id', 'innovation.id'])
      .withDeleted()
      .innerJoin('assessment.organisationUnits', 'suggestedUnit')
      .innerJoin('assessment.innovation', 'innovation')
      .getMany();

    const assessmentRoles = await connection
      .createQueryBuilder(UserRoleEntity, 'role')
      .select(['role.id', 'role.user_id'])
      .where('role.role = :assessmentRole', { assessmentRole: ServiceRoleEnum.ASSESSMENT })
      .getRawMany();
    const assessmentRolesMap = new Map(assessmentRoles.map(r => [r.user_id.toLowerCase(), r.role_id.toLowerCase()]));

    const logs: InnovationSupportLogEntity[] = [];
    for (const assessment of assessments) {
      const createdByUserRoleId = assessmentRolesMap.get(assessment.updatedBy.toLowerCase());
      if (!createdByUserRoleId) {
        continue;
      }

      logs.push(
        InnovationSupportLogEntity.new({
          innovation: InnovationEntity.new({ id: assessment.innovation.id }),
          description: 'NA suggested units',
          type: InnovationSupportLogTypeEnum.ASSESSMENT_SUGGESTION,
          suggestedOrganisationUnits: assessment.organisationUnits.map(unit =>
            OrganisationUnitEntity.new({ id: unit.id })
          ),
          createdBy: assessment.updatedBy,
          createdByUserRole: UserRoleEntity.new({ id: createdByUserRoleId }),
          updatedBy: assessment.updatedBy,
          createdAt: assessment.updatedAt
        })
      );
    }

    await connection.save(InnovationSupportLogEntity, logs, { chunk: 10 });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DELETE FROM innovation_support_log WHERE type = @0;
    `,
      [InnovationSupportLogTypeEnum.ASSESSMENT_SUGGESTION]
    );
  }
}
