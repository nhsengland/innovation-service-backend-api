import type { InnovationSectionModel } from '../_types/innovation.types';

export type ResponseDTO =  {
  section: InnovationSectionModel, 
  data: Record<string, string>
}[]
