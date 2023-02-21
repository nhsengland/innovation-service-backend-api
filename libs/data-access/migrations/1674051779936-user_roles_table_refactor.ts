import type { MigrationInterface, QueryRunner } from 'typeorm'

export class userRolesTableRefactor1674051779936 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

      await queryRunner.query(`ALTER TABLE "user_role" DROP CONSTRAINT "fk_user_role_role_role_id"`)

      await queryRunner.query(`ALTER TABLE "user_role" DROP CONSTRAINT "idx_user_role_user_id_role_id"`)

      await queryRunner.query(`
        ALTER TABLE user_role ADD role varchar(50) NULL;
      `)

      await queryRunner.query(`
        ALTER TABLE user_role ADD organisation_id uniqueidentifier NULL;
      `)

      await queryRunner.query(`
        ALTER TABLE user_role ADD organisation_unit_id uniqueidentifier NULL;
      `)

      await queryRunner.query(`
        UPDATE 
          user_role SET
           role = r.name
        from user_role ur
        inner join role r on r.id = ur.role_id;
      `)

      await queryRunner.query(`
        ALTER TABLE user_role DROP COLUMN role_id;
      `)

      
      await queryRunner.query(`ALTER TABLE "user_role" ALTER COLUMN role varchar(50) NOT NULL;`);
      await queryRunner.query(`ALTER TABLE "user_role" ADD CONSTRAINT "idx_user_role_user_id_role_organisation_unit" UNIQUE ("user_id", "role","organisation_id", "organisation_unit_id")`);
      await queryRunner.query(`ALTER TABLE "user_role" ADD CONSTRAINT "fk_user_role_organisation_id" FOREIGN KEY ("organisation_id") REFERENCES "organisation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;`)
      await queryRunner.query(`ALTER TABLE "user_role" ADD CONSTRAINT "fk_user_role_organisation_unit_id" FOREIGN KEY ("organisation_unit_id") REFERENCES "organisation_unit"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;`)
      
      // inserts all users not in the user_role table with the appropriate role

      await queryRunner.query(`
        INSERT INTO user_role(user_id, organisation_id, organisation_unit_id, role)
        SELECT
            DISTINCT
            UPPER(U.id),
            UPPER(OU.organisation_id),
            UPPER(OUU.organisation_unit_id),
            CASE 
                WHEN U.[type] IN ('INNOVATOR', 'ADMIN', 'ASSESSMENT') THEN U.[type]
                WHEN U.[type] = 'ACCESSOR' THEN OU.role
            END
        FROM [user] U
        LEFT JOIN organisation_user OU ON u.id = OU.user_id
        LEFT JOIN organisation_unit_user OUU ON OU.id = OUU.organisation_user_id
        LEFT JOIN user_role UR ON ur.user_id = u.id
        WHERE UR.USER_ID is null
      `)

      // updates all users in the user_role table with the appropriate role

      // DELETES duplicates
      await queryRunner.query(`

        DELETE FROM USER_ROLE WHERE ID IN (
          select min(id) from user_role
          group by user_id,organisation_unit_id,organisation_id
          having count(user_id) > 1
          )
  
      `);

      await queryRunner.query(`
        UPDATE 
            user_role
        SET
            role = 
                CASE 
                    WHEN u.type IN ('INNOVATOR', 'ASSESSMENT') THEN U.TYPE
                    WHEN u.type = 'ACCESSOR' THEN OU.role
                    when ur.role = 'SERVICE_TEAM' THEN 'ADMIN'
                    else UR.role
                END
        FROM user_role UR 
        INNER JOIN [user] U on U.id = UR.user_id
        LEFT JOIN organisation_user OU ON u.id = OU.user_id
        LEFT JOIN organisation_unit_user OUU ON OU.id = OUU.organisation_user_id
      `)

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        ALTER TABLE user_role ADD role_id uniqueidentifier NULL;
      `)
      
      
      await queryRunner.query(`
      UPDATE 
      user_role SET
      role_id = r.id
      from user_role ur
      inner join role r on r.name = ur.role;
      
      `)
      
      await queryRunner.query(`
        ALTER TABLE user_role ALTER COLUMN role_id uniqueidentifier NOT NULL;
      `)
      
      await queryRunner.query(`
        ALTER TABLE user_role DROP CONSTRAINT "fk_user_role_organisation_id";
      `)

      await queryRunner.query(`
        ALTER TABLE user_role DROP CONSTRAINT "fk_user_role_organisation_unit_id";
      `)

      await queryRunner.query(`
        ALTER TABLE user_role DROP CONSTRAINT "idx_user_role_user_id_role_organisation_unit";
      `)

      await queryRunner.query(`
      ALTER TABLE user_role DROP COLUMN role;
      `)
      
      await queryRunner.query(`ALTER TABLE "user_role" ADD CONSTRAINT "fk_user_role_role_role_id" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;`)
      await queryRunner.query(`ALTER TABLE "user_role" ADD CONSTRAINT "idx_user_role_user_id_role_id" UNIQUE ("user_id", "role_id")`);


      await queryRunner.query(`
        ALTER TABLE user_role DROP COLUMN organisation_id;
      `)

      await queryRunner.query(`
        ALTER TABLE user_role DROP COLUMN organisation_unit_id;
      `)

    }

}
