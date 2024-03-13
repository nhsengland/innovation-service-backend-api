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
      UPDATE innovation_document
      SET document = latestSubmitted.document
      FROM (
          SELECT
              id,
              JSON_OBJECT(
          'version': CASE
            WHEN "SECTION_SUBMITTED-INNOVATION_DESCRIPTION" IS NULL THEN JSON_VALUE("DRAFT", '$.version')
            ELSE JSON_VALUE("SECTION_SUBMITTED-INNOVATION_DESCRIPTION", '$.version')
          END,
          'INNOVATION_DESCRIPTION': CASE
            WHEN "SECTION_SUBMITTED-INNOVATION_DESCRIPTION" IS NULL THEN JSON_OBJECT(
              'name': JSON_VALUE("DRAFT", '$.INNOVATION_DESCRIPTION.name'),
              'description': JSON_VALUE("DRAFT", '$.INNOVATION_DESCRIPTION.description'),
              'postcode': JSON_VALUE("DRAFT", '$.INNOVATION_DESCRIPTION.postcode'),
              'countryName': JSON_VALUE("DRAFT", '$.INNOVATION_DESCRIPTION.countryName'),
              'website': JSON_VALUE("DRAFT", '$.INNOVATION_DESCRIPTION.website')
            )
            ELSE JSON_QUERY("SECTION_SUBMITTED-INNOVATION_DESCRIPTION", '$.INNOVATION_DESCRIPTION')
          END,
          'COST_OF_INNOVATION': ISNULL(JSON_QUERY("SECTION_SUBMITTED-COST_OF_INNOVATION", '$.COST_OF_INNOVATION'), '{}'),
          'CURRENT_CARE_PATHWAY': ISNULL(JSON_QUERY("SECTION_SUBMITTED-CURRENT_CARE_PATHWAY", '$.CURRENT_CARE_PATHWAY'), '{}'),
          'DEPLOYMENT': ISNULL(JSON_QUERY("SECTION_SUBMITTED-DEPLOYMENT", '$.DEPLOYMENT'), '{}'),
          'EVIDENCE_OF_EFFECTIVENESS': ISNULL(JSON_QUERY("SECTION_SUBMITTED-EVIDENCE_OF_EFFECTIVENESS", '$.EVIDENCE_OF_EFFECTIVENESS'), '{}'),
          'INTELLECTUAL_PROPERTY': ISNULL(JSON_QUERY("SECTION_SUBMITTED-INTELLECTUAL_PROPERTY", '$.INTELLECTUAL_PROPERTY'), '{}'),
          'MARKET_RESEARCH': ISNULL(JSON_QUERY("SECTION_SUBMITTED-MARKET_RESEARCH", '$.MARKET_RESEARCH'), '{}'),
          'REGULATIONS_AND_STANDARDS': ISNULL(JSON_QUERY("SECTION_SUBMITTED-REGULATIONS_AND_STANDARDS", '$.REGULATIONS_AND_STANDARDS'), '{}'),
          'REVENUE_MODEL': ISNULL(JSON_QUERY("SECTION_SUBMITTED-REVENUE_MODEL", '$.REVENUE_MODEL'), '{}'),
          'TESTING_WITH_USERS': ISNULL(JSON_QUERY("SECTION_SUBMITTED-TESTING_WITH_USERS", '$.TESTING_WITH_USERS'), '{}'),
          'UNDERSTANDING_OF_BENEFITS': ISNULL(JSON_QUERY("SECTION_SUBMITTED-UNDERSTANDING_OF_BENEFITS", '$.UNDERSTANDING_OF_BENEFITS'), '{}'),
          'UNDERSTANDING_OF_NEEDS': ISNULL(JSON_QUERY("SECTION_SUBMITTED-UNDERSTANDING_OF_NEEDS", '$.UNDERSTANDING_OF_NEEDS'), '{}'),
          'VALUE_PROPOSITION': ISNULL(JSON_QUERY("SECTION_SUBMITTED-VALUE_PROPOSITION", '$.VALUE_PROPOSITION'), '{}'),
          'evidences': ISNULL(JSON_QUERY("SECTION_SUBMITTED-EVIDENCE_OF_EFFECTIVENESS", '$.evidences'), '[]')
        ) AS document
        FROM (
          SELECT id1.id, id1.type, id2.document
                FROM (
              SELECT
                        id,
                        description,
                        is_snapshot,
                        MAX(valid_from) AS valid_from,
                        IIF(description like 'SECTION_SUBMITTED%' AND is_snapshot = 1, description, 'DRAFT') AS type
                    FROM innovation_document
              FOR SYSTEM_TIME ALL
                    GROUP BY id, description, is_snapshot, IIF(description like 'SECTION_SUBMITTED%' AND is_snapshot = 1, description, 'DRAFT')
            ) AS id1
                    LEFT JOIN (
            SELECT id, description, is_snapshot, document, valid_from
                    FROM innovation_document
            FOR SYSTEM_TIME ALL
          ) AS id2
          ON id2.id = id1.id
              AND id2.valid_from= id1.valid_from
              AND id2.description = id1.description
              AND id2.is_snapshot = id1.is_snapshot
      )
      AS temp
      PIVOT (
        MAX(document)
        FOR type IN (
          "DRAFT",
          "SECTION_SUBMITTED-COST_OF_INNOVATION",
          "SECTION_SUBMITTED-CURRENT_CARE_PATHWAY",
          "SECTION_SUBMITTED-DEPLOYMENT",
          "SECTION_SUBMITTED-EVIDENCE_OF_EFFECTIVENESS",
          "SECTION_SUBMITTED-INNOVATION_DESCRIPTION",
          "SECTION_SUBMITTED-INTELLECTUAL_PROPERTY",
          "SECTION_SUBMITTED-MARKET_RESEARCH",
          "SECTION_SUBMITTED-REGULATIONS_AND_STANDARDS",
          "SECTION_SUBMITTED-REVENUE_MODEL",
          "SECTION_SUBMITTED-TESTING_WITH_USERS",
          "SECTION_SUBMITTED-UNDERSTANDING_OF_BENEFITS",
          "SECTION_SUBMITTED-UNDERSTANDING_OF_NEEDS",
          "SECTION_SUBMITTED-VALUE_PROPOSITION"
        )
      )
      AS data) as latestSubmitted
      WHERE innovation_document.id = latestSubmitted.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "innovation_document_draft";`);
  }
}
