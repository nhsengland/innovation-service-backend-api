import { container } from './inversify';
import { startup } from './startup';

void startup(container);

export default container;
