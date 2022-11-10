import { InnovationSupportStatusEnum } from '@notifications/shared/enums';

const translations: {[key: string]: string} = {
    
    [InnovationSupportStatusEnum.COMPLETE]: 'complete',
    [InnovationSupportStatusEnum.ENGAGING]: 'engaging',
    [InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED]: 'further info',
    [InnovationSupportStatusEnum.WAITING]: 'waiting',
    [InnovationSupportStatusEnum.NOT_YET]: 'not yet',
    [InnovationSupportStatusEnum.UNASSIGNED]: 'unassigned',
    [InnovationSupportStatusEnum.UNSUITABLE]: 'unsuitable',
    [InnovationSupportStatusEnum.WITHDRAWN]: 'withdrawn'
}

export const translate = (source: string): string => {
    return translations[source] ?? source
} 
