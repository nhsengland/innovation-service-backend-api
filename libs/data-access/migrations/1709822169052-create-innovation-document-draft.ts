import type { MigrationInterface, QueryRunner } from 'typeorm';

export class createInnovationDocumentDraftTable1709822169052 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make countryName since the field is not used anymore
    await queryRunner.query(`ALTER TABLE "innovation" ALTER COLUMN "country_name" nvarchar(100) NULL;`);

    // Create new document draft table
    await queryRunner.query(`
      CREATE TABLE innovation_document_draft (
        id uniqueidentifier NOT NULL,
        version AS JSON_VALUE(document,'$.version'),
        document nvarchar(max) NOT NULL CONSTRAINT "df_innovation_document_draft_document" DEFAULT '{}',
        "created_at" datetime2 NOT NULL CONSTRAINT "df_innovation_document_draft_created_at" DEFAULT getdate(),
        "created_by" uniqueidentifier,
        "updated_at" datetime2 NOT NULL CONSTRAINT "df_innovation_document_draft_updated_at" DEFAULT getdate(),
        "updated_by" uniqueidentifier,
        "deleted_at" datetime2,
        CONSTRAINT "pk_innovation_document_draft_id" PRIMARY KEY ("id"),
        CONSTRAINT "CK_innovation_document_draft_document_is_json" CHECK (ISJSON(document)=1)
      );
    `);

    // Copy all the current documents to the draft table
    await queryRunner.query(`
      INSERT INTO innovation_document_draft
      SELECT id, document, created_at, created_by, updated_at, updated_by, deleted_at
      FROM innovation_document
    `);

    // Change the current innovation_document with the right version
    await queryRunner.query(`
    WITH submitted_date AS (
      SELECT id, MAX(valid_from) AS valid_from, REPLACE(description, 'SECTION_SUBMITTED-', '') as description
      FROM innovation_document
      FOR SYSTEM_TIME ALL
      WHERE description LIKE 'SECTION_SUBMITTED%' AND is_snapshot=1
      GROUP by id, description
    ),
    submitted_date_with_evidences AS (
      SELECT * FROM submitted_date
      UNION ALL
      SELECT id, valid_from, 'evidences'
      FROM submitted_date
      WHERE description='EVIDENCE_OF_EFFECTIVENESS'
    ),
    submitted AS (
      SELECT d.id, sd.description, JSON_QUERY(d.document, '$.' + sd.description) as fragment
      FROM innovation_document
      FOR SYSTEM_TIME ALL d
      INNER JOIN submitted_date_with_evidences sd on d.id=sd.id and d.valid_from = sd.valid_from
      WHERE JSON_QUERY(d.document, '$.' + sd.description) IS NOT NULL
    ),
    migration_record AS (
      SELECT id, document as json
      FROM innovation_document
      FOR SYSTEM_TIME FROM '2023-01-01' TO '2023-05-01' -- setting this range to avoid multiple updates that happened after without description
      WHERE description = 'Updated to version 202304'
    ),
    latest AS (
      SELECT id, JSON_OBJECT(
        'name': JSON_VALUE(document, '$.INNOVATION_DESCRIPTION.name'),
        'description': JSON_VALUE(document, '$.INNOVATION_DESCRIPTION.description'),
        'countryName': JSON_VALUE(document, '$.INNOVATION_DESCRIPTION.countryName'),
        'website': JSON_VALUE(document, '$.INNOVATION_DESCRIPTION.website'),
        'postcode': JSON_VALUE(document, '$.INNOVATION_DESCRIPTION.postcode'),
        'mainCategory': JSON_VALUE(document, '$.INNOVATION_DESCRIPTION.mainCategory'),
        'otherCategoryDescription': JSON_VALUE(document, '$.INNOVATION_DESCRIPTION.otherCategoryDescription')
      ) as JSON
      FROM innovation_document
    ),
    submitted_document AS (
      SELECT id, 
        CONCAT('{', STRING_AGG(CONCAT('"', description, '":', fragment), ','), '}') as json
      FROM submitted
      GROUP BY id
    ),
    migration_document AS (
      SELECT 
      innovation.id,
      JSON_OBJECT(
        'version': '202304',
        'INNOVATION_DESCRIPTION': 
        JSON_QUERY(COALESCE(JSON_QUERY(submitted_document.json, '$.INNOVATION_DESCRIPTION'), JSON_QUERY(migration_record.json, '$.INNOVATION_DESCRIPTION'), latest.json)),
        'COST_OF_INNOVATION': 
        JSON_QUERY(COALESCE(JSON_QUERY(submitted_document.json, '$.COST_OF_INNOVATION'), JSON_QUERY(migration_record.json, '$.COST_OF_INNOVATION'), '{}')),
        'CURRENT_CARE_PATHWAY': 
        JSON_QUERY(COALESCE(JSON_QUERY(submitted_document.json, '$.CURRENT_CARE_PATHWAY'), JSON_QUERY(migration_record.json, '$.CURRENT_CARE_PATHWAY'), '{}')),
        'DEPLOYMENT': 
        JSON_QUERY(COALESCE(JSON_QUERY(submitted_document.json, '$.DEPLOYMENT'), JSON_QUERY(migration_record.json, '$.DEPLOYMENT'), '{}')),
        'EVIDENCE_OF_EFFECTIVENESS': 
        JSON_QUERY(COALESCE(JSON_QUERY(submitted_document.json, '$.EVIDENCE_OF_EFFECTIVENESS'), JSON_QUERY(migration_record.json, '$.EVIDENCE_OF_EFFECTIVENESS'), '{}')),
        'INTELLECTUAL_PROPERTY': 
        JSON_QUERY(COALESCE(JSON_QUERY(submitted_document.json, '$.INTELLECTUAL_PROPERTY'), JSON_QUERY(migration_record.json, '$.INTELLECTUAL_PROPERTY'), '{}')),
        'MARKET_RESEARCH': 
        JSON_QUERY(COALESCE(JSON_QUERY(submitted_document.json, '$.MARKET_RESEARCH'), JSON_QUERY(migration_record.json, '$.MARKET_RESEARCH'), '{}')),
        'REGULATIONS_AND_STANDARDS': 
        JSON_QUERY(COALESCE(JSON_QUERY(submitted_document.json, '$.REGULATIONS_AND_STANDARDS'), JSON_QUERY(migration_record.json, '$.REGULATIONS_AND_STANDARDS'), '{}')),
        'REVENUE_MODEL': 
        JSON_QUERY(COALESCE(JSON_QUERY(submitted_document.json, '$.REVENUE_MODEL'), JSON_QUERY(migration_record.json, '$.REVENUE_MODEL'), '{}')),
        'TESTING_WITH_USERS': 
        JSON_QUERY(COALESCE(JSON_QUERY(submitted_document.json, '$.TESTING_WITH_USERS'), JSON_QUERY(migration_record.json, '$.TESTING_WITH_USERS'), '{}')),
        'UNDERSTANDING_OF_BENEFITS': 
        JSON_QUERY(COALESCE(JSON_QUERY(submitted_document.json, '$.UNDERSTANDING_OF_BENEFITS'), JSON_QUERY(migration_record.json, '$.UNDERSTANDING_OF_BENEFITS'), '{}')),
        'UNDERSTANDING_OF_NEEDS': 
        JSON_QUERY(COALESCE(JSON_QUERY(submitted_document.json, '$.UNDERSTANDING_OF_NEEDS'), JSON_QUERY(migration_record.json, '$.UNDERSTANDING_OF_NEEDS'), '{}')),
        'VALUE_PROPOSITION': 
        JSON_QUERY(COALESCE(JSON_QUERY(submitted_document.json, '$.VALUE_PROPOSITION'), JSON_QUERY(migration_record.json, '$.VALUE_PROPOSITION'), '{}')),
        'evidences': 
        JSON_QUERY(COALESCE(JSON_QUERY(submitted_document.json, '$.evidences'), JSON_QUERY(migration_record.json, '$.evidences')))  
        ABSENT ON NULL
      ) as json
      FROM innovation innovation
      -- Only 3 sections weren't submitted when the migration occured for innovation that aren't CREATED/WITHDRAWN/ARCHIVED
      -- so simplified and fetching only the migration_record for those since all the others will have a submitted section
      LEFT JOIN migration_record on migration_record.id = innovation.id AND innovation.status NOT IN ('CREATED', 'WITHDRAWN', 'ARCHIVED')
      LEFT JOIN submitted_document on innovation.id = submitted_document.id
      LEFT JOIN latest on innovation.id = latest.id
    ) UPDATE innovation_document
    SET document=migration_document.json, is_snapshot=1, description='Migrate to last submitted IR'
    FROM migration_document
    WHERE innovation_document.id = migration_document.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "innovation_document_draft";`);
  }
}
