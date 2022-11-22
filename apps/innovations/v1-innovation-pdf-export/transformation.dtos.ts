
import type { InnovationSectionModel } from '../_types/innovation.types'

export type ResponseDTO = {
  section: InnovationSectionModel,
  data: null | { [key: string]: string }
}[]
