import type { MigrationInterface } from 'typeorm';

export class migrationIR2023041681809778425 implements MigrationInterface {
  public async up(): Promise<void> {
    // This migration was run once and typeorm has changed since then making it impossible to run prior to other migrations.
    // this can be safely ignored as it was a one time migration
    /*
    const previousLogger = queryRunner.connection.logger;
    // Migrate document
    const documents = await queryRunner.manager
      .createQueryBuilder(InnovationDocumentEntity, 'document')
      .where('version = 202209')
      .getMany();

    // Disable the query logs for the update
    queryRunner.connection.logger = new SimpleConsoleLogger(['error', 'warn']);
    let i = 0;
    const total = documents.length;

    for (const document of documents) {
      if (document.version === '202209') {
        i++;
        await queryRunner.manager.update(
          InnovationDocumentEntity,
          { id: document.id },
          {
            updatedAt: new Date(),
            document: upgradeDocumentTo202304(document.document as DocumentType202209),
            description: 'Updated to version 202304',
            isSnapshot: true
          }
        );
        if (i % 10 === 0) {
          queryRunner.connection.logger.log('warn', `Migrated ${i}/${total} documents`);
        }
      }
    }
    console.log(`Completed migration of ${total} documents`);

    // Restore normal logging
    queryRunner.connection.logger = previousLogger;

    // Update actions
    // soft delete unsupported actions
    const actions = (
      await queryRunner.manager
        .getRepository(InnovationTaskEntity)
        .createQueryBuilder('action')
        .select(['action.id'])
        .innerJoin('action.innovationSection', 'section')
        .where('section.section IN (:...sections)', {
          sections: ['VALUE_PROPOSITION', 'UNDERSTANDING_OF_BENEFITS', 'COMPARATIVE_COST_BENEFIT']
        })
        .getMany()
    ).map(a => a.id);

    if (actions.length) {
      const d1 = await queryRunner.manager.getRepository(InnovationTaskEntity).softDelete({
        id: In(actions),
        deletedAt: IsNull()
      });
      console.log(`Deleted ${d1.affected} actions with old IR section names`);
    }

    // Update sections
    const d2 = await queryRunner.manager.getRepository(InnovationSectionEntity).softDelete({
      section: In(['VALUE_PROPOSITION', 'UNDERSTANDING_OF_BENEFITS', 'COMPARATIVE_COST_BENEFIT']),
      deletedAt: IsNull()
    });
    console.log(`Deleted ${d2.affected} sections with old IR section names`);

    const u1 = await queryRunner.manager
      .getRepository(InnovationSectionEntity)
      .update({ section: 'IMPLEMENTATION_PLAN' as any, deletedAt: IsNull() }, { section: 'DEPLOYMENT' });
    console.log(`Updated ${u1.affected} sections to deployment`);

    const u2 = await queryRunner.manager.getRepository(InnovationSectionEntity).update(
      {
        section: In(['INNOVATION_DESCRIPTION', 'UNDERSTANDING_OF_NEEDS', 'EVIDENCE_OF_EFFECTIVENESS']),
        deletedAt: IsNull()
      },
      {
        status: InnovationSectionStatusEnum.DRAFT
      }
    );
    console.log(`Updated ${u2.affected} sections to draft`);
    */
  }

  public async down(): Promise<void> {}
}
