/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { DataSource } from 'typeorm';

import { InnovationCollaboratorStatusEnum, InnovationSupportStatusEnum } from '../../enums/innovation.enums';
import { ServiceRoleEnum } from '../../enums/user.enums';
import { InnovationActionBuilder } from '../builders/innovation-action.builder';
import { InnovationCollaboratorBuilder } from '../builders/innovation-collaborator.builder';
import { InnovationSupportBuilder } from '../builders/innovation-support.builder';
import { InnovationThreadBuilder } from '../builders/innovation-thread.builder';
import { InnovationBuilder } from '../builders/innovation.builder';
import { OrganisationUnitBuilder } from '../builders/organisation-unit.builder';
import { OrganisationBuilder } from '../builders/organisation.builder';
import { TestUserType, UserBuilder } from '../builders/user.builder';
import { InnovationAssessmentBuilder } from '../builders/innovation-assessment.builder';

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

      const seanNeedsAssessor = await new UserBuilder(entityManager)
        .setName('Paul Needs Assessor')
        .addRole(ServiceRoleEnum.ASSESSMENT, 'assessmentRole')
        .save();

      // Admin
      const allMighty = await new UserBuilder(entityManager)
        .setName('All Mighty')
        .addRole(ServiceRoleEnum.ADMIN, 'adminRole')
        .save();

      // Organisations
      // Health Organisation has two units: Health Org Unit and Health Org AI Unit
      const healthOrg = await new OrganisationBuilder(entityManager).setName('Health Organisation').save();
      const healthOrgUnit = await new OrganisationUnitBuilder(entityManager)
        .addToOrganisation(healthOrg.id)
        .setName('Health Org Unit')
        .save();
      const healthOrgAiUnit = await new OrganisationUnitBuilder(entityManager)
        .addToOrganisation(healthOrg.id)
        .setName('Health Org AI Unit')
        .save();

      // MedTech Organisation has one unit: MedTech Org Unit
      const medTechOrg = await new OrganisationBuilder(entityManager).setName('MedTech Organisation').save();
      const medTechOrgUnit = await new OrganisationUnitBuilder(entityManager)
        .addToOrganisation(medTechOrg.id)
        .setName('MedTech Org Unit')
        .save();

      // QAs and Accessors

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

      // Jaimie Madrox Accessor specs:
      // Belongs to two units in Health Organisation.
      const jamieMadroxAccessor = await new UserBuilder(entityManager)
        .setName('Jamie Madrox')
        .addRole(ServiceRoleEnum.ACCESSOR, 'healthAccessorRole', healthOrg.id, healthOrgUnit.id)
        .addRole(ServiceRoleEnum.ACCESSOR, 'aiRole', healthOrg.id, healthOrgAiUnit.id)
        .save();

      // Sam accessor specs:
      // Belongs to the medtech organisation.
      const samAccessor = await new UserBuilder(entityManager)
        .setName('Sam Accessor')
        .addRole(ServiceRoleEnum.ACCESSOR, 'accessorRole', medTechOrg.id, medTechOrgUnit.id)
        .save();

      // Sarah Qualifying Accessor specs:
      // Belongs to an active organisation.
      const sarahQualifyingAccessor = await new UserBuilder(entityManager)
        .setName('Sarah Qualifying Accessor')
        .addRole(ServiceRoleEnum.QUALIFYING_ACCESSOR, 'qaRole', healthOrg.id, healthOrgAiUnit.id)
        .save();

      // Bart Qualifying Accessor specs:
      // Belongs to an active organisation.
      const bartQualifyingAccessor = await new UserBuilder(entityManager)
        .setName('Bart Qualifying Accessor')
        .addRole(ServiceRoleEnum.QUALIFYING_ACCESSOR, 'qaRole', healthOrg.id, healthOrgAiUnit.id)
        .save();

      // Innovators

      // John Innovator
      const johnInnovator = await new UserBuilder(entityManager)
        .setName('John Innovator')
        .addRole(ServiceRoleEnum.INNOVATOR, 'innovatorRole')
        // .addRole(ServiceRoleEnum.INNOVATOR)
        .save();

      // Innovation owned by johnInnovator with janeCollaborator as ACTIVE collaborator
      // This innovation is shared with medtechOrg and healthOrg
      const johnInnovation = await (
        await new InnovationBuilder(entityManager)
          .setOwner(johnInnovator.id)
          .shareWith([healthOrg, medTechOrg])
          .addSection('INNOVATION_DESCRIPTION')
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
        .setEmail(janeInnovator.email)
        .setInnovation(johnInnovation.id)
        .save();

      // Add elisaPendingCollaborator as a pending collaborator on johnInnovation
      const elisaPendingCollaborator = await new InnovationCollaboratorBuilder(entityManager)
        .setInnovation(johnInnovation.id)
        .setStatus(InnovationCollaboratorStatusEnum.PENDING)
        .save();

      // assessment on johnInnovation assigned to Paul (NA)
      const johnInnovationAssessmentByPaul = await new InnovationAssessmentBuilder(entityManager)
        .setInnovation(johnInnovation.id)
        .setNeedsAssessor(paulNeedsAssessor.id)
        .save();

      // action on johnInnovation created by Alice (QA)
      const johnInnovationActionByAlice = await new InnovationActionBuilder(entityManager)
        .setCreatedBy(aliceQualifyingAccessor.id)
        .setCreatedByUserRole(aliceQualifyingAccessor.roles['qaRole']!.id)
        .setUpdatedBy(aliceQualifyingAccessor.id)
        .setUpdatedByUserRole(aliceQualifyingAccessor.roles['qaRole']!.id)
        .setInnovationSection(johnInnovation.sections.get('INNOVATION_DESCRIPTION')!.id)
        .save();

      const johnInnovationSupportByHealthOrgUnit = await new InnovationSupportBuilder(entityManager)
        .setStatus(InnovationSupportStatusEnum.ENGAGING)
        .setInnovation(johnInnovation.id)
        .setOrganisationUnit(healthOrgUnit.id)
        .setAccessors([aliceQualifyingAccessor, jamieMadroxAccessor])
        .save();

      const johnInnovationSupportByMedTechOrgUnit = await new InnovationSupportBuilder(entityManager)
        .setStatus(InnovationSupportStatusEnum.ENGAGING)
        .setInnovation(johnInnovation.id)
        .setOrganisationUnit(medTechOrgUnit.id)
        .setAccessors([samAccessor])
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
        await (
          await new InnovationThreadBuilder(entityManager)
            .setAuthor(paulNeedsAssessor.id, paulNeedsAssessor.roles['assessmentRole']!.id)
            .setInnovation(johnInnovation.id)
            .addMessage(
              { id: paulNeedsAssessor.id, roleId: paulNeedsAssessor.roles['assessmentRole']!.id },
              'paulMessage'
            )
        ).addMessage({ id: johnInnovator.id, roleId: johnInnovator.roles['innovatorRole']!.id }, 'johnMessage')
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
      // 1 innovation in status 'CREATED' with transfer in status 'PENDING' to external user. The innovation is shared with
      // healthOrg
      const adamInnovator = await new UserBuilder(entityManager)
        .setName('Adam Innovator')
        .addRole(ServiceRoleEnum.INNOVATOR, 'innovatorRole')
        .save();

      const adamInnovation = await new InnovationBuilder(entityManager)
        .setOwner(adamInnovator.id)
        .addTransfer('transfers@example.org')
        .shareWith([healthOrg])
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
                supports: {
                  supportByHealthOrgUnit: {
                    ...johnInnovationSupportByHealthOrgUnit,
                    accessors: [aliceQualifyingAccessor, jamieMadroxAccessor]
                  },
                  supportByMedTechOrgUnit: { ...johnInnovationSupportByMedTechOrgUnit, accessors: [samAccessor] }
                },
                assessment: johnInnovationAssessmentByPaul,
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
                    messages: {
                      paulMessage: johnInnovationThreadByPaul.messages['paulMessage']!,
                      johnMessage: johnInnovationThreadByPaul.messages['johnMessage']!
                    }
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
                collaborators: {
                  janeCollaborator: janeCollaborator,
                  elisaPendingCollaborator: elisaPendingCollaborator
                }
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
          jamieMadroxAccessor: {
            ...jamieMadroxAccessor,
            roles: {
              healthAccessorRole: jamieMadroxAccessor.roles['healthAccessorRole']!,
              aiRole: jamieMadroxAccessor.roles['aiRole']!
            },
            organisations: {
              healthOrg: {
                ...jamieMadroxAccessor.organisations['Health Organisation']!,
                organisationUnits: {
                  healthOrgUnit:
                    jamieMadroxAccessor.organisations['Health Organisation']!.organisationUnits['Health Org Unit']!,
                  healthOrgAiUnit:
                    jamieMadroxAccessor.organisations['Health Organisation']!.organisationUnits['Health Org AI Unit']!
                }
              }
            }
          },
          samAccessor: {
            ...samAccessor,
            roles: { accessorRole: samAccessor.roles['accessorRole']! },
            organisations: {
              medTechOrg: {
                ...samAccessor.organisations['MedTech Organisation']!,
                organisationUnits: {
                  medTechOrgUnit:
                    samAccessor.organisations['MedTech Organisation']!.organisationUnits['MedTech Org Unit']!
                }
              }
            }
          },
          sarahQualifyingAccessor: {
            ...sarahQualifyingAccessor,
            roles: { qaRole: sarahQualifyingAccessor.roles['qaRole']! },
            organisations: {
              healthOrg: {
                ...sarahQualifyingAccessor.organisations['Health Organisation']!,
                organisationUnits: {
                  healthOrgAiUnit:
                    sarahQualifyingAccessor.organisations['Health Organisation']!.organisationUnits[
                      'Health Org AI Unit'
                    ]!
                }
              }
            }
          },
          bartQualifyingAccessor: {
            ...bartQualifyingAccessor,
            roles: { qaRole: bartQualifyingAccessor.roles['qaRole']! },
            organisations: {
              healthOrg: {
                ...bartQualifyingAccessor.organisations['Health Organisation']!,
                organisationUnits: {
                  healthOrgAiUnit:
                    bartQualifyingAccessor.organisations['Health Organisation']!.organisationUnits[
                      'Health Org AI Unit'
                    ]!
                }
              }
            }
          },
          // Needs assessors
          paulNeedsAssessor: {
            ...paulNeedsAssessor,
            roles: { assessmentRole: paulNeedsAssessor.roles['assessmentRole']! }
          },
          seanNeedsAssessor: {
            ...seanNeedsAssessor,
            roles: { assessmentRole: seanNeedsAssessor.roles['assessmentRole']! }
          },
          // Admins
          allMighty: {
            ...allMighty,
            roles: { admin: allMighty.roles['adminRole']! }
          }
        },
        organisations: {
          healthOrg: {
            ...healthOrg,
            organisationUnits: {
              healthOrgUnit: healthOrgUnit,
              healthOrgAiUnit: healthOrgAiUnit
            }
          },
          medTechOrg: {
            ...medTechOrg,
            organisationUnits: {
              medTechOrgUnit: medTechOrgUnit
            }
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
