
const translations: {[key: string]: string} = {
    
    ENGAGING: 'engaging',
    FURTHER_INFO_REQUIRED: 'further info',
    COMPLETE: 'complete',
    WAITING: 'waiting',
    NOT_YET: 'not yet',
    UNASSIGNED: 'unassigned',
    UNSUITABLE: 'unsuitable',
    WITHDRAWN: 'withdrawn'
}

export const translate = (source: string): string => {
    return translations[source] ?? source
} 
