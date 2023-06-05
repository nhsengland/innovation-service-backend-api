/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { DataSource } from 'typeorm';

import { ServiceRoleEnum } from '../../enums/user.enums';
import { InnovationActionBuilder } from '../builders/innovation-action.builder';
import { InnovationCollaboratorBuilder } from '../builders/innovation-collaborator.builder';
import { InnovationThreadBuilder } from '../builders/innovation-thread.builder';
import { InnovationBuilder } from '../builders/innovation.builder';
import { OrganisationUnitBuilder } from '../builders/organisation-unit.builder';
import { OrganisationBuilder } from '../builders/organisation.builder';
import { TestUserType, UserBuilder } from '../builders/user.builder';

export type CompleteScenarioType = Awaited<ReturnType<CompleteScenarioBuilder['createScenario']>>;

export class CompleteScenarioBuilder {
  sqlConnection: DataSource;
  scenario: CompleteScenarioType;

  private identityMap: Map<string, TestUserType>;
  private userMap: Map<string, TestUserType>;

  constructor(sqlConnection: DataSource) {
    this.sqlConnection = sqlConnection;

    // This is set in jest.setup.ts and is used to share data between tests)
    // Comment this if not using global setup / teardown
    this.scenario = (global as any).completeScenarioData;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async createScenario() {
    const res = await this.sqlConnection.transaction(async entityManager => {
      // Needs assessors

      const paulNeedsAssessor = await new UserBuilder(entityManager)
        .setName('Paul Needs Assessor')
        .addRole(ServiceRoleEnum.ASSESSMENT, 'assessmentRole')
        .save();

      // Admin
      const allMighty = await new UserBuilder(entityManager)
        .setName('All Mighty')
        .addRole(ServiceRoleEnum.ADMIN, 'adminRole')
        .save();

      // QAs and Accessors

      const healthOrg = await new OrganisationBuilder(entityManager).setName('Health Organisation').save();

      const healthOrgUnit = await new OrganisationUnitBuilder(entityManager)
        .addToOrganisation(healthOrg.id)
        .setName('Health Org Unit')
        .save();

      // Alice Qualifying Accessor specs:
      // Belongs to an active organisation.
      const aliceQualifyingAccessor = await new UserBuilder(entityManager)
        .setName('Alice Qualifying Accessor')
        .addRole(ServiceRoleEnum.QUALIFYING_ACCESSOR, 'qaRole', healthOrg.id, healthOrgUnit.id)
        .save();

      // Ingrid Accessor specs:
      // Belongs to an active organisation.
      const ingridAccessor = await new UserBuilder(entityManager)
        .setName('Ingrid Accessor')
        .addRole(ServiceRoleEnum.ACCESSOR, 'accessorRole', healthOrg.id, healthOrgUnit.id)
        .save();

      // Innovators

      // John Innovator
      const johnInnovator = await new UserBuilder(entityManager)
        .setName('John Innovator')
        .addRole(ServiceRoleEnum.INNOVATOR, 'innovatorRole')
        // .addRole(ServiceRoleEnum.INNOVATOR)
        .save();

      // Innovation owned by johnInnovator with janeCollaborator as ACTIVE collaborator
      const johnInnovation = await (
        await new InnovationBuilder(entityManager).setOwner(johnInnovator.id).addSection('INNOVATION_DESCRIPTION')
      ).save();

      // Jane Innovator specs:
      // Collaborator on jonhInnovation
      const janeInnovator = await new UserBuilder(entityManager)
        .setName('Jane Innovator')
        .addRole(ServiceRoleEnum.INNOVATOR, 'innovatorRole')
        .save();

      // Add janeInnovator as a collaborator on johnInnovation
      const janeCollaborator = await new InnovationCollaboratorBuilder(entityManager)
        .setUser(janeInnovator.id)
        .setInnovation(johnInnovation.id)
        .save();

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

      const johnInnovationThreadByAlice = await (
        await new InnovationThreadBuilder(entityManager)
          .setAuthor(aliceQualifyingAccessor.id, aliceQualifyingAccessor.roles['qaRole']!.id)
          .setInnovation(johnInnovation.id)
          .addMessage(
            { id: aliceQualifyingAccessor.id, roleId: aliceQualifyingAccessor.roles['qaRole']!.id },
            'aliceMessage'
          )
      ).save();

      const johnInnovationThreadByIngrid = await (
        await new InnovationThreadBuilder(entityManager)
          .setAuthor(ingridAccessor.id, ingridAccessor.roles['accessorRole']!.id)
          .setInnovation(johnInnovation.id)
          .addMessage({ id: ingridAccessor.id, roleId: ingridAccessor.roles['accessorRole']!.id }, 'ingridMessage')
      ).save();

      const johnInnovationThreadByPaul = await (
        await new InnovationThreadBuilder(entityManager)
          .setAuthor(paulNeedsAssessor.id, paulNeedsAssessor.roles['assessmentRole']!.id)
          .setInnovation(johnInnovation.id)
          .addMessage(
            { id: paulNeedsAssessor.id, roleId: paulNeedsAssessor.roles['assessmentRole']!.id },
            'paulMessage'
          )
      ).save();

      const johnInnovationThreadByJane = await (
        await new InnovationThreadBuilder(entityManager)
          .setAuthor(janeInnovator.id, janeInnovator.roles['innovatorRole']!.id)
          .setInnovation(johnInnovation.id)
          .addMessage({ id: janeInnovator.id, roleId: janeInnovator.roles['innovatorRole']!.id }, 'janeMessage')
      ).save();

      const johnInnovationThreadByJohn = await (
        await new InnovationThreadBuilder(entityManager)
          .setAuthor(johnInnovator.id, johnInnovator.roles['innovatorRole']!.id)
          .setInnovation(johnInnovation.id)
          .addMessage({ id: johnInnovator.id, roleId: johnInnovator.roles['innovatorRole']!.id }, 'johnMessage')
      ).save();
      // Adam Innovator specs:
      // 1 innovation in status 'CREATED' with transfer in status 'PENDING' to external user.
      const adamInnovator = await new UserBuilder(entityManager)
        .setName('Adam Innovator')
        .addRole(ServiceRoleEnum.INNOVATOR, 'innovatorRole')
        .save();

      const adamInnovation = await new InnovationBuilder(entityManager)
        .setOwner(adamInnovator.id)
        .addTransfer('transfers@example.org')
        .save();

      return {
        users: {
          // Innovators
          johnInnovator: {
            ...johnInnovator,
            roles: { innovatorRole: johnInnovator.roles['innovatorRole']! },
            innovations: {
              johnInnovation: {
                ...johnInnovation,
                actions: {
                  actionByAlice: johnInnovationActionByAlice,
                  actionByPaul: johnInnovationActionByPaul
                },
                threads: {
                  threadByAliceQA: {
                    ...johnInnovationThreadByAlice,
                    messages: { aliceMessage: johnInnovationThreadByAlice.messages['aliceMessage']! }
                  },
                  threadByPaulNA: {
                    ...johnInnovationThreadByPaul,
                    messages: { paulMessage: johnInnovationThreadByPaul.messages['paulMessage']! }
                  },
                  threadByIngridAccessor: {
                    ...johnInnovationThreadByIngrid,
                    messages: { ingridMessage: johnInnovationThreadByIngrid.messages['ingridMessage']! }
                  },
                  threadByJaneCollaborator: {
                    ...johnInnovationThreadByJane,
                    messages: { janeMessage: johnInnovationThreadByJane.messages['janeMessage']! }
                  },
                  threadByJohn: {
                    ...johnInnovationThreadByJohn,
                    messages: { johnMessage: johnInnovationThreadByJohn.messages['johnMessage']! }
                  }
                },
                collaborators: { janeCollaborator: janeCollaborator }
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
          // Accessors
          aliceQualifyingAccessor: {
            ...aliceQualifyingAccessor,
            roles: { qaRole: aliceQualifyingAccessor.roles['qaRole']! },
            organisations: {
              healthOrg: {
                ...aliceQualifyingAccessor.organisations['Health Organisation']!,
                organisationUnits: {
                  healthOrgUnit:
                    aliceQualifyingAccessor.organisations['Health Organisation']!.organisationUnits['Health Org Unit']!
                }
              }
            }
          },
          ingridAccessor: {
            ...ingridAccessor,
            roles: { accessorRole: ingridAccessor.roles['accessorRole']! },
            organisations: {
              healthOrg: {
                ...ingridAccessor.organisations['Health Organisation']!,
                organisationUnits: {
                  healthOrgUnit:
                    ingridAccessor.organisations['Health Organisation']!.organisationUnits['Health Org Unit']!
                }
              }
            }
          },
          // Needs assessors
          paulNeedsAssessor: {
            ...paulNeedsAssessor,
            roles: { assessmentRole: paulNeedsAssessor.roles['assessmentRole']! }
          },
          // Admins
          allMighty: {
            ...allMighty,
            roles: { admin: allMighty.roles['adminRole']! }
          }
        }
      };
    });
    this.scenario = res;
    return res;
  }

  getScenario(): CompleteScenarioType {
    return this.scenario;
  }

  getIdentityMap(): ReadonlyMap<string, TestUserType> {
    if (!this.identityMap) {
      this.loadMaps();
    }
    return this.identityMap;
  }

  getUserMap(): ReadonlyMap<string, TestUserType> {
    if (!this.identityMap) {
      this.loadMaps();
    }
    return this.userMap;
  }

  loadMaps(): void {
    this.identityMap = new Map();
    this.userMap = new Map();
    for (const user of Object.values(this.scenario.users)) {
      this.identityMap.set(user.identityId, user);
      this.userMap.set(user.id, user);
    }
  }
}
