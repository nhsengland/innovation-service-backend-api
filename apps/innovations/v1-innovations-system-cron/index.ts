import { InnovationEntity } from '@innovations/shared/entities';
import { DomainServiceSymbol, DomainServiceType, SQLConnectionServiceSymbol, SQLConnectionServiceType } from '@innovations/shared/services';
import { container } from '../_config';


// Run every day at 01:00 (Summer Time) or 02:00 (Winter time)
class V1InnovationsSystemSchedule {

  static async cronTrigger(): Promise<void> {

    const domainService = container.get<DomainServiceType>(DomainServiceSymbol);
    const sqlConnection = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol).getConnection();

    const dbInnovations = await sqlConnection.createQueryBuilder(InnovationEntity, 'innovations')    
      .where('innovations.expires_at < :now', {now: new Date().toISOString()})
      .getMany();
  
    await domainService.innovations.withdrawInnovations(
      { id: '', roleId: '' },
      dbInnovations.map(item => ({ id: item.id, reason: null }))
    );
  }
}

export default V1InnovationsSystemSchedule.cronTrigger;
