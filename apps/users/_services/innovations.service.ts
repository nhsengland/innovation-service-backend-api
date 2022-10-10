import { injectable } from 'inversify';

import { BaseAppService } from './base-app.service';


@injectable()
export class InnovationsService extends BaseAppService {

  constructor() {
    super();
  }

  async getAllByInnovator(id: string): Promise<{ id: string, name: string }[]> {

    return [
      { id, name: 'teste' }
    ]
  }
}