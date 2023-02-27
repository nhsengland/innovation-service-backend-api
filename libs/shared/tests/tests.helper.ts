import { container } from '../config/inversify.config';

import type { DataSource, EntityManager } from 'typeorm';
import { TestDataBuilder, UserBuilder } from '../builders';
import type { InnovationEntity, OrganisationEntity, OrganisationUnitEntity, OrganisationUnitUserEntity, OrganisationUserEntity, UserEntity } from '../entities';
import { AccessorOrganisationRoleEnum, InnovatorOrganisationRoleEnum, OrganisationTypeEnum, ServiceRoleEnum } from '../enums';
import { SQLConnectionServiceSymbol, SQLConnectionTestService, type SQLConnectionServiceType, type SQLConnectionTestServiceType } from '../services';
import type { AccessorDomainContextType, AdminDomainContextType, AssessmentDomainContextType, DomainContextType, InnovatorDomainContextType } from '../types';


export type TestDataType = {
  innovation: InnovationEntity;
  baseUsers: {
    admin: UserEntity;
    accessor: UserEntity;
    qualifyingAccessor: UserEntity;
    assessmentUser: UserEntity;
    assessmentUser2: UserEntity;
    innovator: UserEntity;
  };
  domainContexts: {
    admin: AdminDomainContextType,
    accessor: AccessorDomainContextType,
    qualifyingAccessor: AccessorDomainContextType,
    assessmentUser: AssessmentDomainContextType,
    assessmentUser2: AssessmentDomainContextType,
    innovator: InnovatorDomainContextType
  }
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
}

// In jest the static classes are not shared between test suites so it ended up not making much difference to use static
export class TestsHelper {

  static sqlConnection: DataSource;
  static sampleData: TestDataType;

  static {
    container.rebind<SQLConnectionTestServiceType>(SQLConnectionServiceSymbol).to(SQLConnectionTestService).inSingletonScope();
    // Comment this if not using global setup / teardown
    this.sampleData = ((global as any).sampleData); // This is set in jest.setup.ts and is used to share data between tests)
  }

  static async init(): Promise<void> {
    const sqlService = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol);
    await sqlService.init();
    this.sqlConnection = sqlService.getConnection();
    // Uncomment this if not using global setup / teardown. It also requires clearing data in the afterAll hook
    // this.sampleData = await this.createSampleData();
  }

  static async cleanUp(): Promise<void> {
    const query = TestsHelper.sqlConnection.createQueryRunner();
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

      const innovatorOrganisation = await helper.createOrganisation().ofType(OrganisationTypeEnum.INNOVATOR).build(entityManager);
      const accessorOrganisation = await helper.createOrganisation().ofType(OrganisationTypeEnum.ACCESSOR).build(entityManager);
      const organisationUnit = await helper.createOrganisationUnit().addToOrganisation(accessorOrganisation).build(entityManager);

      const admin = (await new UserBuilder(entityManager).addRole(ServiceRoleEnum.ADMIN).save()).getUser();
      const innovator = (await new UserBuilder(entityManager).addRole(ServiceRoleEnum.INNOVATOR, innovatorOrganisation).save()).getUser();
      const accessor = (await new UserBuilder(entityManager).addRole(ServiceRoleEnum.ACCESSOR, accessorOrganisation, organisationUnit).save()).getUser();
      const qualifyingAccessor = (await new UserBuilder(entityManager).addRole(ServiceRoleEnum.QUALIFYING_ACCESSOR, accessorOrganisation, organisationUnit).save()).getUser();
      const assessmentUser = (await new UserBuilder(entityManager).addRole(ServiceRoleEnum.ASSESSMENT).save()).getUser();
      const assessmentUser2 = (await new UserBuilder(entityManager).addRole(ServiceRoleEnum.ASSESSMENT).save()).getUser();

      const innovatorOrgUser = await helper.addUserToOrganisation(innovator, innovatorOrganisation, InnovatorOrganisationRoleEnum.INNOVATOR_OWNER, entityManager);
      const accessorOrgU = await helper.addUserToOrganisation(accessor, accessorOrganisation, AccessorOrganisationRoleEnum.ACCESSOR, entityManager);
      const qualifyingAccessorOrgU = await helper.addUserToOrganisation(qualifyingAccessor, accessorOrganisation, AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR, entityManager);

      const accessorOrgUnitUser = await helper.addUserToOrganisationUnit(accessorOrgU, organisationUnit, entityManager);
      const qaOrgUnitUser = await helper.addUserToOrganisationUnit(qualifyingAccessorOrgU, organisationUnit, entityManager);

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
            role: accessorOrgU.role as AccessorOrganisationRoleEnum,
            isShadow: false,
            size: accessorOrganisation.size,
            organisationUnit: {
              id: organisationUnit.id,
              name: organisationUnit.name,
              acronym: organisationUnit.acronym,
              organisationUnitUser: {
                id: accessorOrgUnitUser.id,
              }
            }
          },
          currentRole: {
            id: accessor.serviceRoles[0]!.id,
            role: ServiceRoleEnum.ACCESSOR
          },
        },
        qualifyingAccessor: {
          id: qualifyingAccessor.id,
          identityId: qualifyingAccessor.identityId,
          organisation: {
            id: accessorOrganisation.id,
            name: accessorOrganisation.name,
            acronym: accessorOrganisation.acronym,
            role: qualifyingAccessorOrgU.role as AccessorOrganisationRoleEnum,
            isShadow: false,
            size: accessorOrganisation.size,
            organisationUnit: {
              id: organisationUnit.id,
              name: organisationUnit.name,
              acronym: organisationUnit.acronym,
              organisationUnitUser: {
                id: qaOrgUnitUser.id,
              }
            }
          },
          currentRole: {
            id: qualifyingAccessor.serviceRoles[0]!.id,
            role: ServiceRoleEnum.QUALIFYING_ACCESSOR
          },
        },
        assessmentUser: {
          id: assessmentUser.id,
          identityId: assessmentUser.identityId,
          currentRole: {
            id: assessmentUser.serviceRoles[0]!.id,
            role: ServiceRoleEnum.ASSESSMENT
          },
        },
        assessmentUser2: {
          id: assessmentUser2.id,
          identityId: assessmentUser2.identityId,
          currentRole: {
            id: assessmentUser2.serviceRoles[0]!.id,
            role: ServiceRoleEnum.ASSESSMENT
          },
        },
        innovator: {
          id: innovator.id,
          identityId: innovator.identityId,
          organisation: {
            id: innovatorOrganisation.id,
            name: innovatorOrganisation.name,
            acronym: innovatorOrganisation.acronym,
            role: innovatorOrgUser.role as InnovatorOrganisationRoleEnum,
            isShadow: true,
            size: innovatorOrganisation.size,
          },
          currentRole: {
            id: innovator.serviceRoles[0]!.id,
            role: ServiceRoleEnum.INNOVATOR
          },
        }
      };
      //#endregion

      const innovation = await helper.createInnovation()
        .setOwner(innovator)
        .withSupportsAndAccessors(organisationUnit, [accessorOrgUnitUser])
        .withActions(domainContexts.accessor)
        .withSections()
        .withAssessments(assessmentUser)
        .build(entityManager);

      return {
        innovation,
        baseUsers: {
          accessor,
          qualifyingAccessor,
          assessmentUser,
          assessmentUser2,
          innovator,
          admin
        },
        domainContexts: domainContexts,
        organisationUsers: {
          innovator: innovatorOrgUser,
          accessor: accessorOrgU,
          qualifyingAccessor: qualifyingAccessorOrgU,
        },
        organisationUnitUsers: {
          accessor: accessorOrgUnitUser,
          qualifyingAccessor: qaOrgUnitUser,
        },
        organisation: {
          innovator: innovatorOrganisation,
          accessor: accessorOrganisation,
        },
        organisationUnit: {
          accessor: organisationUnit,
        },
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
    const em = TestsHelper.sqlConnection.createQueryRunner().manager;
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

// export default TestsHelper;
