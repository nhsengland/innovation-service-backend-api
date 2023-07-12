import type { DataSource, EntityManager } from 'typeorm';

import { TestDataBuilder, UserBuilder } from '../builders';
import { container } from '../config/inversify.config';

import type {
  InnovationEntity,
  OrganisationEntity,
  OrganisationUnitEntity,
  OrganisationUnitUserEntity,
  OrganisationUserEntity,
  UserEntity
} from '../entities';
import type { InnovationCollaboratorEntity } from '../entities/innovation/innovation-collaborator.entity';
import {
  AccessorOrganisationRoleEnum,
  InnovationCollaboratorStatusEnum,
  InnovatorOrganisationRoleEnum,
  OrganisationTypeEnum,
  ServiceRoleEnum
} from '../enums';
import type { SQLConnectionService } from '../services/storage/sql-connection.service';
import SHARED_SYMBOLS from '../services/symbols';
import type {
  AccessorDomainContextType,
  AdminDomainContextType,
  AssessmentDomainContextType,
  DomainContextType,
  InnovatorDomainContextType
} from '../types';

export type TestDataType = {
  innovation: InnovationEntity;
  innovationWithCollaborators: InnovationEntity;
  baseUsers: {
    admin: UserEntity;
    accessor: UserEntity;
    qualifyingAccessor: UserEntity;
    assessmentUser: UserEntity;
    assessmentUser2: UserEntity;
    innovator: UserEntity;
    innovator2: UserEntity;
    innovator3: UserEntity;
  };
  domainContexts: {
    admin: AdminDomainContextType;
    accessor: AccessorDomainContextType;
    qualifyingAccessor: AccessorDomainContextType;
    assessmentUser: AssessmentDomainContextType;
    assessmentUser2: AssessmentDomainContextType;
    innovator: InnovatorDomainContextType;
    innovator2: InnovatorDomainContextType;
    innovator3: InnovatorDomainContextType;
  };
  organisationUsers: {
    innovator: OrganisationUserEntity;
    accessor: OrganisationUserEntity;
    qualifyingAccessor: OrganisationUserEntity;
  };
  organisationUnitUsers: {
    accessor: OrganisationUnitUserEntity;
    qualifyingAccessor: OrganisationUnitUserEntity;
  };
  organisation: {
    innovator: OrganisationEntity;
    accessor: OrganisationEntity;
  };
  organisationUnit: {
    accessor: OrganisationUnitEntity;
  };
  collaborators: {
    collaboratorPending: InnovationCollaboratorEntity;
    collaboratorActive: InnovationCollaboratorEntity;
    collaboratorExpired: InnovationCollaboratorEntity;
  };
};

// In jest the static classes are not shared between test suites so it ended up not making much difference to use static
export class TestsLegacyHelper {
  static sqlConnection: DataSource;
  static sampleData: TestDataType;

  static {
    // Comment this if not using global setup / teardown
    this.sampleData = (global as any).sampleData; // This is set in jest.setup.ts and is used to share data between tests)
  }

  static async init(): Promise<void> {
    const sqlService = container.get<SQLConnectionService>(SHARED_SYMBOLS.SQLConnectionService);

    this.sqlConnection = sqlService.getConnection();

    while (!this.sqlConnection.isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    // Uncomment this if not using global setup / teardown. It also requires clearing data in the afterAll hook
    // this.sampleData = await this.createSampleData();
  }

  static async cleanUp(): Promise<void> {
    const query = TestsLegacyHelper.sqlConnection.createQueryRunner();
    await query.query(`
      IF OBJECTPROPERTY(OBJECT_ID('EmpSalary'), 'TableTemporalType') = 2 ALTER TABLE EmpSalary SET (SYSTEM_VERSIONING = OFF)
      EXEC sp_MSForEachTable 'IF OBJECTPROPERTY(OBJECT_ID(''?''), ''TableTemporalType'') = 2 ALTER TABLE ? SET (SYSTEM_VERSIONING = OFF)';
      EXEC sp_MSForEachTable "ALTER TABLE ? NOCHECK CONSTRAINT all"
      EXEC sp_MSForEachTable "SET QUOTED_IDENTIFIER ON; DELETE FROM ?"
      EXEC sp_MSForEachTable "ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all"
      EXEC sp_MSForEachTable 'IF OBJECTPROPERTY(OBJECT_ID(''?''), ''TableTemporalType'') = 2 ALTER TABLE ? SET (SYSTEM_VERSIONING = ON)';
    `);
  }

  static async createSampleData(): Promise<TestDataType> {
    const retVal = await this.sqlConnection.transaction(async (entityManager: EntityManager) => {
      const helper = new TestDataBuilder();

      const innovatorOrganisation = await helper
        .createOrganisation()
        .ofType(OrganisationTypeEnum.INNOVATOR)
        .build(entityManager);
      const innovator2Organisation = await helper
        .createOrganisation()
        .ofType(OrganisationTypeEnum.INNOVATOR)
        .build(entityManager);
      const innovator3Organisation = await helper
        .createOrganisation()
        .ofType(OrganisationTypeEnum.INNOVATOR)
        .build(entityManager);
      const accessorOrganisation = await helper
        .createOrganisation()
        .ofType(OrganisationTypeEnum.ACCESSOR)
        .build(entityManager);
      const organisationUnit = await helper
        .createOrganisationUnit()
        .addToOrganisation(accessorOrganisation)
        .build(entityManager);

      const admin = (await new UserBuilder(entityManager).addRole(ServiceRoleEnum.ADMIN).save()).getUser();
      const innovator = (
        await new UserBuilder(entityManager).addRole(ServiceRoleEnum.INNOVATOR, innovatorOrganisation).save()
      ).getUser();
      const innovator2 = (
        await new UserBuilder(entityManager).addRole(ServiceRoleEnum.INNOVATOR, innovator2Organisation).save()
      ).getUser();
      const innovator3 = (
        await new UserBuilder(entityManager).addRole(ServiceRoleEnum.INNOVATOR, innovator3Organisation).save()
      ).getUser();
      const accessor = (
        await new UserBuilder(entityManager)
          .addRole(ServiceRoleEnum.ACCESSOR, accessorOrganisation, organisationUnit)
          .save()
      ).getUser();
      const qualifyingAccessor = (
        await new UserBuilder(entityManager)
          .addRole(ServiceRoleEnum.QUALIFYING_ACCESSOR, accessorOrganisation, organisationUnit)
          .save()
      ).getUser();
      const assessmentUser = (
        await new UserBuilder(entityManager).addRole(ServiceRoleEnum.ASSESSMENT).save()
      ).getUser();
      const assessmentUser2 = (
        await new UserBuilder(entityManager).addRole(ServiceRoleEnum.ASSESSMENT).save()
      ).getUser();

      const innovatorOrgUser = await helper.addUserToOrganisation(
        innovator,
        innovatorOrganisation,
        InnovatorOrganisationRoleEnum.INNOVATOR_OWNER,
        entityManager
      );
      const innovator2OrgUser = await helper.addUserToOrganisation(
        innovator2,
        innovator2Organisation,
        InnovatorOrganisationRoleEnum.INNOVATOR_OWNER,
        entityManager
      );
      const innovator3OrgUser = await helper.addUserToOrganisation(
        innovator3,
        innovator3Organisation,
        InnovatorOrganisationRoleEnum.INNOVATOR_OWNER,
        entityManager
      );
      const accessorOrgU = await helper.addUserToOrganisation(
        accessor,
        accessorOrganisation,
        AccessorOrganisationRoleEnum.ACCESSOR,
        entityManager
      );
      const qualifyingAccessorOrgU = await helper.addUserToOrganisation(
        qualifyingAccessor,
        accessorOrganisation,
        AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR,
        entityManager
      );

      const accessorOrgUnitUser = await helper.addUserToOrganisationUnit(accessorOrgU, organisationUnit, entityManager);
      const qaOrgUnitUser = await helper.addUserToOrganisationUnit(
        qualifyingAccessorOrgU,
        organisationUnit,
        entityManager
      );

      //#region DomainContexts
      const domainContexts: TestDataType['domainContexts'] = {
        admin: {
          id: admin.id,
          identityId: admin.identityId,
          currentRole: {
            id: admin.serviceRoles[0]!.id,
            role: ServiceRoleEnum.ADMIN
          }
        },
        accessor: {
          id: accessor.id,
          identityId: accessor.identityId,
          organisation: {
            id: accessorOrganisation.id,
            name: accessorOrganisation.name,
            acronym: accessorOrganisation.acronym,
            organisationUnit: {
              id: organisationUnit.id,
              name: organisationUnit.name,
              acronym: organisationUnit.acronym
            }
          },
          currentRole: {
            id: accessor.serviceRoles[0]!.id,
            role: ServiceRoleEnum.ACCESSOR
          }
        },
        qualifyingAccessor: {
          id: qualifyingAccessor.id,
          identityId: qualifyingAccessor.identityId,
          organisation: {
            id: accessorOrganisation.id,
            name: accessorOrganisation.name,
            acronym: accessorOrganisation.acronym,
            organisationUnit: {
              id: organisationUnit.id,
              name: organisationUnit.name,
              acronym: organisationUnit.acronym
            }
          },
          currentRole: {
            id: qualifyingAccessor.serviceRoles[0]!.id,
            role: ServiceRoleEnum.QUALIFYING_ACCESSOR
          }
        },
        assessmentUser: {
          id: assessmentUser.id,
          identityId: assessmentUser.identityId,
          currentRole: {
            id: assessmentUser.serviceRoles[0]!.id,
            role: ServiceRoleEnum.ASSESSMENT
          }
        },
        assessmentUser2: {
          id: assessmentUser2.id,
          identityId: assessmentUser2.identityId,
          currentRole: {
            id: assessmentUser2.serviceRoles[0]!.id,
            role: ServiceRoleEnum.ASSESSMENT
          }
        },
        innovator: {
          id: innovator.id,
          identityId: innovator.identityId,
          organisation: {
            id: innovatorOrganisation.id,
            name: innovatorOrganisation.name,
            acronym: innovatorOrganisation.acronym
          },
          currentRole: {
            id: innovator.serviceRoles[0]!.id,
            role: ServiceRoleEnum.INNOVATOR
          }
        },
        innovator2: {
          id: innovator2.id,
          identityId: innovator2.identityId,
          organisation: {
            id: innovator2Organisation.id,
            name: innovator2Organisation.name,
            acronym: innovator2Organisation.acronym
          },
          currentRole: {
            id: innovator2.serviceRoles[0]!.id,
            role: ServiceRoleEnum.INNOVATOR
          }
        },
        innovator3: {
          id: innovator3.id,
          identityId: innovator3.identityId,
          organisation: {
            id: innovator3Organisation.id,
            name: innovator3Organisation.name,
            acronym: innovator3Organisation.acronym
          },
          currentRole: {
            id: innovator3.serviceRoles[0]!.id,
            role: ServiceRoleEnum.INNOVATOR
          }
        }
      };
      //#endregion

      const innovation = await helper
        .createInnovation()
        .setOwner(innovator)
        .withSupportsAndAccessors(organisationUnit, [accessorOrgUnitUser])
        .withActions(domainContexts.accessor)
        .withSections()
        .withAssessments(assessmentUser)
        .build(entityManager);

      const innovationWithCollaborators = await helper.createInnovation().setOwner(innovator).build(entityManager);

      // Pending, Active and Expired collaborator invites
      const collaboratorPending = await helper
        .createCollaborator(domainContexts.innovator, innovationWithCollaborators)
        .build(entityManager);
      const collaboratorActive = await TestsLegacyHelper.TestDataBuilder.createCollaborator(
        domainContexts.innovator,
        innovationWithCollaborators
      )
        .setStatus(InnovationCollaboratorStatusEnum.ACTIVE)
        .build(entityManager);
      const collaboratorExpired = await TestsLegacyHelper.TestDataBuilder.createCollaborator(
        domainContexts.innovator,
        innovationWithCollaborators
      )
        .setUser(innovator2)
        .setEmail('innovator2@gmail.com')
        .setInvitedAt(new Date(Date.now() - 1000 * 60 * 60 * 24 * 31))
        .build(entityManager);

      return {
        innovation,
        innovationWithCollaborators,
        baseUsers: {
          accessor,
          qualifyingAccessor,
          assessmentUser,
          assessmentUser2,
          innovator,
          innovator2,
          innovator3,
          admin
        },
        domainContexts: domainContexts,
        organisationUsers: {
          innovator: innovatorOrgUser,
          innovator2: innovator2OrgUser,
          innovator3: innovator3OrgUser,
          accessor: accessorOrgU,
          qualifyingAccessor: qualifyingAccessorOrgU
        },
        organisationUnitUsers: {
          accessor: accessorOrgUnitUser,
          qualifyingAccessor: qaOrgUnitUser
        },
        organisation: {
          innovator: innovatorOrganisation,
          innovator2: innovator2Organisation,
          innovator3: innovator3Organisation,
          accessor: accessorOrganisation
        },
        organisationUnit: {
          accessor: organisationUnit
        },
        collaborators: {
          collaboratorPending,
          collaboratorActive,
          collaboratorExpired
        }
      };
    });

    this.sampleData = retVal as any; // TODO: Solve these any's!!!
    return this.sampleData;
  }

  public static getUser(userType: ServiceRoleEnum): [UserEntity, DomainContextType] {
    let user: UserEntity;
    let context: DomainContextType;

    switch (userType) {
      case ServiceRoleEnum.ADMIN:
        user = this.sampleData.baseUsers.admin;
        context = this.sampleData.domainContexts.admin;
        break;
      case ServiceRoleEnum.ACCESSOR:
        user = this.sampleData.baseUsers.accessor;
        context = this.sampleData.domainContexts.accessor;
        break;
      case ServiceRoleEnum.ASSESSMENT:
        user = this.sampleData.baseUsers.assessmentUser;
        context = this.sampleData.domainContexts.assessmentUser;
        break;
      case ServiceRoleEnum.INNOVATOR:
        user = this.sampleData.baseUsers.innovator;
        context = this.sampleData.domainContexts.innovator;
        break;
      case ServiceRoleEnum.QUALIFYING_ACCESSOR:
        user = this.sampleData.baseUsers.qualifyingAccessor;
        context = this.sampleData.domainContexts.qualifyingAccessor;
        break;
      default:
        const unknownType: never = userType;
        throw Error(`${unknownType} is not supported.`);
    }

    return [user, context];
  }

  public static get TestDataBuilder(): TestDataBuilder {
    return new TestDataBuilder();
  }

  /**
   * gets a new entity manager for each test and starts a transaction
   *
   * A new query runner is required for each test suite in order to support concurrent tests since
   * the query runner is a real database connection and doesn't use the connection pooling. This causes
   * concurrency issues when running transactions.
   *
   * More information in: https://typeorm.biunav.com/en/connection.html#what-is-connection
   *
   * Currently there's still issues with query runner and multiple paralel tests, run with --runInBand
   *
   * @returns entity manager to be used in the tests
   */
  public static async getQueryRunnerEntityManager(): Promise<EntityManager> {
    const em = TestsLegacyHelper.sqlConnection.createQueryRunner().manager;
    await em.queryRunner?.startTransaction();
    return em;
  }

  /**
   * rollback and releases the queryRunner so that the connection can be reused
   * @param em entity manager whose query runner is going to be released
   */
  public static async releaseQueryRunnerEntityManager(em: EntityManager): Promise<void> {
    await em.queryRunner?.rollbackTransaction();
    await em.queryRunner?.release();
  }
}
