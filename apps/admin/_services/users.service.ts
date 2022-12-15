import { injectable } from 'inversify';
import { BaseService } from './base.service';

@injectable()
export class UsersService extends BaseService {
  constructor() {
    super();
  }
}
