import { IRSchemaType, SchemaModel } from './schema.model';

describe('models / schema-engine / schema.model.ts', () => {
  it('should give error when schema format is not right', () => {
    const body: any = { sections: [{ id: 'id1', subSections: [] }] };

    const schema = new SchemaModel(body);

    const { errors } = schema.runRules();

    expect(errors).toStrictEqual([
      {
        context: undefined,
        message: '"sections[0].title" is required'
      }
    ]);
  });

  it('should give an error when two sections have the same id', () => {
    const body: IRSchemaType = {
      sections: [
        { id: 'id1', title: 'Section 1', subSections: [] },
        { id: 'id2', title: 'Section 2', subSections: [] },
        { id: 'id1', title: 'Section 3', subSections: [] },
        { id: 'id2', title: 'Section 4', subSections: [] }
      ]
    };
    const schema = new SchemaModel(body);

    const { errors } = schema.runRules();

    expect(errors).toStrictEqual([
      {
        message: 'sections[2].id is repeated',
        context: { id: 'id1', title: 'Section 3', subSections: [] }
      },
      {
        message: 'sections[3].id is repeated',
        context: { id: 'id2', title: 'Section 4', subSections: [] }
      }
    ]);
  });

  it('should give an error when two subSections have the same id', () => {
    const body: IRSchemaType = {
      sections: [
        {
          id: 'id1',
          title: 'Section 1',
          subSections: [
            { id: 'subId1', title: 'Subsection 1.1', questions: [] },
            { id: 'subId2', title: 'Subsection 1.2', questions: [] }
          ]
        },
        { id: 'id2', title: 'Section 2', subSections: [{ id: 'subId1', title: 'Subsection 2.1', questions: [] }] }
      ]
    };
    const schema = new SchemaModel(body);

    const { errors } = schema.runRules();

    expect(errors).toStrictEqual([
      {
        message: 'sections[1].subSections[0].id is repeated',
        context: { id: 'subId1', title: 'Subsection 2.1', questions: [] }
      }
    ]);
  });

  it('should give an error when two questions have the same id', () => {
    const body: IRSchemaType = {
      sections: [
        {
          id: 'id1',
          title: 'Section 1',
          subSections: [
            {
              id: 'subId1',
              title: 'Subsection 1.1',
              questions: [
                { id: 'q1', dataType: 'text', label: 'Question 1' },
                { id: 'q2', dataType: 'text', label: 'Question 2' },
                { id: 'q1', dataType: 'text', label: 'Question 3' }
              ]
            }
          ]
        }
      ]
    };
    const schema = new SchemaModel(body);

    const { errors } = schema.runRules();

    expect(errors).toStrictEqual([
      {
        message: 'sections[0].subSections[0].questions[2].id is repeated',
        context: { id: 'q1', dataType: 'text', label: 'Question 3' }
      }
    ]);
  });

  it("should give error when the itemFromAnswer doesn't reference a previous question", () => {
    const body: IRSchemaType = {
      sections: [
        {
          id: 'id1',
          title: 'Section 1',
          subSections: [
            {
              id: 'subId1',
              title: 'Subsection 1.1',
              questions: [
                {
                  id: 'q1',
                  dataType: 'radio-group',
                  label: 'Label 1',
                  items: [{ itemsFromAnswer: 'q2' }]
                }
              ]
            }
          ]
        }
      ]
    };
    const schema = new SchemaModel(body);

    const { errors } = schema.runRules();

    expect(errors).toStrictEqual([
      {
        message: 'sections[0].subSections[0].questions[0].items must reference a previous question',
        context: {
          id: 'q1',
          dataType: 'radio-group',
          label: 'Label 1',
          items: [{ itemsFromAnswer: 'q2' }]
        }
      }
    ]);
  });

  it('should give error when two items have the same id', () => {
    const body: IRSchemaType = {
      sections: [
        {
          id: 'id1',
          title: 'Section 1',
          subSections: [
            {
              id: 'subId1',
              title: 'Subsection 1.1',
              questions: [
                {
                  id: 'q1',
                  dataType: 'radio-group',
                  label: 'Label 1',
                  items: [
                    { id: 'item1', label: 'item1' },
                    { id: 'item2', label: 'item2' },
                    { id: 'item1', label: 'item3' }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
    const schema = new SchemaModel(body);

    const { errors } = schema.runRules();

    expect(errors).toStrictEqual([
      {
        message: 'sections[0].subSections[0].questions[0].items[2].id is repeated',
        context: { id: 'item1', label: 'item3' }
      }
    ]);
  });

  it('should give error when the conditional question is not valid', () => {
    const body: IRSchemaType = {
      sections: [
        {
          id: 'id1',
          title: 'Section 1',
          subSections: [
            {
              id: 'subId1',
              title: 'Subsection 1.1',
              questions: [
                {
                  id: 'q1',
                  dataType: 'radio-group',
                  label: 'Label 1',
                  items: [
                    {
                      id: 'item1',
                      label: 'item1',
                      conditional: {
                        id: 'c1',
                        dataType: 'text',
                        label: 'Conditional',
                        validations: {}
                      }
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
    const schema = new SchemaModel(body);

    const { errors } = schema.runRules();
    expect(errors).toHaveLength(1);
  });

  it("should give error when the validations object is defined but it doesn't have one key", () => {
    const body: IRSchemaType = {
      sections: [
        {
          id: 'id1',
          title: 'Section 1',
          subSections: [
            {
              id: 'subId1',
              title: 'Subsection 1.1',
              questions: [
                {
                  id: 'q1',
                  dataType: 'text',
                  label: 'Label 1',
                  validations: {}
                }
              ]
            }
          ]
        }
      ]
    };
    const schema = new SchemaModel(body);

    const { errors } = schema.runRules();

    expect(errors).toStrictEqual([
      {
        message: 'sections[0].subSections[0].questions[0].validations if used must have at least 1 validation',
        context: {
          id: 'q1',
          dataType: 'text',
          label: 'Label 1',
          validations: {}
        }
      }
    ]);
  });

  it('should give error when the field question is not valid', () => {
    const body: IRSchemaType = {
      sections: [
        {
          id: 'id1',
          title: 'Section 1',
          subSections: [
            {
              id: 'subId1',
              title: 'Subsection 1.1',
              questions: [
                {
                  id: 'q1',
                  dataType: 'fields-group',
                  label: 'Question 1',
                  description: 'description 1',
                  field: {
                    id: 'q1',
                    dataType: 'text',
                    label: 'Question 2'
                  },
                  addNewLabel: 'New label'
                }
              ]
            }
          ]
        }
      ]
    };
    const schema = new SchemaModel(body);

    const { errors } = schema.runRules();
    expect(errors).toHaveLength(1);
  });

  it('should give error when the addQuestion question is not valid', () => {
    const body: IRSchemaType = {
      sections: [
        {
          id: 'id1',
          title: 'Section 1',
          subSections: [
            {
              id: 'subId1',
              title: 'Subsection 1.1',
              questions: [
                {
                  id: 'q1',
                  dataType: 'fields-group',
                  label: 'Question 1',
                  description: 'description 1',
                  field: {
                    id: 'q2',
                    dataType: 'text',
                    label: 'Question 2'
                  },
                  addQuestion: {
                    id: 'q1',
                    dataType: 'text',
                    label: 'Question 2'
                  },
                  addNewLabel: 'New label'
                }
              ]
            }
          ]
        }
      ]
    };
    const schema = new SchemaModel(body);

    const { errors } = schema.runRules();
    expect(errors).toHaveLength(1);
  });

  describe('runRules condition', () => {
    it('should give error when the referenced variable dont have the option', () => {
      const body: IRSchemaType = {
        sections: [
          {
            id: 'id1',
            title: 'Section 1',
            subSections: [
              {
                id: 'subId1',
                title: 'Subsection 1.1',
                questions: [
                  {
                    id: 'q1',
                    dataType: 'radio-group',
                    label: 'Question 1',
                    items: [
                      { id: 'basedOutsidePT', label: 'Based outside' },
                      { id: 'other', label: 'other' }
                    ]
                  },
                  {
                    id: 'q2',
                    dataType: 'text',
                    label: 'Label 2',
                    condition: { id: 'q1', options: ['basedOutsideUk', 'basedOutsideUs'] }
                  }
                ]
              }
            ]
          }
        ]
      };
      const schema = new SchemaModel(body);

      const { errors } = schema.runRules();

      expect(errors).toStrictEqual([
        {
          message:
            'sections[0].subSections[0].questions[1].condition references a wrong option (basedOutsideUk,basedOutsideUs)',
          context: {
            id: 'q2',
            dataType: 'text',
            label: 'Label 2',
            condition: { id: 'q1', options: ['basedOutsideUk', 'basedOutsideUs'] }
          }
        }
      ]);
    });

    it('should give error when referenced variable is not of a non-tipified dataType', () => {
      const body: IRSchemaType = {
        sections: [
          {
            id: 'id1',
            title: 'Section 1',
            subSections: [
              {
                id: 'subId1',
                title: 'Subsection 1.1',
                questions: [
                  {
                    id: 'q1',
                    dataType: 'text',
                    label: 'Question 1'
                  },
                  {
                    id: 'q2',
                    dataType: 'text',
                    label: 'Label 2',
                    condition: {
                      id: 'q1',
                      options: ['basedOutsideUk']
                    }
                  }
                ]
              }
            ]
          }
        ]
      };
      const schema = new SchemaModel(body);

      const { errors } = schema.runRules();

      expect(errors).toStrictEqual([
        {
          message: 'sections[0].subSections[0].questions[1].condition references non-tipified dataType (q1)',
          context: {
            id: 'q2',
            dataType: 'text',
            label: 'Label 2',
            condition: { id: 'q1', options: ['basedOutsideUk'] }
          }
        }
      ]);
    });

    it('should give error when referenced variable is not from a previous question', () => {
      const body: IRSchemaType = {
        sections: [
          {
            id: 'id1',
            title: 'Section 1',
            subSections: [
              {
                id: 'subId1',
                title: 'Subsection 1.1',
                questions: [
                  {
                    id: 'q2',
                    dataType: 'text',
                    label: 'Label 2',
                    condition: { id: 'q1', options: ['basedOutsideUk'] }
                  },
                  {
                    id: 'q1',
                    dataType: 'radio-group',
                    label: 'Question 1',
                    items: [{ id: 'basedOutsideUk', label: 'Based outside' }]
                  }
                ]
              }
            ]
          }
        ]
      };
      const schema = new SchemaModel(body);

      const { errors } = schema.runRules();

      expect(errors).toStrictEqual([
        {
          message: 'sections[0].subSections[0].questions[0].condition must reference a previous question (q1)',
          context: {
            id: 'q2',
            dataType: 'text',
            label: 'Label 2',
            condition: { id: 'q1', options: ['basedOutsideUk'] }
          }
        }
      ]);
    });
  });
});
