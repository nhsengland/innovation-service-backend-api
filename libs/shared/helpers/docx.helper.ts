import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  AlignmentType,
  BorderStyle,
  PageNumber,
  TabStopPosition,
  TabStopType,
  ExternalHyperlink
} from 'docx';
import * as htmlparser2 from 'htmlparser2';
import JSZip from 'jszip';
import type { IRSchemaType } from '../models/schema-engine/schema.model';
import type { Question } from '../models/schema-engine/question.types';

const DOCUMENT_FONT = 'Arial';
const TITLE_COLOR = '0070C0'; // Word's blue color - Accent 1
const SECTION_COLOR = '999999';

export async function generateWordDocument(irShema: IRSchemaType): Promise<Buffer> {
  // Create document with three sections
  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: DOCUMENT_FONT,
            size: 32,
            bold: true,
            color: TITLE_COLOR
          },
          paragraph: {
            spacing: { before: 400, after: 200 }
          }
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: DOCUMENT_FONT,
            size: 28,
            bold: true,
            color: SECTION_COLOR
          },
          paragraph: {
            spacing: { before: 300, after: 200 }
          }
        },
        {
          id: 'TOCHeading',
          name: 'TOC Heading',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: DOCUMENT_FONT,
            size: 36,
            bold: true,
            color: SECTION_COLOR
          },
          paragraph: {
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 400 }
          }
        }
      ]
    },
    sections: [
      // First section - Cover Page
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children: generateCoverPage()
      },
      // Second section - Table of Contents
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children: generateTableOfContents(irShema)
      },
      // Third section - Content
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children: generateDocumentContent(irShema)
      }
    ]
  });

  const docBuffer = await Packer.toBuffer(doc);

  return docBuffer;
}

/**
 * Generates the cover page for the document
 * @returns Array of paragraphs for the cover page
 */
export function generateCoverPage(): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // Add vertical spacing at the top (about 25% of the page)
  paragraphs.push(
    new Paragraph({
      text: '',
      spacing: { before: 1500, after: 0 }
    })
  );

  // Add main title
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Innovation Record Template',
          size: 64,
          bold: true,
          color: TITLE_COLOR,
          font: DOCUMENT_FONT
        })
      ],
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 400 }
    })
  );

  // Add subtitle
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'NHS Innovation Service',
          size: 36, // 18pt
          bold: true,
          color: TITLE_COLOR,
          font: DOCUMENT_FONT
        })
      ],
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 800 }
    })
  );

  // Add date information
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `This template was last updated: ${formattedDate}`,
          size: 28,
          color: SECTION_COLOR,
          font: DOCUMENT_FONT
        })
      ],
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 0 }
    })
  );

  return paragraphs;
}

/**
 * Generates the table of contents for the document
 * @param schema The schema containing sections and subsections
 * @returns Array of paragraphs for the table of contents
 */
export function generateTableOfContents(schema: IRSchemaType): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Add Table of Contents title
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Table of Contents',
          size: 36, // 18pt
          bold: true,
          color: SECTION_COLOR,
          font: DOCUMENT_FONT
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 400 }
    })
  );

  // For each section
  schema.sections.forEach((section, sectionIndex) => {
    // Add section entry with its number and page reference
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${sectionIndex + 1}. ${section.title}`,
            size: 28,
            bold: true,
            font: DOCUMENT_FONT
          }),
          new TextRun({
            text: '\t',
            font: DOCUMENT_FONT
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: DOCUMENT_FONT,
            bold: true
          })
        ],
        tabStops: [
          {
            type: TabStopType.RIGHT,
            position: TabStopPosition.MAX
          }
        ],
        spacing: { before: 200, after: 100 }
      })
    );

    // For each subsection
    section.subSections.forEach((subsection, subsectionIndex) => {
      // Add subsection entry with its number and page reference
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `    ${sectionIndex + 1}.${subsectionIndex + 1} ${subsection.title}`,
              size: 24,
              font: DOCUMENT_FONT
            }),
            new TextRun({
              text: '\t',
              font: DOCUMENT_FONT
            }),
            new TextRun({
              children: [PageNumber.CURRENT],
              font: DOCUMENT_FONT
            })
          ],
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: TabStopPosition.MAX
            }
          ],
          indent: {
            left: 720
          },
          spacing: { before: 80, after: 80 }
        })
      );
    });
  });

  return paragraphs;
}

export function generateDocumentContent(schema: IRSchemaType): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Process sections
  schema.sections.forEach((section, sectionIndex) => {
    // Add section heading
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${sectionIndex + 1}. ${section.title}`,
            font: DOCUMENT_FONT,
            color: TITLE_COLOR
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        border: {
          bottom: {
            color: SECTION_COLOR,
            size: 10,
            style: BorderStyle.SINGLE
          }
        }
      })
    );

    // Process subsections
    section.subSections.forEach((subsection, subsectionIndex) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${sectionIndex + 1}.${subsectionIndex + 1} ${subsection.title}`,
              font: DOCUMENT_FONT,
              color: SECTION_COLOR
            })
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 }
        })
      );

      // Process steps and questions
      subsection.steps.forEach(step => {
        // Add conditional context text if step has a condition
        let conditionalPrefix = '';
        let selectedOptionText = '';

        if (step.condition) {
          const conditionId = step.condition.id;
          const optionValues = step.condition.options;

          // Find the referenced question and option in the entire schema
          let referencedQuestion: string | undefined;

          // Search for the referenced question in all sections
          schemaLoop: for (const searchSection of schema.sections) {
            for (const searchSubSection of searchSection.subSections) {
              for (const searchStep of searchSubSection.steps) {
                const foundQuestion = searchStep.questions.find(q => q.id === conditionId);
                if (
                  foundQuestion &&
                  foundQuestion.dataType !== 'text' &&
                  foundQuestion.dataType !== 'textarea' &&
                  foundQuestion.dataType !== 'fields-group'
                ) {
                  referencedQuestion = foundQuestion.label;

                  // If we have options array, find all matching option labels
                  if (optionValues.length > 0 && foundQuestion.items) {
                    // Get all matching option labels and filter out undefined labels
                    const matchingOptions = foundQuestion.items
                      ?.filter(
                        item =>
                          'id' in item &&
                          optionValues.includes(item.id || '') &&
                          'label' in item &&
                          typeof item.label === 'string'
                      )
                      .map(item => (item as { label: string }).label)
                      .filter((label): label is string => !!label); // Filter out undefined labels

                    if (matchingOptions && matchingOptions.length > 0) {
                      // Format the options based on how many we have
                      if (matchingOptions.length === 1) {
                        selectedOptionText = matchingOptions[0] ?? '';
                      } else if (matchingOptions.length === 2) {
                        selectedOptionText = `${matchingOptions[0]} or ${matchingOptions[1]}`;
                      } else {
                        // For 3 or more options, use commas and "or" for the last one
                        const optionsCopy = [...matchingOptions]; // Create a copy to avoid mutating original
                        const lastOption = optionsCopy.pop();
                        selectedOptionText = `${optionsCopy.join(', ')} or ${lastOption}`;
                      }
                    }
                  }
                  break schemaLoop;
                }
              }
            }
          }

          // Format the conditional text
          if (referencedQuestion && selectedOptionText) {
            conditionalPrefix = `If you answered ${selectedOptionText}, `;
          }
        }

        step.questions.forEach(question => {
          // Add question with conditional prefix if available
          let questionLabel = question.label;

          if (conditionalPrefix) {
            // Make first letter after the comma lowercase
            const firstChar = question.label.charAt(0).toLowerCase();
            const restOfLabel = question.label.slice(1);
            questionLabel = `${conditionalPrefix}${firstChar}${restOfLabel}`;
          }

          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: questionLabel,
                  bold: true,
                  size: 24,
                  font: DOCUMENT_FONT
                })
              ],
              spacing: { before: 400 }
            })
          );

          // Add description if available
          if (question.description) {
            if (
              question.description.includes('<p>') ||
              question.description.includes('<a') ||
              question.description.includes('<b>')
            ) {
              const htmlParagraphs = convertHtmlToDocxElements(question.description);
              paragraphs.push(...htmlParagraphs);
            } else {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: question.description,
                      italics: true,
                      size: 20,
                      font: DOCUMENT_FONT
                    })
                  ],
                  spacing: { before: 100, after: 200 }
                })
              );
            }
          }

          // Format the answer based on data type
          switch (question.dataType) {
            case 'radio-group':
            case 'checkbox-array': {
              const items = processQuestionItems(question);
              paragraphs.push(...items);
              break;
            }
            case 'text':
            case 'textarea':
            default:
              paragraphs.push(basicParagraph('[Write your answer here]'));
          }
        });
      });
    });
  });

  return paragraphs;
}

export function processQuestionItems(question: Question): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Only process if question is of type 'radio-group' or 'checkbox-array'
  if (question.dataType !== 'radio-group' && question.dataType !== 'checkbox-array') {
    return paragraphs;
  }

  const items = question.items || [];

  items.forEach(item => {
    if ('type' in item && item.type === 'separator') {
      paragraphs.push(new Paragraph({}));
    } else if ('label' in item && item.label) {
      if (item.label === 'Other') {
        paragraphs.push(basicParagraph('Other: '));
        paragraphs.push(basicParagraph('[Write your answer here]'));
      } else {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '[[CHECKBOX]]',
                font: DOCUMENT_FONT
              }),
              new TextRun({
                text: item.label,
                size: 20,
                font: DOCUMENT_FONT
              })
            ],
            spacing: { before: 100, after: 200 }
          })
        );
      }
    } else {
      paragraphs.push(basicParagraph('[Write your answer here]'));
    }
  });

  return paragraphs;
}

export function basicParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: text,
        size: 24,
        font: DOCUMENT_FONT
      })
    ],
    spacing: { before: 100, after: 200 }
  });
}

// Converts HTML content to docx Paragraph elements
export function convertHtmlToDocxElements(htmlContent: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let currentParagraph = new Paragraph({});

  const parser = new htmlparser2.Parser({
    onopentag(name, attributes) {
      if (name === 'p') {
        // Start a new paragraph
        currentParagraph = new Paragraph({});
        paragraphs.push(currentParagraph);
      } else if (name === 'a' && attributes['href']) {
        // Handle links
        const linkText = ''; // Will be populated in ontext
        const hyperlink = new ExternalHyperlink({
          children: [new TextRun({ text: linkText, style: 'Hyperlink', font: DOCUMENT_FONT })],
          link: attributes['href']
        });
        currentParagraph.addChildElement(hyperlink);
      } else if (name === 'b' || name === 'strong') {
        // Handle bold text
        currentParagraph.addChildElement(new TextRun({ text: '', bold: true, font: DOCUMENT_FONT }));
      }
      // Add more HTML tag handlers as needed
    },
    ontext(text) {
      // Add text to the current paragraph
      currentParagraph.addChildElement(new TextRun({ text, font: DOCUMENT_FONT }));
    }
  });

  parser.write(htmlContent);
  parser.end();

  return paragraphs;
}

// This function adds checkboxes and text boxes to the DOCX document
// It uses JSZip to manipulate the DOCX file structure
export async function addFormElements(docBuffer: Buffer): Promise<Buffer> {
  try {
    const zip = await JSZip.loadAsync(docBuffer);

    // Get document.xml
    const documentFile = zip.file('word/document.xml');
    if (!documentFile) {
      throw new Error('word/document.xml not found in the DOCX file.');
    }
    let documentXml = await documentFile.async('string');

    // Replace placeholder with actual Word checkboxes using proper XML structure
    documentXml = replaceCheckboxPlaceholders(documentXml);

    // Replace [Write your answer here] with modern text boxes
    documentXml = replaceTextBoxPlaceholders(documentXml);

    // Update document.xml
    zip.file('word/document.xml', documentXml);

    // Remove shading from form data by updating settings.xml
    await updateDocumentSettings(zip);

    // Generate output
    return await zip.generateAsync({ type: 'nodebuffer' });
  } catch (error) {
    console.error('Error adding checkboxes and text boxes:', error);
    throw error;
  }
}

/**
 * Carefully replaces [[CHECKBOX]] placeholders with proper Word checkbox elements
 * This approach preserves the structure of the Word XML document
 * @param documentXml The XML content of the Word document
 * @returns Updated XML with proper checkbox elements
 */
export function replaceCheckboxPlaceholders(documentXml: string): string {
  // Regular expression to find text tags containing checkbox placeholders
  // Handles text tags with attributes like xml:space
  const regex = /<w:t(?:\s+[^>]*)?>(.*?)\[\[CHECKBOX\]\](.*?)<\/w:t>/g;
  let result = documentXml;
  let match;

  // Copy the original XML so we can search through it without modifying it yet
  const originalXml = documentXml;
  // Array to store matches and their information
  const matches: Array<{ fullMatch: string; before: string; after: string; index: number; attributes: string }> = [];

  // First pass: collect all matches and their positions
  while ((match = regex.exec(originalXml)) !== null) {
    const [fullMatch, before = '', after = ''] = match;

    // Extract any attributes from the w:t tag
    let attributes = '';
    if (fullMatch.startsWith('<w:t ')) {
      const splitTag = fullMatch.split('<w:t ');
      if (splitTag.length > 1 && splitTag[1]) {
        const afterTag = splitTag[1].split('>')[0];
        attributes = ' ' + afterTag;
      }
    }

    matches.push({
      fullMatch,
      before,
      after,
      index: match.index,
      attributes
    });
  }

  // Second pass: replace matches in reverse order (from end to start)
  // This prevents position shifts from affecting subsequent replacements
  for (let i = matches.length - 1; i >= 0; i--) {
    const matchItem = matches[i];
    if (!matchItem) continue;
    const { fullMatch, before, after, index, attributes } = matchItem;

    // Create proper Word checkbox XML while preserving the run properties
    // Note: we need to close the current text run, insert the checkbox, and then open a new text run
    let checkboxXml = '';

    // If there's text before the checkbox, keep it in the current text run
    if (before) {
      checkboxXml += `<w:t${attributes}>${before}</w:t></w:r>`;
    } else {
      // If no text before, just close the text run
      checkboxXml += `</w:r>`;
    }

    // Insert modern SDT checkbox (Structured Document Tag)
    checkboxXml += `<w:sdt>
      <w:sdtPr>
        <w:id w:val="${Math.floor(Math.random() * 2000000000) - 1000000000}"/>
        <w14:checkbox>
          <w14:checked w14:val="0"/>
          <w14:checkedState w14:val="2612" w14:font="MS Gothic"/>
          <w14:uncheckedState w14:val="2610" w14:font="MS Gothic"/>
        </w14:checkbox>
      </w:sdtPr>
      <w:sdtContent>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="MS Gothic" w:eastAsia="MS Gothic" w:hAnsi="MS Gothic" w:hint="eastAsia"/>
          </w:rPr>
          <w:t>☐</w:t>
        </w:r>
      </w:sdtContent>
    </w:sdt>`;

    // Add spacing after the checkbox using non-breaking spaces
    checkboxXml += `<w:r><w:rPr/><w:t>\u00A0\u00A0</w:t></w:r>`;

    // If there's text after the checkbox, add a new run for it
    if (after) {
      checkboxXml += `<w:r><w:rPr/><w:t${attributes}>${after}</w:t>`;
    } else {
      // If no text after, just start a new empty run to maintain structure
      checkboxXml += `<w:r><w:rPr/>`;
    }

    const beforeMatch = result.substring(0, index);
    const afterMatch = result.substring(index + fullMatch.length);
    result = beforeMatch + checkboxXml + afterMatch;
  }

  return result;
}

/**
 * Replaces [Write your answer here] placeholders with modern Word text box SDT elements
 * @param documentXml The XML content of the Word document
 * @returns Updated XML with modern text box elements
 */
export function replaceTextBoxPlaceholders(documentXml: string): string {
  // Regular expression to find text tags containing text box placeholders
  const regex = /<w:t(?:\s+[^>]*)?>(.*?)\[Write your answer here\](.*?)<\/w:t>/g;
  let result = documentXml;
  let match;

  // Copy the original XML so we can search through it without modifying it yet
  const originalXml = documentXml;
  // Array to store matches and their information
  const matches: Array<{ fullMatch: string; before: string; after: string; index: number; attributes: string }> = [];

  // First pass: collect all matches and their positions
  while ((match = regex.exec(originalXml)) !== null) {
    const [fullMatch, before = '', after = ''] = match;

    // Extract any attributes from the w:t tag
    let attributes = '';
    if (fullMatch.startsWith('<w:t ')) {
      const splitTag = fullMatch.split('<w:t ');
      if (splitTag.length > 1 && splitTag[1]) {
        const afterTag = splitTag[1].split('>')[0];
        if (afterTag) {
          attributes = ' ' + afterTag;
        }
      }
    }

    matches.push({
      fullMatch,
      before,
      after,
      index: match.index,
      attributes
    });
  }

  // Second pass: replace matches in reverse order (from end to start)
  // This prevents position shifts from affecting subsequent replacements
  for (let i = matches.length - 1; i >= 0; i--) {
    const matchItem = matches[i];
    if (!matchItem) continue;
    const { fullMatch, before, after, index, attributes } = matchItem;

    // Create proper Word text box XML while preserving the run properties
    let textBoxXml = '';

    // If there's text before the text box, keep it in the current text run
    if (before) {
      textBoxXml += `<w:t${attributes}>${before}</w:t></w:r>`;
    } else {
      // If no text before, just close the text run
      textBoxXml += `</w:r>`;
    }

    // Insert modern SDT text box (Structured Document Tag)
    textBoxXml += `<w:sdt>
      <w:sdtPr>
        <w:id w:val="${Math.floor(Math.random() * 2000000000) - 1000000000}"/>
        <w:placeholder>
          <w:docPart w:val="DefaultPlaceholder_1081868574"/>
        </w:placeholder>
        <w:showingPlcHdr/>
        <w:text/>
      </w:sdtPr>
      <w:sdtContent>
        <w:r>
          <w:rPr>
            <w:color w:val="808080"/>
          </w:rPr>
          <w:t>Click here to enter text.</w:t>
        </w:r>
      </w:sdtContent>
    </w:sdt>`;

    // If there's text after the text box, add a new run for it
    if (after) {
      textBoxXml += `<w:r><w:rPr/><w:t${attributes}>${after}</w:t>`;
    } else {
      // If no text after, just start a new empty run to maintain structure
      textBoxXml += `<w:r><w:rPr/>`;
    }

    // Replace the match in the result
    const beforeMatch = result.substring(0, index);
    const afterMatch = result.substring(index + fullMatch.length);
    result = beforeMatch + textBoxXml + afterMatch;
  }

  return result;
}

/**
 * Updates the settings.xml file to remove shading from form data
 * @param zip The JSZip object containing the Word document
 */
export async function updateDocumentSettings(zip: any): Promise<void> {
  const settingsFile = zip.file('word/settings.xml');
  if (!settingsFile) {
    console.warn('word/settings.xml not found - skipping document settings update');
    return;
  }

  let settingsXml = await settingsFile.async('string');

  // Check if doNotShadeFormData already exists
  if (!settingsXml.includes('<w:doNotShadeFormData/>')) {
    // Find a good place to insert the doNotShadeFormData setting
    // Insert it after defaultTabStop if it exists
    if (settingsXml.includes('<w:defaultTabStop')) {
      settingsXml = settingsXml.replace(/(<w:defaultTabStop[^>]*\/>)/, '$1<w:doNotShadeFormData/>');
    } else {
      // Insert after the opening settings tag
      settingsXml = settingsXml.replace(/(<w:settings[^>]*>)/, '$1<w:doNotShadeFormData/>');
    }
  }

  // Update the settings.xml file
  zip.file('word/settings.xml', settingsXml);
}
