/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { DataSource } from 'typeorm';

import { ServiceRoleEnum } from '../../enums/user.enums';
import { InnovationActionBuilder } from '../builders/innovation-action.builder';
import { InnovationCollaboratorBuilder } from '../builders/innovation-collaborator.builder';
import { InnovationBuilder } from '../builders/innovation.builder';
import { OrganisationUnitBuilder } from '../builders/organisation-unit.builder';
import { OrganisationBuilder } from '../builders/organisation.builder';
import { UserBuilder } from '../builders/user.builder';

export type CompleteScenarioType = Awaited<ReturnType<CompleteScenarioBuilder['createScenario']>>;

export class CompleteScenarioBuilder {
  sqlConnection: DataSource;

  constructor(sqlConnection: DataSource) {
    this.sqlConnection = sqlConnection;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async createScenario() {
    return await this.sqlConnection.transaction(async entityManager => {
      //organisations

      const aliceOrg = await new OrganisationBuilder(entityManager).setName('aliceOrg').save();

      // organisationUnits

      const aliceOrgUnit = await new OrganisationUnitBuilder(entityManager)
        .addToOrganisation(aliceOrg.id)
        .setName('aliceOrgUnit')
        .save();

      // QAs and Accessors

      // Alice Qualifying Accessor specs:
      // Belongs to an active organisation.
      const aliceQualifyingAccessor = await new UserBuilder(entityManager)
        .setName('Alice Qualifying Accessor')
        .addRole(ServiceRoleEnum.QUALIFYING_ACCESSOR, 'qaRole', aliceOrg.id, aliceOrgUnit.id)
        .save();

      // Needs assessors

      const paulNeedsAssessor = await new UserBuilder(entityManager)
        .setName('Paul Needs Assessor')
        .addRole(ServiceRoleEnum.ASSESSMENT, 'assessmentRole')
        .save();

      // Innovators.

      // John Innovator specs:
      // 1 innovation in status 'CREATED' with 1 action in status 'REQUESTED'
      const johnInnovator = await new UserBuilder(entityManager)
        .setName('John Innovator')
        .addRole(ServiceRoleEnum.INNOVATOR, 'innovatorRole')
        // .addRole(ServiceRoleEnum.INNOVATOR)
        .save();

      // Jane Innovator specs:
      // Collaborator on jonhInnovation
      const janeInnovator = await new UserBuilder(entityManager)
        .setName('Jane Innovator')
        .addRole(ServiceRoleEnum.INNOVATOR, 'innovatorRole')
        .save();

      // Adam Innovator specs:
      // 1 innovation in status 'CREATED' with transfer in status 'PENDING' to external user.
      const adamInnovator = await new UserBuilder(entityManager)
        .setName('Adam Innovator')
        .addRole(ServiceRoleEnum.INNOVATOR, 'innovatorRole')
        .save();

      // Innovations

      // Innovation owned by johnInnovator with janeCollaborator as ACTIVE collaborator
      const johnInnovation = await (
        await new InnovationBuilder(entityManager).setOwner(johnInnovator.id).addSection('INNOVATION_DESCRIPTION')
      ).save();

      const adamInnovation = await new InnovationBuilder(entityManager)
        .setOwner(adamInnovator.id)
        .addTransfer('transfers@example.org')
        .save();

      // Collaborators

      // Add janeInnovator as a collaborator on johnInnovation
      const janeCollaborator = await new InnovationCollaboratorBuilder(entityManager)
        .setUser(janeInnovator.id)
        .setInnovation(johnInnovation.id)
        .save();

      // Actions

      // action on johnInnovation created by Alice (QA)
      const johnInnovationActionByAlice = await new InnovationActionBuilder(entityManager)
        .setCreatedBy(aliceQualifyingAccessor.id)
        .setCreatedByUserRole(aliceQualifyingAccessor.roles['qaRole']!.id)
        .setUpdatedBy(aliceQualifyingAccessor.id)
        .setUpdatedByUserRole(aliceQualifyingAccessor.roles['qaRole']!.id)
        .setInnovationSection(johnInnovation.sections.get('INNOVATION_DESCRIPTION')!.id)
        .save();

      // action on johnInnovation created by Paul (NA)
      const johnInnovationActionByPaul = await new InnovationActionBuilder(entityManager)
        .setCreatedBy(paulNeedsAssessor.id)
        .setCreatedByUserRole(paulNeedsAssessor.roles['assessmentRole']!.id)
        .setUpdatedBy(paulNeedsAssessor.id)
        .setUpdatedByUserRole(paulNeedsAssessor.roles['assessmentRole']!.id)
        .setInnovationSection(johnInnovation.sections.get('INNOVATION_DESCRIPTION')!.id)
        .save();

      return {
        users: {
          johnInnovator: {
            ...johnInnovator,
            roles: { innovatorRole: johnInnovator.roles['innovatorRole']! },
            innovations: {
              johnInnovation: {
                ...johnInnovation,
                actions: [johnInnovationActionByAlice, johnInnovationActionByPaul],
                collaborators: [janeCollaborator]
              }
            }
          },
          janeInnovator: {
            ...janeInnovator,
            roles: { innovatorRole: janeInnovator.roles['innovatorRole']! },
            innovations: {
              johnInnovation: johnInnovation
            }
          },
          adamInnovator: {
            ...adamInnovator,
            roles: { innovatorRole: adamInnovator.roles['innovatorRole']! },
            innovations: { adamInnovation: { ...adamInnovation } }
          },
          aliceQualifyingAccessor: {
            ...aliceQualifyingAccessor,
            roles: { qaRole: aliceQualifyingAccessor.roles['qaRole']! },
            organisations: {
              aliceOrg: {
                ...aliceQualifyingAccessor.organisations['aliceOrg']!,
                organisationUnits: {
                  aliceOrgUnit: aliceQualifyingAccessor.organisations['aliceOrg']!.organisationUnits['aliceOrgUnit']!
                }
              }
            }
          },
          paulNeedsAssessor: {
            ...paulNeedsAssessor,
            roles: { assessmentRole: paulNeedsAssessor.roles['assessmentRole']! }
          }
        }
      };
    });
  }
}
