import { container } from '../config/inversify.config';

import type { DataSource, EntityManager } from 'typeorm';
import { TestDataBuilder } from '../builders';
import type { InnovationEntity, OrganisationEntity, OrganisationUnitEntity, OrganisationUnitUserEntity, OrganisationUserEntity, UserEntity } from '../entities';
import { AccessorOrganisationRoleEnum, InnovatorOrganisationRoleEnum, OrganisationTypeEnum, UserTypeEnum } from '../enums';
import { SQLConnectionServiceSymbol, SQLConnectionTestService, type SQLConnectionServiceType, type SQLConnectionTestServiceType } from '../services';


export type TestDataType = {
  innovation: InnovationEntity;
  baseUsers: { 
    accessor: UserEntity; 
    qualifyingAccessor: UserEntity; 
    assessmentUser: UserEntity; 
    innovator: UserEntity; 
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
    accessor: 
    OrganisationUnitEntity; 
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
    const helper = new TestDataBuilder();
   
    const retVal = await this.sqlConnection.transaction(async (entityManager: EntityManager) => {
      const innovator = await helper.createUser().ofType(UserTypeEnum.INNOVATOR).build(entityManager);
      const accessor = await helper.createUser().ofType(UserTypeEnum.ACCESSOR).build(entityManager);
      const qualifyingAccessor = await helper.createUser().ofType(UserTypeEnum.ACCESSOR).build(entityManager);
      const assessmentUser = await helper.createUser().ofType(UserTypeEnum.ASSESSMENT).build(entityManager);
  
      const innovatorOrganisation = await helper.createOrganisation().ofType(OrganisationTypeEnum.INNOVATOR).build(entityManager);
      const accessorOrganisation = await helper.createOrganisation().ofType(OrganisationTypeEnum.ACCESSOR).build(entityManager);
  
      const innovatorOrgUser = await helper.addUserToOrganisation(innovator, innovatorOrganisation, InnovatorOrganisationRoleEnum.INNOVATOR_OWNER, entityManager);
      const accessorOrgU = await helper.addUserToOrganisation(accessor, accessorOrganisation, AccessorOrganisationRoleEnum.ACCESSOR, entityManager);
      const qualifyingAccessorOrgU = await helper.addUserToOrganisation(qualifyingAccessor, accessorOrganisation, AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR, entityManager);
  
      const organisationUnit = await helper.createOrganisationUnit().addToOrganisation(accessorOrganisation).build(entityManager);
  
      const accessorOrgUnitUser = await helper.addUserToOrganisationUnit(accessorOrgU, organisationUnit, entityManager);
      const qaOrgUnitUser = await helper.addUserToOrganisationUnit(qualifyingAccessorOrgU, organisationUnit, entityManager);
  
      const innovation = await helper.createInnovation()
        .setOwner(innovator)
        .withActions()
        .withSupportsAndAccessors(organisationUnit, [accessorOrgUnitUser])
        .withSections()
        .withAssessments(assessmentUser)
        .build(entityManager);


      return {
        innovation,
        baseUsers: {
          accessor,
          qualifyingAccessor,
          assessmentUser,
          innovator,
        },
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


    this.sampleData = retVal;
    return retVal;
  }

  
  public static get TestDataBuilder() : TestDataBuilder {
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

export default TestsHelper;
