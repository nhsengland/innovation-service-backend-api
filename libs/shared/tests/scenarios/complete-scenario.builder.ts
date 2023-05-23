import type { DataSource } from 'typeorm';

import { ServiceRoleEnum } from '../../enums/user.enums';
import { UserBuilder } from '../builders/user.builder';
import { InnovationBuilder } from '../builders/innovation.builder';

export type CompleteScenarioType = Awaited<ReturnType<CompleteScenarioBuilder['createScenario']>>;

export class CompleteScenarioBuilder {
  sqlConnection: DataSource;

  constructor(sqlConnection: DataSource) {
    this.sqlConnection = sqlConnection;
  }

  async createScenario() {
    return await this.sqlConnection.transaction(async entityManager => {
      // Innovators.
      // // John Innovator specs:
      // // 1 innovation in status 'CREATED'
      const johnInnovator = await new UserBuilder(entityManager)
        .setName('John Innovator')
        .addRole(ServiceRoleEnum.INNOVATOR)
        .save();
      const johnInnovation = await new InnovationBuilder(entityManager).setOwner(johnInnovator.id).save();

      // // Adam Innovator specs:
      // // 1 innovation in status 'CREATED' with transfer in status 'PENDING' to external user.
      const adamInnovator = await new UserBuilder(entityManager)
        .setName('Adam Innovator')
        .addRole(ServiceRoleEnum.INNOVATOR)
        .save();
      const adamInnovation = await new InnovationBuilder(entityManager)
        .setOwner(adamInnovator.id)
        .addTransfer('transfers@example.org')
        .save();

      return {
        users: {
          johnInnovator: { ...johnInnovator, innovations: [johnInnovation] },
          adamInnovator: { ...adamInnovator, innovations: [adamInnovation] }
        }
        // innovations: {
        //   johnInnovation: { ...johnInnovation },
        //   innovationWithTransfer: {
        //     ...innovationWithTransfer,
        //     transfers: innovationWithTransfer.transfers.map(t => ({ id: t.id, email: t.email }))
        //   }
        // }
        // emails: { emailWithTransfers }
      };
    });

    // return this.sampleData;
  }
}
