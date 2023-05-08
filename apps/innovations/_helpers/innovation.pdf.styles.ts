export const buildDocumentHeaderDefinition = (): any => {
  return (current: number) => {
    if (current > 1) {
      return {
        columns: [
          {
            text: 'Innovation Record',
            style: 'dimmed',
            margin: [10, 10, 10, 10],
            alignment: 'right',
            italic: true
          }
        ]
      };
    } else return;
  };
};

export const buildDocumentFooterDefinition = (): any => {
  return (current: number, total: number) => {
    if (current > 1) {
      return {
        columns: [
          {
            text: `${current} of ${total}`,
            style: 'footer',
            alignment: 'right',
            margin: [0, 0, 10, 10]
          }
        ]
      };
    } else return;
  };
};

export const buildDocumentTOCDefinition = (innovationName: string): any => {
  return [
    {
      text: 'Innovation Record Export',
      style: 'hero',
      margin: [0, 80, 0, 0],
      alignment: 'center'
    },
    {
      text: innovationName,
      style: 'documentTitle',
      margin: [20, 90, 0, 0],
      alignment: 'left'
    },
    {
      text: 'NHS Innovation service',
      style: 'documentInfo',
      margin: [0, 440, 0, 0],
      alignment: 'right'
    },
    {
      text: `Exported at: ${new Date().toDateString()}`,
      style: 'documentInfo',
      margin: [0, 0, 0, 0],
      alignment: 'right',
      pageBreak: 'after'
    },
    {
      toc: {
        title: { text: 'INDEX', style: 'header' },
        numberStyle: { bold: true }
      }
    }
  ];
};

export const buildDocumentStylesDefinition = (): any => {
  return {
    hero: {
      fontSize: 44,
      bold: true,
      color: '#1874a5'
    },
    sectionTitle: {
      fontSize: 28,
      bold: true,
      color: '#1874a5',
      decoration: 'underline'
    },
    dimmed: {
      fontSize: 10,
      color: '#999999',
      italic: true
    },
    documentTitle: {
      fontSize: 26,
      bold: true,
      color: '#333333'
    },
    documentInfo: {
      fontSize: 16,
      italics: true,
      color: '#333333'
    },
    header: {
      fontSize: 20,
      bold: true
    },
    subheader: {
      fontSize: 18,
      bold: true,
      italics: true
    },
    quote: {
      italics: true
    },
    small: {
      fontSize: 10
    },
    answer: {
      fontSize: 12,
      italics: true
    },
    question: {
      fontSize: 16,
      bold: true
    },
    footer: {
      fontSize: 10,
      color: '#999999',
      italics: true
    }
  };
};
