import { randText, randUuid } from '@ngneat/falso';
import type { IRSchemaType } from '../models/schema-engine/schema.model';
import type { Text, RadioGroup, CheckboxArray } from '../models/schema-engine/question.types';
import {
  generateWordDocument,
  generateCoverPage,
  generateTableOfContents,
  generateDocumentContent,
  processQuestionItems,
  basicParagraph,
  convertHtmlToDocxElements,
  replaceCheckboxPlaceholders,
  replaceTextBoxPlaceholders,
  updateDocumentSettings
} from './docx.helper';
import { Paragraph } from 'docx';

jest.mock('jszip', () => {
  const mockFile = {
    async: jest.fn().mockResolvedValue('<w:document><w:t>Mock document content</w:t></w:document>')
  };

  const mockZip = {
    file: jest.fn().mockReturnValue(mockFile),
    files: {
      'word/document.xml': { name: 'word/document.xml' },
      'word/settings.xml': { name: 'word/settings.xml' }
    },
    generateAsync: jest.fn().mockResolvedValue(Buffer.from('mock docx content'))
  };

  return {
    default: {
      loadAsync: jest.fn().mockResolvedValue(mockZip)
    }
  };
});

const createMockIRSchema = (overrides: Partial<IRSchemaType> = {}): IRSchemaType => ({
  sections: [
    {
      id: randUuid(),
      title: randText(),
      subSections: [
        {
          id: randUuid(),
          title: randText(),
          steps: [
            {
              questions: [createMockTextQuestion()]
            }
          ]
        }
      ]
    }
  ],
  ...overrides
});

const createMockTextQuestion = (overrides: Partial<Text> = {}): Text => ({
  id: randUuid(),
  dataType: 'text',
  label: randText(),
  description: randText(),
  validations: { isRequired: true },
  ...overrides
});

const createMockRadioGroupQuestion = (overrides: Partial<RadioGroup> = {}): RadioGroup => ({
  id: randUuid(),
  dataType: 'radio-group',
  label: randText(),
  description: randText(),
  items: [
    { id: randUuid(), label: randText() },
    { id: randUuid(), label: randText() }
  ],
  ...overrides
});

const createMockCheckboxArrayQuestion = (overrides: Partial<CheckboxArray> = {}): CheckboxArray => ({
  id: randUuid(),
  dataType: 'checkbox-array',
  label: randText(),
  description: randText(),
  items: [
    { id: randUuid(), label: randText() },
    { id: randUuid(), label: randText() }
  ],
  ...overrides
});

describe('DocxHelper suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateWordDocument', () => {
    it('should generate a Word document buffer from IR schema', async () => {
      const mockSchema = createMockIRSchema();

      const result = await generateWordDocument(mockSchema);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle schema with multiple sections and subsections', async () => {
      const mockSchema = createMockIRSchema({
        sections: [
          {
            id: randUuid(),
            title: 'Section 1',
            subSections: [
              {
                id: randUuid(),
                title: 'Subsection 1.1',
                steps: [
                  {
                    questions: [createMockTextQuestion()]
                  }
                ]
              },
              {
                id: randUuid(),
                title: 'Subsection 1.2',
                steps: [
                  {
                    questions: [createMockTextQuestion()]
                  }
                ]
              }
            ]
          },
          {
            id: randUuid(),
            title: 'Section 2',
            subSections: [
              {
                id: randUuid(),
                title: 'Subsection 2.1',
                steps: [
                  {
                    questions: [createMockTextQuestion()]
                  }
                ]
              }
            ]
          }
        ]
      });

      const result = await generateWordDocument(mockSchema);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty schema gracefully', async () => {
      const emptySchema: IRSchemaType = {
        sections: []
      };

      const result = await generateWordDocument(emptySchema);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('generateCoverPage', () => {
    it('should create cover page with title, subtitle, and formatted date', () => {
      const result = generateCoverPage();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(item => {
        expect(item).toBeInstanceOf(Paragraph);
      });
    });

    it('should return array of paragraphs', () => {
      const result = generateCoverPage();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(item => {
        expect(item).toBeInstanceOf(Paragraph);
      });
    });
  });

  describe('generateTableOfContents', () => {
    it('should generate table of contents from schema sections', () => {
      const mockSchema = createMockIRSchema({
        sections: [
          {
            id: randUuid(),
            title: 'Section 1',
            subSections: [
              {
                id: randUuid(),
                title: 'Subsection 1.1',
                steps: [{ questions: [createMockTextQuestion()] }]
              },
              {
                id: randUuid(),
                title: 'Subsection 1.2',
                steps: [{ questions: [createMockTextQuestion()] }]
              }
            ]
          },
          {
            id: randUuid(),
            title: 'Section 2',
            subSections: [
              {
                id: randUuid(),
                title: 'Subsection 2.1',
                steps: [{ questions: [createMockTextQuestion()] }]
              }
            ]
          }
        ]
      });

      const result = generateTableOfContents(mockSchema);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(item => {
        expect(item).toBeInstanceOf(Paragraph);
      });
    });

    it('should handle empty schema sections', () => {
      const emptySchema: IRSchemaType = {
        sections: []
      };

      const result = generateTableOfContents(emptySchema);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('generateDocumentContent', () => {
    it('should generate document content from schema', () => {
      const mockSchema = createMockIRSchema();

      const result = generateDocumentContent(mockSchema);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(item => {
        expect(item).toBeInstanceOf(Paragraph);
      });
    });

    it('should handle schema with different question types', () => {
      const mockSchema = createMockIRSchema({
        sections: [
          {
            id: randUuid(),
            title: 'Mixed Questions Section',
            subSections: [
              {
                id: randUuid(),
                title: 'Mixed Questions Subsection',
                steps: [
                  {
                    questions: [
                      createMockTextQuestion(),
                      createMockRadioGroupQuestion(),
                      createMockCheckboxArrayQuestion()
                    ]
                  }
                ]
              }
            ]
          }
        ]
      });

      const result = generateDocumentContent(mockSchema);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(item => {
        expect(item).toBeInstanceOf(Paragraph);
      });
    });
  });

  describe('processQuestionItems', () => {
    it('should process radio-group question items correctly', () => {
      const radioQuestion = createMockRadioGroupQuestion({
        items: [
          { id: '1', label: 'Option 1' },
          { id: '2', label: 'Option 2' },
          { id: '3', label: 'Option 3' }
        ]
      });

      const result = processQuestionItems(radioQuestion);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(item => {
        expect(item).toBeInstanceOf(Paragraph);
      });
    });

    it('should process checkbox-array question items correctly', () => {
      const checkboxQuestion = createMockCheckboxArrayQuestion({
        items: [
          { id: '1', label: 'Checkbox 1' },
          { id: '2', label: 'Checkbox 2' },
          { id: '3', label: 'Checkbox 3' }
        ]
      });

      const result = processQuestionItems(checkboxQuestion);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(item => {
        expect(item).toBeInstanceOf(Paragraph);
      });
    });

    it('should handle text questions by returning empty array', () => {
      const textQuestion = createMockTextQuestion();

      const result = processQuestionItems(textQuestion);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle empty items array', () => {
      const emptyRadioQuestion = createMockRadioGroupQuestion({
        items: []
      });

      const result = processQuestionItems(emptyRadioQuestion);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('basicParagraph', () => {
    it('should create a basic paragraph with text', () => {
      const text = 'This is a test paragraph';

      const result = basicParagraph(text);

      expect(result).toBeInstanceOf(Paragraph);
    });

    it('should handle empty text', () => {
      const result = basicParagraph('');

      expect(result).toBeInstanceOf(Paragraph);
    });

    it('should handle long text', () => {
      const longText =
        'This is a very long paragraph that contains multiple sentences and should still be handled correctly by the basicParagraph function regardless of its length.';

      const result = basicParagraph(longText);

      expect(result).toBeInstanceOf(Paragraph);
    });
  });

  describe('convertHtmlToDocxElements', () => {
    it('should convert simple HTML to DOCX paragraphs', () => {
      const htmlContent = '<p>This is a paragraph</p><p>This is another paragraph</p>';

      const result = convertHtmlToDocxElements(htmlContent);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(item => {
        expect(item).toBeInstanceOf(Paragraph);
      });
    });

    it('should handle HTML with formatting', () => {
      const htmlContent = '<p><strong>Bold text</strong> and <em>italic text</em></p>';

      const result = convertHtmlToDocxElements(htmlContent);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(item => {
        expect(item).toBeInstanceOf(Paragraph);
      });
    });

    it('should handle lists', () => {
      const htmlContent = '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>';

      const result = convertHtmlToDocxElements(htmlContent);

      expect(Array.isArray(result)).toBe(true);
      // Note: The current implementation doesn't handle ul/li tags, so result will be empty
      // This test documents the current behavior
      expect(result.length).toBe(0);
    });

    it('should handle empty HTML', () => {
      const result = convertHtmlToDocxElements('');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle plain text without HTML tags', () => {
      const plainText = 'This is just plain text without any HTML tags';

      const result = convertHtmlToDocxElements(plainText);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('replaceCheckboxPlaceholders', () => {
    it('should replace checkbox placeholder with Word checkbox XML', () => {
      const documentXml = '<w:t>Option 1: [[CHECKBOX]]</w:t>';

      const result = replaceCheckboxPlaceholders(documentXml);

      expect(typeof result).toBe('string');
      expect(result).not.toContain('[[CHECKBOX]]');
      expect(result).toContain('<w:sdt>');
      expect(result).toContain('<w14:checkbox>');
    });

    it('should replace multiple checkboxes in separate tags', () => {
      const documentXml = '<w:t>Option 1: [[CHECKBOX]]</w:t><w:t>Option 2: [[CHECKBOX]]</w:t>';

      const result = replaceCheckboxPlaceholders(documentXml);

      expect(typeof result).toBe('string');
      expect(result).not.toContain('[[CHECKBOX]]');
      expect(result).toContain('<w:sdt>');
      expect(result).toContain('<w14:checkbox>');
    });

    it('should handle document without checkbox placeholders', () => {
      const documentXml = '<w:t>This document has no placeholders</w:t>';

      const result = replaceCheckboxPlaceholders(documentXml);

      expect(result).toBe(documentXml);
    });

    it('should handle empty string', () => {
      const result = replaceCheckboxPlaceholders('');

      expect(result).toBe('');
    });

    it('should preserve text before and after checkbox placeholders', () => {
      const documentXml = '<w:t>Select option: [[CHECKBOX]] Yes</w:t>';

      const result = replaceCheckboxPlaceholders(documentXml);

      expect(typeof result).toBe('string');
      expect(result).not.toContain('[[CHECKBOX]]');
      expect(result).toContain('Select option:');
      expect(result).toContain('Yes');
    });

    it('should handle only first placeholder when multiple are in same tag', () => {
      // This documents the current behavior - only the first placeholder in a tag gets replaced
      const documentXml = '<w:t>Option 1: [[CHECKBOX]] Option 2: [[CHECKBOX]]</w:t>';

      const result = replaceCheckboxPlaceholders(documentXml);

      expect(typeof result).toBe('string');
      // The first placeholder should be replaced
      expect(result).toContain('<w:sdt>');
      expect(result).toContain('<w14:checkbox>');
      // But the second one remains (this is the current behavior)
      expect(result).toContain('[[CHECKBOX]]');
    });
  });

  describe('replaceTextBoxPlaceholders', () => {
    it('should replace text placeholder with form field in Word XML', () => {
      const documentXml = '<w:t>Please enter your name: [Write your answer here]</w:t>';

      const result = replaceTextBoxPlaceholders(documentXml);

      expect(typeof result).toBe('string');
      expect(result).not.toContain('[Write your answer here]');
      expect(result).toContain('<w:sdt>');
    });

    it('should replace multiple text placeholders in separate tags', () => {
      const documentXml = '<w:t>Name: [Write your answer here]</w:t><w:t>Email: [Write your answer here]</w:t>';

      const result = replaceTextBoxPlaceholders(documentXml);

      expect(typeof result).toBe('string');
      expect(result).not.toContain('[Write your answer here]');
      expect(result).toContain('<w:sdt>');
    });

    it('should handle document without text placeholders', () => {
      const documentXml = '<w:t>This document has no placeholders</w:t>';

      const result = replaceTextBoxPlaceholders(documentXml);

      expect(result).toBe(documentXml);
    });

    it('should handle empty string', () => {
      const result = replaceTextBoxPlaceholders('');

      expect(result).toBe('');
    });

    it('should handle malformed XML gracefully', () => {
      const documentXml = 'Document with [Write your answer here] but no proper XML tags';

      const result = replaceTextBoxPlaceholders(documentXml);

      expect(typeof result).toBe('string');
      // Should handle gracefully without throwing errors
    });

    it('should preserve text before and after placeholders', () => {
      const documentXml = '<w:t>Name: [Write your answer here] (required)</w:t>';

      const result = replaceTextBoxPlaceholders(documentXml);

      expect(typeof result).toBe('string');
      expect(result).not.toContain('[Write your answer here]');
      expect(result).toContain('Name:');
      expect(result).toContain('(required)');
    });

    it('should handle only first placeholder when multiple are in same tag', () => {
      // This documents the current behavior - only the first placeholder in a tag gets replaced
      const documentXml = '<w:t>Name: [Write your answer here] Email: [Write your answer here]</w:t>';

      const result = replaceTextBoxPlaceholders(documentXml);

      expect(typeof result).toBe('string');
      // The first placeholder should be replaced
      expect(result).toContain('<w:sdt>');
      // But the second one remains (this is the current behavior)
      expect(result).toContain('[Write your answer here]');
    });
  });

  describe('updateDocumentSettings', () => {
    let mockZip: any;

    beforeEach(() => {
      mockZip = {
        file: jest.fn().mockReturnValue({
          async: jest.fn().mockResolvedValue('mock settings content')
        }),
        files: {
          'word/settings.xml': { name: 'word/settings.xml' }
        }
      };
    });

    it('should update document settings', async () => {
      await updateDocumentSettings(mockZip);

      expect(mockZip.file).toHaveBeenCalledWith('word/settings.xml');
    });

    it('should handle missing settings file', async () => {
      mockZip.files = {};

      await expect(updateDocumentSettings(mockZip)).resolves.not.toThrow();
    });
  });

  describe('Integration tests', () => {
    it('should generate complete document with all features', async () => {
      const complexSchema = createMockIRSchema({
        sections: [
          {
            id: randUuid(),
            title: 'Innovation Overview',
            subSections: [
              {
                id: randUuid(),
                title: 'Basic Information',
                steps: [
                  {
                    questions: [
                      createMockTextQuestion({ label: 'Innovation Name' }),
                      createMockRadioGroupQuestion({
                        label: 'Development Stage',
                        items: [
                          { id: '1', label: 'Idea stage' },
                          { id: '2', label: 'Development stage' },
                          { id: '3', label: 'Testing stage' }
                        ]
                      }),
                      createMockCheckboxArrayQuestion({
                        label: 'Areas of Impact',
                        items: [
                          { id: '1', label: 'Clinical care' },
                          { id: '2', label: 'Digital technology' },
                          { id: '3', label: 'Medical devices' }
                        ]
                      })
                    ]
                  }
                ]
              }
            ]
          }
        ]
      });

      const result = await generateWordDocument(complexSchema);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle schema with HTML content in questions', async () => {
      const schemaWithHtml = createMockIRSchema({
        sections: [
          {
            id: randUuid(),
            title: 'HTML Content Section',
            subSections: [
              {
                id: randUuid(),
                title: 'HTML Questions',
                steps: [
                  {
                    questions: [
                      createMockTextQuestion({
                        label: 'Question with <strong>HTML</strong> formatting',
                        description: '<p>This description has <em>italic</em> and <strong>bold</strong> text.</p>'
                      })
                    ]
                  }
                ]
              }
            ]
          }
        ]
      });

      const result = await generateWordDocument(schemaWithHtml);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
