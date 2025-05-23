export const IR_SCHEMA = {
  sections: [
    {
      id: 'aboutYourInnovation',
      title: 'About your innovation',
      subSections: [
        {
          id: 'INNOVATION_DESCRIPTION',
          title: 'Description of innovation',
          steps: [
            {
              questions: [
                {
                  id: 'name',
                  dataType: 'text',
                  label: 'What is the name of your innovation?',
                  description: 'Enter the name of your innovation with a maximum of 100 characters',
                  validations: {
                    isRequired: 'Innovation name is required',
                    maxLength: 100
                  }
                }
              ]
            },
            {
              questions: [
                {
                  id: 'description',
                  dataType: 'textarea',
                  label: 'Provide a short description of your innovation',
                  description:
                    'Provide a high-level overview of your innovation. You will have the opportunity to explain its impact, target population, testing and revenue model later in the innovation record.',
                  validations: {
                    isRequired: 'A description is required'
                  },
                  lengthLimit: 's'
                }
              ]
            },
            {
              questions: [
                {
                  id: 'officeLocation',
                  dataType: 'radio-group',
                  label: 'Where is your head office located?',
                  description:
                    '<p>If your head office is overseas but you have a UK office, use the UK address.</p><p>If you are not part of a company or organisation, put where you are based.</p><p>We ask this to identify the organisations and people who are in the best position to support you.</p>',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'England',
                      label: 'England'
                    },
                    {
                      id: 'Scotland',
                      label: 'Scotland'
                    },
                    {
                      id: 'Wales',
                      label: 'Wales'
                    },
                    {
                      id: 'Northern Ireland',
                      label: 'Northern Ireland'
                    },
                    {
                      type: 'separator'
                    },
                    {
                      id: 'Based outside UK',
                      label: "I'm based outside of the UK"
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'postcode',
                  dataType: 'text',
                  label: 'What is your head office postcode?',
                  validations: {
                    isRequired: 'Postcode is required',
                    maxLength: 8,
                    postcodeFormat: true
                  }
                }
              ],
              condition: {
                id: 'officeLocation',
                options: ['England', 'Scotland', 'Wales', 'Northern Ireland']
              }
            },
            {
              questions: [
                {
                  id: 'countryLocation',
                  dataType: 'autocomplete-array',
                  label: 'Which country is your head office located in?',
                  validations: {
                    isRequired: 'You must choose one country',
                    max: {
                      length: 1,
                      errorMessage: 'Only 1 country is allowed'
                    }
                  },
                  items: [
                    {
                      id: 'Afghanistan',
                      label: 'Afghanistan'
                    },
                    {
                      id: 'Albania',
                      label: 'Albania'
                    },
                    {
                      id: 'Algeria',
                      label: 'Algeria'
                    },
                    {
                      id: 'Andorra',
                      label: 'Andorra'
                    },
                    {
                      id: 'Angola',
                      label: 'Angola'
                    },
                    {
                      id: 'Antigua and Barbuda',
                      label: 'Antigua and Barbuda'
                    },
                    {
                      id: 'Argentina',
                      label: 'Argentina'
                    },
                    {
                      id: 'Armenia',
                      label: 'Armenia'
                    },
                    {
                      id: 'Australia',
                      label: 'Australia'
                    },
                    {
                      id: 'Austria',
                      label: 'Austria'
                    },
                    {
                      id: 'Azerbaijan',
                      label: 'Azerbaijan'
                    },
                    {
                      id: 'Bahamas',
                      label: 'Bahamas'
                    },
                    {
                      id: 'Bahrain',
                      label: 'Bahrain'
                    },
                    {
                      id: 'Bangladesh',
                      label: 'Bangladesh'
                    },
                    {
                      id: 'Barbados',
                      label: 'Barbados'
                    },
                    {
                      id: 'Belarus',
                      label: 'Belarus'
                    },
                    {
                      id: 'Belgium',
                      label: 'Belgium'
                    },
                    {
                      id: 'Belize',
                      label: 'Belize'
                    },
                    {
                      id: 'Benin',
                      label: 'Benin'
                    },
                    {
                      id: 'Bhutan',
                      label: 'Bhutan'
                    },
                    {
                      id: 'Bolivia',
                      label: 'Bolivia'
                    },
                    {
                      id: 'Bosnia and Herzegovina',
                      label: 'Bosnia and Herzegovina'
                    },
                    {
                      id: 'Botswana',
                      label: 'Botswana'
                    },
                    {
                      id: 'Brazil',
                      label: 'Brazil'
                    },
                    {
                      id: 'Brunei',
                      label: 'Brunei'
                    },
                    {
                      id: 'Bulgaria',
                      label: 'Bulgaria'
                    },
                    {
                      id: 'Burkina Faso',
                      label: 'Burkina Faso'
                    },
                    {
                      id: 'Burundi',
                      label: 'Burundi'
                    },
                    {
                      id: "Côte d'Ivoire",
                      label: "Côte d'Ivoire"
                    },
                    {
                      id: 'Cabo Verde',
                      label: 'Cabo Verde'
                    },
                    {
                      id: 'Cambodia',
                      label: 'Cambodia'
                    },
                    {
                      id: 'Cameroon',
                      label: 'Cameroon'
                    },
                    {
                      id: 'Canada',
                      label: 'Canada'
                    },
                    {
                      id: 'Central African Republic',
                      label: 'Central African Republic'
                    },
                    {
                      id: 'Chad',
                      label: 'Chad'
                    },
                    {
                      id: 'Chile',
                      label: 'Chile'
                    },
                    {
                      id: 'China',
                      label: 'China'
                    },
                    {
                      id: 'Colombia',
                      label: 'Colombia'
                    },
                    {
                      id: 'Comoros',
                      label: 'Comoros'
                    },
                    {
                      id: 'Congo (Congo-Brazzaville)',
                      label: 'Congo (Congo-Brazzaville)'
                    },
                    {
                      id: 'Costa Rica',
                      label: 'Costa Rica'
                    },
                    {
                      id: 'Croatia',
                      label: 'Croatia'
                    },
                    {
                      id: 'Cuba',
                      label: 'Cuba'
                    },
                    {
                      id: 'Cyprus',
                      label: 'Cyprus'
                    },
                    {
                      id: 'Czechia (Czech Republic)',
                      label: 'Czechia (Czech Republic)'
                    },
                    {
                      id: 'Democratic Republic of the Congo',
                      label: 'Democratic Republic of the Congo'
                    },
                    {
                      id: 'Denmark',
                      label: 'Denmark'
                    },
                    {
                      id: 'Djibouti',
                      label: 'Djibouti'
                    },
                    {
                      id: 'Dominica',
                      label: 'Dominica'
                    },
                    {
                      id: 'Dominican Republic',
                      label: 'Dominican Republic'
                    },
                    {
                      id: 'Ecuador',
                      label: 'Ecuador'
                    },
                    {
                      id: 'Egypt',
                      label: 'Egypt'
                    },
                    {
                      id: 'El Salvador',
                      label: 'El Salvador'
                    },
                    {
                      id: 'Equatorial Guinea',
                      label: 'Equatorial Guinea'
                    },
                    {
                      id: 'Eritrea',
                      label: 'Eritrea'
                    },
                    {
                      id: 'Estonia',
                      label: 'Estonia'
                    },
                    {
                      id: 'Eswatini (fmr. "Swaziland")',
                      label: 'Eswatini (fmr. "Swaziland")'
                    },
                    {
                      id: 'Ethiopia',
                      label: 'Ethiopia'
                    },
                    {
                      id: 'Fiji',
                      label: 'Fiji'
                    },
                    {
                      id: 'Finland',
                      label: 'Finland'
                    },
                    {
                      id: 'France',
                      label: 'France'
                    },
                    {
                      id: 'Gabon',
                      label: 'Gabon'
                    },
                    {
                      id: 'Gambia',
                      label: 'Gambia'
                    },
                    {
                      id: 'Georgia',
                      label: 'Georgia'
                    },
                    {
                      id: 'Germany',
                      label: 'Germany'
                    },
                    {
                      id: 'Ghana',
                      label: 'Ghana'
                    },
                    {
                      id: 'Greece',
                      label: 'Greece'
                    },
                    {
                      id: 'Grenada',
                      label: 'Grenada'
                    },
                    {
                      id: 'Guatemala',
                      label: 'Guatemala'
                    },
                    {
                      id: 'Guinea',
                      label: 'Guinea'
                    },
                    {
                      id: 'Guinea-Bissau',
                      label: 'Guinea-Bissau'
                    },
                    {
                      id: 'Guyana',
                      label: 'Guyana'
                    },
                    {
                      id: 'Haiti',
                      label: 'Haiti'
                    },
                    {
                      id: 'Holy See',
                      label: 'Holy See'
                    },
                    {
                      id: 'Honduras',
                      label: 'Honduras'
                    },
                    {
                      id: 'Hungary',
                      label: 'Hungary'
                    },
                    {
                      id: 'Iceland',
                      label: 'Iceland'
                    },
                    {
                      id: 'India',
                      label: 'India'
                    },
                    {
                      id: 'Indonesia',
                      label: 'Indonesia'
                    },
                    {
                      id: 'Iran',
                      label: 'Iran'
                    },
                    {
                      id: 'Iraq',
                      label: 'Iraq'
                    },
                    {
                      id: 'Ireland',
                      label: 'Ireland'
                    },
                    {
                      id: 'Israel',
                      label: 'Israel'
                    },
                    {
                      id: 'Italy',
                      label: 'Italy'
                    },
                    {
                      id: 'Jamaica',
                      label: 'Jamaica'
                    },
                    {
                      id: 'Japan',
                      label: 'Japan'
                    },
                    {
                      id: 'Jordan',
                      label: 'Jordan'
                    },
                    {
                      id: 'Kazakhstan',
                      label: 'Kazakhstan'
                    },
                    {
                      id: 'Kenya',
                      label: 'Kenya'
                    },
                    {
                      id: 'Kiribati',
                      label: 'Kiribati'
                    },
                    {
                      id: 'Kuwait',
                      label: 'Kuwait'
                    },
                    {
                      id: 'Kyrgyzstan',
                      label: 'Kyrgyzstan'
                    },
                    {
                      id: 'Laos',
                      label: 'Laos'
                    },
                    {
                      id: 'Latvia',
                      label: 'Latvia'
                    },
                    {
                      id: 'Lebanon',
                      label: 'Lebanon'
                    },
                    {
                      id: 'Lesotho',
                      label: 'Lesotho'
                    },
                    {
                      id: 'Liberia',
                      label: 'Liberia'
                    },
                    {
                      id: 'Libya',
                      label: 'Libya'
                    },
                    {
                      id: 'Liechtenstein',
                      label: 'Liechtenstein'
                    },
                    {
                      id: 'Lithuania',
                      label: 'Lithuania'
                    },
                    {
                      id: 'Luxembourg',
                      label: 'Luxembourg'
                    },
                    {
                      id: 'Madagascar',
                      label: 'Madagascar'
                    },
                    {
                      id: 'Malawi',
                      label: 'Malawi'
                    },
                    {
                      id: 'Malaysia',
                      label: 'Malaysia'
                    },
                    {
                      id: 'Maldives',
                      label: 'Maldives'
                    },
                    {
                      id: 'Mali',
                      label: 'Mali'
                    },
                    {
                      id: 'Malta',
                      label: 'Malta'
                    },
                    {
                      id: 'Marshall Islands',
                      label: 'Marshall Islands'
                    },
                    {
                      id: 'Mauritania',
                      label: 'Mauritania'
                    },
                    {
                      id: 'Mauritius',
                      label: 'Mauritius'
                    },
                    {
                      id: 'Mexico',
                      label: 'Mexico'
                    },
                    {
                      id: 'Micronesia',
                      label: 'Micronesia'
                    },
                    {
                      id: 'Moldova',
                      label: 'Moldova'
                    },
                    {
                      id: 'Monaco',
                      label: 'Monaco'
                    },
                    {
                      id: 'Mongolia',
                      label: 'Mongolia'
                    },
                    {
                      id: 'Montenegro',
                      label: 'Montenegro'
                    },
                    {
                      id: 'Morocco',
                      label: 'Morocco'
                    },
                    {
                      id: 'Mozambique',
                      label: 'Mozambique'
                    },
                    {
                      id: 'Myanmar (formerly Burma)',
                      label: 'Myanmar (formerly Burma)'
                    },
                    {
                      id: 'Namibia',
                      label: 'Namibia'
                    },
                    {
                      id: 'Nauru',
                      label: 'Nauru'
                    },
                    {
                      id: 'Nepal',
                      label: 'Nepal'
                    },
                    {
                      id: 'Netherlands',
                      label: 'Netherlands'
                    },
                    {
                      id: 'New Zealand',
                      label: 'New Zealand'
                    },
                    {
                      id: 'Nicaragua',
                      label: 'Nicaragua'
                    },
                    {
                      id: 'Niger',
                      label: 'Niger'
                    },
                    {
                      id: 'Nigeria',
                      label: 'Nigeria'
                    },
                    {
                      id: 'North Korea',
                      label: 'North Korea'
                    },
                    {
                      id: 'North Macedonia',
                      label: 'North Macedonia'
                    },
                    {
                      id: 'Norway',
                      label: 'Norway'
                    },
                    {
                      id: 'Oman',
                      label: 'Oman'
                    },
                    {
                      id: 'Pakistan',
                      label: 'Pakistan'
                    },
                    {
                      id: 'Palau',
                      label: 'Palau'
                    },
                    {
                      id: 'Palestine State',
                      label: 'Palestine State'
                    },
                    {
                      id: 'Panama',
                      label: 'Panama'
                    },
                    {
                      id: 'Papua New Guinea',
                      label: 'Papua New Guinea'
                    },
                    {
                      id: 'Paraguay',
                      label: 'Paraguay'
                    },
                    {
                      id: 'Peru',
                      label: 'Peru'
                    },
                    {
                      id: 'Philippines',
                      label: 'Philippines'
                    },
                    {
                      id: 'Poland',
                      label: 'Poland'
                    },
                    {
                      id: 'Portugal',
                      label: 'Portugal'
                    },
                    {
                      id: 'Qatar',
                      label: 'Qatar'
                    },
                    {
                      id: 'Romania',
                      label: 'Romania'
                    },
                    {
                      id: 'Russia',
                      label: 'Russia'
                    },
                    {
                      id: 'Rwanda',
                      label: 'Rwanda'
                    },
                    {
                      id: 'Saint Kitts and Nevis',
                      label: 'Saint Kitts and Nevis'
                    },
                    {
                      id: 'Saint Lucia',
                      label: 'Saint Lucia'
                    },
                    {
                      id: 'Saint Vincent and the Grenadines',
                      label: 'Saint Vincent and the Grenadines'
                    },
                    {
                      id: 'Samoa',
                      label: 'Samoa'
                    },
                    {
                      id: 'San Marino',
                      label: 'San Marino'
                    },
                    {
                      id: 'Sao Tome and Principe',
                      label: 'Sao Tome and Principe'
                    },
                    {
                      id: 'Saudi Arabia',
                      label: 'Saudi Arabia'
                    },
                    {
                      id: 'Senegal',
                      label: 'Senegal'
                    },
                    {
                      id: 'Serbia',
                      label: 'Serbia'
                    },
                    {
                      id: 'Seychelles',
                      label: 'Seychelles'
                    },
                    {
                      id: 'Sierra Leone',
                      label: 'Sierra Leone'
                    },
                    {
                      id: 'Singapore',
                      label: 'Singapore'
                    },
                    {
                      id: 'Slovakia',
                      label: 'Slovakia'
                    },
                    {
                      id: 'Slovenia',
                      label: 'Slovenia'
                    },
                    {
                      id: 'Solomon Islands',
                      label: 'Solomon Islands'
                    },
                    {
                      id: 'Somalia',
                      label: 'Somalia'
                    },
                    {
                      id: 'South Africa',
                      label: 'South Africa'
                    },
                    {
                      id: 'South Korea',
                      label: 'South Korea'
                    },
                    {
                      id: 'South Sudan',
                      label: 'South Sudan'
                    },
                    {
                      id: 'Spain',
                      label: 'Spain'
                    },
                    {
                      id: 'Sri Lanka',
                      label: 'Sri Lanka'
                    },
                    {
                      id: 'Sudan',
                      label: 'Sudan'
                    },
                    {
                      id: 'Suriname',
                      label: 'Suriname'
                    },
                    {
                      id: 'Sweden',
                      label: 'Sweden'
                    },
                    {
                      id: 'Switzerland',
                      label: 'Switzerland'
                    },
                    {
                      id: 'Syria',
                      label: 'Syria'
                    },
                    {
                      id: 'Tajikistan',
                      label: 'Tajikistan'
                    },
                    {
                      id: 'Tanzania',
                      label: 'Tanzania'
                    },
                    {
                      id: 'Thailand',
                      label: 'Thailand'
                    },
                    {
                      id: 'Timor-Leste',
                      label: 'Timor-Leste'
                    },
                    {
                      id: 'Togo',
                      label: 'Togo'
                    },
                    {
                      id: 'Tonga',
                      label: 'Tonga'
                    },
                    {
                      id: 'Trinidad and Tobago',
                      label: 'Trinidad and Tobago'
                    },
                    {
                      id: 'Tunisia',
                      label: 'Tunisia'
                    },
                    {
                      id: 'Turkey',
                      label: 'Turkey'
                    },
                    {
                      id: 'Turkmenistan',
                      label: 'Turkmenistan'
                    },
                    {
                      id: 'Tuvalu',
                      label: 'Tuvalu'
                    },
                    {
                      id: 'Uganda',
                      label: 'Uganda'
                    },
                    {
                      id: 'Ukraine',
                      label: 'Ukraine'
                    },
                    {
                      id: 'United Arab Emirates',
                      label: 'United Arab Emirates'
                    },
                    {
                      id: 'United Kingdom',
                      label: 'United Kingdom'
                    },
                    {
                      id: 'United States of America',
                      label: 'United States of America'
                    },
                    {
                      id: 'Uruguay',
                      label: 'Uruguay'
                    },
                    {
                      id: 'Uzbekistan',
                      label: 'Uzbekistan'
                    },
                    {
                      id: 'Vanuatu',
                      label: 'Vanuatu'
                    },
                    {
                      id: 'Venezuela',
                      label: 'Venezuela'
                    },
                    {
                      id: 'Vietnam',
                      label: 'Vietnam'
                    },
                    {
                      id: 'Yemen',
                      label: 'Yemen'
                    },
                    {
                      id: 'Zambia',
                      label: 'Zambia'
                    },
                    {
                      id: 'Zimbabwe',
                      label: 'Zimbabwe'
                    }
                  ]
                }
              ],
              condition: {
                id: 'officeLocation',
                options: ['Based outside UK']
              }
            },
            {
              questions: [
                {
                  id: 'hasWebsite',
                  dataType: 'radio-group',
                  label: 'Does your innovation have a website?',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'YES',
                      label: 'Yes',
                      conditional: {
                        id: 'website',
                        dataType: 'text',
                        label: 'Website',
                        validations: {
                          isRequired: 'Website url is required',
                          urlFormat: { maxLength: 100 }
                        }
                      }
                    },
                    {
                      id: 'NO',
                      label: 'No'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'categories',
                  dataType: 'checkbox-array',
                  label: 'Select all the categories that can be used to describe your innovation',
                  validations: {
                    isRequired: 'Choose at least one category'
                  },
                  items: [
                    {
                      id: 'MEDICAL_DEVICE',
                      label: 'Medical device'
                    },
                    {
                      id: 'IN_VITRO_DIAGNOSTIC',
                      label: 'In vitro diagnostic'
                    },
                    {
                      id: 'PHARMACEUTICAL',
                      label: 'Pharmaceutical'
                    },
                    {
                      id: 'DIGITAL',
                      label: 'Digital (including apps, platforms, software)'
                    },
                    {
                      id: 'AI',
                      label: 'Artificial intelligence (AI)'
                    },
                    {
                      id: 'EDUCATION',
                      label: 'Education or training of workforce'
                    },
                    {
                      id: 'PPE',
                      label: 'Personal protective equipment (PPE)'
                    },
                    {
                      id: 'MODELS_CARE',
                      label: 'Models of care and clinical pathways'
                    },
                    {
                      id: 'ESTATES_FACILITIES',
                      label: 'Estates and facilities'
                    },
                    {
                      id: 'TRAVEL_TRANSPORT',
                      label: 'Travel and transport'
                    },
                    {
                      id: 'FOOD_NUTRITION',
                      label: 'Food and nutrition'
                    },
                    {
                      id: 'DATA_MONITORING',
                      label: 'Data and monitoring'
                    },
                    {
                      id: 'OTHER',
                      label: 'Other',
                      conditional: {
                        id: 'otherCategoryDescription',
                        dataType: 'text',
                        label: 'Other category',
                        validations: {
                          isRequired: 'Other category description is required',
                          maxLength: 100
                        }
                      }
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'mainCategory',
                  dataType: 'radio-group',
                  label: 'Select a primary category to describe your innovation',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      itemsFromAnswer: 'categories'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'areas',
                  dataType: 'checkbox-array',
                  label: 'Is your innovation relevant to any of the following areas?',
                  description:
                    'We ask this to identify the organisations and people who are in the best position to support you.',
                  validations: {
                    isRequired: 'Choose at least one option'
                  },
                  items: [
                    {
                      id: 'DATA_ANALYTICS_AND_RESEARCH',
                      label: 'Data, analytics and research'
                    },
                    {
                      id: 'DIGITALISING_SYSTEM',
                      label: 'Digitalising the system'
                    },
                    {
                      id: 'EMERGING_INFECTIOUS_DISEASES',
                      label: 'Emerging infectious diseases'
                    },
                    {
                      id: 'HOSPITAL_TO_COMMUNITY',
                      label: 'Hospital to community'
                    },
                    {
                      id: 'IMPROVING_SYSTEM_FLOW',
                      label: 'Improving system flow'
                    },
                    {
                      id: 'NET_ZERO_GREENER_INNOVATION',
                      label: 'Net zero NHS or greener innovation'
                    },
                    {
                      id: 'PATIENT_SAFETY',
                      label: 'Patient safety and quality improvement'
                    },
                    {
                      id: 'PREVENTIVE_CARE',
                      label: 'Preventive care'
                    },
                    {
                      id: 'SUPPORTING_PEOPLE_HEALTH',
                      label: 'Supporting people to manage their health'
                    },
                    {
                      id: 'WORKFORCE_RESOURCE_OPTIMISATION',
                      label: 'Workforce resource optimisation'
                    },
                    {
                      type: 'separator'
                    },
                    {
                      id: 'NONE',
                      label: 'None of those listed',
                      exclusive: true
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'careSettings',
                  dataType: 'checkbox-array',
                  label: 'In which care settings is your innovation relevant?',
                  validations: {
                    isRequired: 'Choose at least one category'
                  },
                  items: [
                    {
                      id: 'ACADEMIA',
                      label: 'Academia'
                    },
                    {
                      id: 'ACUTE_TRUSTS_INPATIENT',
                      label: 'Acute trust - inpatient'
                    },
                    {
                      id: 'ACUTE_TRUSTS_OUTPATIENT',
                      label: 'Acute trust - outpatient'
                    },
                    {
                      id: 'AMBULANCE',
                      label: 'Ambulance'
                    },
                    {
                      id: 'CARE_HOMES_CARE_SETTING',
                      label: 'Care homes or care setting'
                    },
                    {
                      id: 'END_LIFE_CARE',
                      label: 'End of life care (EOLC)'
                    },
                    {
                      id: 'ICS',
                      label: 'ICS'
                    },
                    {
                      id: 'INDUSTRY',
                      label: 'Industry'
                    },
                    {
                      id: 'LOCAL_AUTHORITY_EDUCATION',
                      label: 'Local authority - education'
                    },
                    {
                      id: 'MENTAL_HEALTH',
                      label: 'Mental health'
                    },
                    {
                      id: 'PHARMACY',
                      label: 'Pharmacies'
                    },
                    {
                      id: 'PRIMARY_CARE',
                      label: 'Primary care'
                    },
                    {
                      id: 'SOCIAL_CARE',
                      label: 'Social care'
                    },
                    {
                      id: 'THIRD_SECTOR_ORGANISATIONS',
                      label: 'Third sector organisations'
                    },
                    {
                      id: 'URGENT_AND_EMERGENCY',
                      label: 'Urgent and emergency'
                    },
                    {
                      id: 'OTHER',
                      label: 'Other',
                      conditional: {
                        id: 'otherCareSetting',
                        dataType: 'text',
                        label: 'Other care setting',
                        validations: {
                          isRequired: 'Other care setting description is required',
                          maxLength: 100
                        }
                      }
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'mainPurpose',
                  dataType: 'radio-group',
                  label: 'What is the main purpose of your innovation?',
                  description:
                    'We ask this to identify the organisations and people who are in the best position to support you.',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'PREVENT_CONDITION',
                      label: 'Preventing a condition or symptom from happening or worsening'
                    },
                    {
                      id: 'PREDICT_CONDITION',
                      label: 'Predicting the occurence of a condition or symptom'
                    },
                    {
                      id: 'DIAGNOSE_CONDITION',
                      label: 'Diagnosing a condition'
                    },
                    {
                      id: 'MONITOR_CONDITION',
                      label: 'Monitoring a condition, treatment or therapy'
                    },
                    {
                      id: 'PROVIDE_TREATMENT',
                      label: 'Providing treatment or therapy'
                    },
                    {
                      id: 'MANAGE_CONDITION',
                      label: 'Managing a condition'
                    },
                    {
                      id: 'ENABLING_CARE',
                      label: 'Enabling care, services or communication'
                    },
                    {
                      id: 'RISKS_CLIMATE_CHANGE',
                      label:
                        'Supporting the NHS to mitigate the risks or effects of climate change and severe weather conditions'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'supportDescription',
                  dataType: 'textarea',
                  label: 'What support are you seeking from the Innovation Service?',
                  description:
                    '<p>For example, support with clinical trials, product development, real-world evidence, regulatory advice, or adoption.</p><p>You will have the opportunity to explain how your innovation works and its benefits later in the record</p>',
                  validations: {
                    isRequired: 'A description is required'
                  },
                  lengthLimit: 'xl'
                }
              ]
            },
            {
              questions: [
                {
                  id: 'currentlyReceivingSupport',
                  dataType: 'textarea',
                  label: 'Are you currently receiving any support for your innovation?',
                  description:
                    'This can include any UK funding to support the development of your innovation, or any support you are currently receiving from <a href="{{urls.ORGANISATIONS_BEHIND_THE_SERVICE}}" target="_blank" rel="noopener noreferrer">NHS Innovation Service organisations (opens in a new window)</a>.',
                  validations: {
                    isRequired: 'A description is required'
                  },
                  lengthLimit: 'xl'
                }
              ]
            },
            {
              questions: [
                {
                  id: 'involvedAACProgrammes',
                  dataType: 'checkbox-array',
                  label: 'Has this innovation received support from any of these programmes?',
                  description: 'Select all that apply, or select no, if not relevant.',
                  validations: {
                    isRequired: 'Choose at least one category'
                  },
                  items: [
                    {
                      id: 'No',
                      label: 'No',
                      exclusive: true
                    },
                    {
                      type: 'separator'
                    },
                    {
                      id: 'Artificial Intelligence in Health and Care Award',
                      label: 'Artificial Intelligence in Health and Care Award'
                    },
                    {
                      id: 'Clinical Entrepreneur Programme (CEP)',
                      label: 'Clinical Entrepreneur Programme (CEP)'
                    },
                    {
                      id: 'Early Access to Medicines Scheme',
                      label: 'Early Access to Medicines Scheme'
                    },
                    {
                      id: 'Health Innovation Network (HIN)',
                      label: 'Health Innovation Network (HIN)'
                    },
                    {
                      id: 'Innovation and Technology Payment Programme',
                      label: 'Innovation and Technology Payment Programme'
                    },
                    {
                      id: 'Innovation for Healthcare Inequalities Programme (InHIP)',
                      label: 'Innovation for Healthcare Inequalities Programme (InHIP)'
                    },
                    {
                      id: 'Innovative Devices Access Pathway (IDAP)',
                      label: 'Innovative Devices Access Pathway (IDAP)'
                    },
                    {
                      id: 'Innovative Licensing and Access Pathway (ILAP)',
                      label: 'Innovative Licensing and Access Pathway (ILAP)'
                    },
                    {
                      id: 'NHS Innovation Accelerator (NIA)',
                      label: 'NHS Innovation Accelerator (NIA)'
                    },
                    {
                      id: 'NHS Insights Prioritisation Programme',
                      label: 'NHS Insights Prioritisation Programme'
                    },
                    {
                      id: 'NHS InSites Programme',
                      label: 'NHS InSites Programme'
                    },
                    {
                      id: 'Pathway Transformation Fund',
                      label: 'Pathway Transformation Fund'
                    },
                    {
                      id: 'Patient Entrepreneur Programme (PEP)',
                      label: 'Patient Entrepreneur Programme (PEP)'
                    },
                    {
                      id: 'Rapid Uptake Products Programme',
                      label: 'Rapid Uptake Products Programme'
                    },
                    {
                      id: 'Small Business Research Initiative for Healthcare (SBRI)',
                      label: 'Small Business Research Initiative for Healthcare (SBRI)'
                    },
                    {
                      id: 'Test beds',
                      label: 'Test beds'
                    }
                  ]
                }
              ]
            }
          ],
          calculatedFields: {
            countryName: [
              {
                id: 'officeLocation',
                options: ['England', 'Scotland', 'Wales', 'Northern Ireland']
              },
              {
                id: 'countryLocation',
                options: []
              }
            ]
          }
        }
      ]
    },
    {
      id: 'valueProposition',
      title: 'Value proposition',
      subSections: [
        {
          id: 'UNDERSTANDING_OF_NEEDS',
          title: 'Detailed understanding of needs and benefits',
          steps: [
            {
              questions: [
                {
                  id: 'problemsTackled',
                  dataType: 'textarea',
                  label: 'What problem is your innovation trying to solve?',
                  description:
                    "<p>Include the current consequences of the problem.</p><p>For example, the process of checking a patient's pulse to determine if there is atrial fibrillation using a finger and a watch is inherently inaccurate. Using this method approximately 25% of patients are not referred to secondary care who should be (false negative) and 15% of patients who are referred are referred unnecessarily (false positive). For those patients who are not picked up at this stage, their underlying disease will progress before being correctly diagnosed.</p>",
                  validations: {
                    isRequired: 'A description is required'
                  },
                  lengthLimit: 'l'
                }
              ]
            },
            {
              questions: [
                {
                  id: 'howInnovationWork',
                  dataType: 'textarea',
                  label: 'Give an overview of how your innovation works',
                  description:
                    '<p>If this is or might be a medical device, include the <a href="{{urls.MEDICAL_DEVICES_INTENDED_PURPOSE_STATEMENT}}" target="_blank" rel="noopener noreferrer">intended purpose statement (opens in a new window)</a>.</p><p>For example, GPs will identify patients with suspected atrial fibrillation from their history and reported symptoms. This innovation is a portable device that patients wear over a 7-day period. The device will monitor the patient’s heart rate continuously whilst they are wearing it. GPs will need to be trained in using the device and interpreting the results. GP practices will need to store the device and consumables.</p>',
                  validations: {
                    isRequired: 'A description is required'
                  },
                  lengthLimit: 'l'
                }
              ]
            },
            {
              questions: [
                {
                  id: 'hasProductServiceOrPrototype',
                  dataType: 'radio-group',
                  label: 'Do you have a working product, service or prototype?',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'YES',
                      label: 'Yes'
                    },
                    {
                      id: 'NO',
                      label: 'No'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'benefitsOrImpact',
                  dataType: 'checkbox-array',
                  label: 'What are the benefits or impact of your innovation?',
                  validations: {
                    isRequired: 'Choose at least one option'
                  },
                  items: [
                    {
                      id: 'Reduces mortality',
                      label: 'Reduces mortality',
                      group: 'Benefits for patients and people'
                    },
                    {
                      id: 'Reduces need for further treatment',
                      label: 'Reduces need for further treatment',
                      group: 'Benefits for patients and people'
                    },
                    {
                      id: 'Reduces adverse events',
                      label: 'Reduces adverse events',
                      group: 'Benefits for patients and people'
                    },
                    {
                      id: 'Enables earlier or more accurate diagnosis',
                      label: 'Enables earlier or more accurate diagnosis',
                      group: 'Benefits for patients and people'
                    },
                    {
                      id: 'Reduces risks, side effects or complications',
                      label: 'Reduces risks, side effects or complications',
                      group: 'Benefits for patients and people'
                    },
                    {
                      id: 'Prevents a condition occurring or exacerbating',
                      label: 'Prevents a condition occurring or exacerbating',
                      group: 'Benefits for patients and people'
                    },
                    {
                      id: 'Avoids a test, procedure or unnecessary treatment',
                      label: 'Avoids a test, procedure or unnecessary treatment',
                      group: 'Benefits for patients and people'
                    },
                    {
                      id: 'Enables a test, procedure or treatment to be done non-invasively',
                      label: 'Enables a test, procedure or treatment to be done non-invasively',
                      group: 'Benefits for patients and people'
                    },
                    {
                      id: 'Increases self-management',
                      label: 'Increases self-management',
                      group: 'Benefits for patients and people'
                    },
                    {
                      id: 'Increases quality of life',
                      label: 'Increases quality of life',
                      group: 'Benefits for patients and people'
                    },
                    {
                      id: 'Enables shared care',
                      label: 'Enables shared care',
                      group: 'Benefits for patients and people'
                    },
                    {
                      id: 'Alleviates pain',
                      label: 'Alleviates pain',
                      group: 'Benefits for patients and people'
                    },
                    {
                      id: 'Other benefits for patients and people',
                      label: 'Other benefits for patients and people',
                      group: 'Benefits for patients and people'
                    },
                    {
                      id: 'Reduces the length of stay or enables earlier discharge',
                      label: 'Reduces the length of stay or enables earlier discharge',
                      group: 'Benefits for the NHS and social care'
                    },
                    {
                      id: 'Reduces need for adult or paediatric critical care',
                      label: 'Reduces need for adult or paediatric critical care',
                      group: 'Benefits for the NHS and social care'
                    },
                    {
                      id: 'Reduces emergency admissions',
                      label: 'Reduces emergency admissions',
                      group: 'Benefits for the NHS and social care'
                    },
                    {
                      id: 'Changes delivery of care from secondary care(for example hospitals) to primary care(for example GP or community services)',
                      label:
                        'Changes delivery of care from secondary care(for example hospitals) to primary care(for example GP or community services)',
                      group: 'Benefits for the NHS and social care'
                    },
                    {
                      id: 'Change in delivery of care from inpatient to day case',
                      label: 'Change in delivery of care from inpatient to day case',
                      group: 'Benefits for the NHS and social care'
                    },
                    {
                      id: 'Increases compliance',
                      label: 'Increases compliance',
                      group: 'Benefits for the NHS and social care'
                    },
                    {
                      id: 'Improves patient management or coordination of care or services',
                      label: 'Improves patient management or coordination of care or services',
                      group: 'Benefits for the NHS and social care'
                    },
                    {
                      id: 'Reduces referrals',
                      label: 'Reduces referrals',
                      group: 'Benefits for the NHS and social care'
                    },
                    {
                      id: 'Takes less time',
                      label: 'Takes less time',
                      group: 'Benefits for the NHS and social care'
                    },
                    {
                      id: 'Uses no staff or a lower grade of staff',
                      label: 'Uses no staff or a lower grade of staff',
                      group: 'Benefits for the NHS and social care'
                    },
                    {
                      id: 'Leads to fewer appointments',
                      label: 'Leads to fewer appointments',
                      group: 'Benefits for the NHS and social care'
                    },
                    {
                      id: 'Is cost saving',
                      label: 'Is cost saving',
                      group: 'Benefits for the NHS and social care'
                    },
                    {
                      id: 'Increases efficiency',
                      label: 'Increases efficiency',
                      group: 'Benefits for the NHS and social care'
                    },
                    {
                      id: 'Improves performance',
                      label: 'Improves performance',
                      group: 'Benefits for the NHS and social care'
                    },
                    {
                      id: 'Reduces carbon emissions and supports the NHS to achieve net zero',
                      label: 'Reduces carbon emissions and supports the NHS to achieve net zero',
                      group: 'Benefits for the NHS and social care'
                    },
                    {
                      id: 'Other environmental benefits',
                      label: 'Other environmental benefits',
                      group: 'Benefits for the NHS and social care'
                    },
                    {
                      id: 'Other benefits for the NHS and social care',
                      label: 'Other benefits for the NHS and social care',
                      group: 'Benefits for the NHS and social care'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'impactDiseaseCondition',
                  dataType: 'radio-group',
                  label: 'Does your innovation impact a disease or condition?',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'YES',
                      label: 'Yes'
                    },
                    {
                      id: 'NO',
                      label: 'No'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'diseasesConditionsImpact',
                  dataType: 'autocomplete-array',
                  label: 'What diseases or conditions does your innovation impact?',
                  description: 'Start typing to view conditions. You can select as many conditions as you like.',
                  validations: {
                    isRequired: 'You must choose at least one disease or condition'
                  },
                  items: [
                    {
                      id: 'BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS',
                      label: 'Blood and immune system conditions'
                    },
                    {
                      id: 'BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_ALLERGIES',
                      label: 'Blood and immune system conditions - Allergies'
                    },
                    {
                      id: 'BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_ANAPHYLAXIS',
                      label: 'Blood and immune system conditions - Anaphylaxis'
                    },
                    {
                      id: 'BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_BLOOD_CONDITIONS',
                      label: 'Blood and immune system conditions - Blood conditions'
                    },
                    {
                      id: 'BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_LYMPHOEDEMA',
                      label: 'Blood and immune system conditions - Lymphoedema'
                    },
                    {
                      id: 'BLOOD_AND_IMMUNE_SYSTEM_CONDITIONS_SYSTEMIC_LUPUS_ERYTHEMATOSUS',
                      label: 'Blood and immune system conditions - Systemic lupus erythematosus'
                    },
                    {
                      id: 'CANCER',
                      label: 'Cancer'
                    },
                    {
                      id: 'CANCER_BLADDER_CANCER',
                      label: 'Cancer - Bladder cancer'
                    },
                    {
                      id: 'CANCER_BLOOD_AND_BONE_MARROW_CANCERS',
                      label: 'Cancer - Blood and bone marrow cancers'
                    },
                    {
                      id: 'CANCER_BRAIN_CANCERS',
                      label: 'Cancer - Brain cancers'
                    },
                    {
                      id: 'CANCER_BREAST_CANCER',
                      label: 'Cancer - Breast cancer'
                    },
                    {
                      id: 'CANCER_CERVICAL_CANCER',
                      label: 'Cancer - Cervical cancer'
                    },
                    {
                      id: 'CANCER_COLORECTAL_CANCER',
                      label: 'Cancer - Colorectal cancer'
                    },
                    {
                      id: 'CANCER_COMPLICATIONS_OF_CANCER',
                      label: 'Cancer - Complications of cancer'
                    },
                    {
                      id: 'CANCER_ENDOMETRIAL_CANCERS',
                      label: 'Cancer - Endometrial cancers'
                    },
                    {
                      id: 'CANCER_HEAD_AND_NECK_CANCERS',
                      label: 'Cancer - Head and neck cancers'
                    },
                    {
                      id: 'CANCER_LIVER_CANCERS',
                      label: 'Cancer - Liver cancers'
                    },
                    {
                      id: 'CANCER_LUNG_CANCER',
                      label: 'Cancer - Lung cancer'
                    },
                    {
                      id: 'CANCER_METASTASES',
                      label: 'Cancer - Metastases'
                    },
                    {
                      id: 'CANCER_OESOPHAGEAL_CANCER',
                      label: 'Cancer - Oesophageal cancer'
                    },
                    {
                      id: 'CANCER_OVARIAN_CANCER',
                      label: 'Cancer - Ovarian cancer'
                    },
                    {
                      id: 'CANCER_PANCREATIC_CANCER',
                      label: 'Cancer - Pancreatic cancer'
                    },
                    {
                      id: 'CANCER_PENILE_AND_TESTICULAR_CANCER',
                      label: 'Cancer - Penile and testicular cancer'
                    },
                    {
                      id: 'CANCER_PERITONEAL_CANCER',
                      label: 'Cancer - Peritoneal cancer'
                    },
                    {
                      id: 'CANCER_PROSTATE_CANCER',
                      label: 'Cancer - Prostate cancer'
                    },
                    {
                      id: 'CANCER_RENAL_CANCER',
                      label: 'Cancer - Renal cancer'
                    },
                    {
                      id: 'CANCER_SARCOMA',
                      label: 'Cancer - Sarcoma'
                    },
                    {
                      id: 'CANCER_SKIN_CANCER',
                      label: 'Cancer - Skin cancer'
                    },
                    {
                      id: 'CANCER_STOMACH_CANCER',
                      label: 'Cancer - Stomach cancer'
                    },
                    {
                      id: 'CANCER_THYROID_CANCER',
                      label: 'Cancer - Thyroid cancer'
                    },
                    {
                      id: 'CANCER_UPPER_AIRWAYS_TRACT_CANCERS',
                      label: 'Cancer - Upper airways tract cancers'
                    },
                    {
                      id: 'CARDIOVASCULAR_CONDITIONS',
                      label: 'Cardiovascular conditions'
                    },
                    {
                      id: 'CARDIOVASCULAR_CONDITIONS_ACUTE_CORONARY_SYNDROMES',
                      label: 'Cardiovascular conditions - Acute coronary syndromes'
                    },
                    {
                      id: 'CARDIOVASCULAR_CONDITIONS_AORTIC_ANEURYSMS',
                      label: 'Cardiovascular conditions - Aortic aneurysms'
                    },
                    {
                      id: 'CARDIOVASCULAR_CONDITIONS_CRANIAL_ANEURYSMS',
                      label: 'Cardiovascular conditions - Cranial aneurysms'
                    },
                    {
                      id: 'CARDIOVASCULAR_CONDITIONS_EMBOLISM_AND_THROMBOSIS',
                      label: 'Cardiovascular conditions - Embolism and thrombosis'
                    },
                    {
                      id: 'CARDIOVASCULAR_CONDITIONS_HEART_FAILURE',
                      label: 'Cardiovascular conditions - Heart failure'
                    },
                    {
                      id: 'CARDIOVASCULAR_CONDITIONS_HEART_RHYTHM_CONDITIONS',
                      label: 'Cardiovascular conditions - Heart rhythm conditions'
                    },
                    {
                      id: 'CARDIOVASCULAR_CONDITIONS_HYPERTENSION',
                      label: 'Cardiovascular conditions - Hypertension'
                    },
                    {
                      id: 'CARDIOVASCULAR_CONDITIONS_PERIPHERAL_CIRCULATORY_CONDITIONS',
                      label: 'Cardiovascular conditions - Peripheral circulatory conditions'
                    },
                    {
                      id: 'CARDIOVASCULAR_CONDITIONS_STABLE_ANGINA',
                      label: 'Cardiovascular conditions - Stable angina'
                    },
                    {
                      id: 'CARDIOVASCULAR_CONDITIONS_STROKE_AND_TRANSIENT_ISCHAEMIC_ATTACK',
                      label: 'Cardiovascular conditions - Stroke and transient ischaemic attack'
                    },
                    {
                      id: 'CARDIOVASCULAR_CONDITIONS_STRUCTURAL_HEART_DEFECTS',
                      label: 'Cardiovascular conditions - Structural heart defects'
                    },
                    {
                      id: 'CARDIOVASCULAR_CONDITIONS_VARICOSE_VEINS',
                      label: 'Cardiovascular conditions - Varicose veins'
                    },
                    {
                      id: 'CHRONIC_AND_NEUROPATHIC_PAIN',
                      label: 'Chronic and neuropathic pain'
                    },
                    {
                      id: 'CHRONIC_FATIGUE_SYNDROME',
                      label: 'Chronic fatigue syndrome'
                    },
                    {
                      id: 'CYSTIC_FIBROSIS',
                      label: 'Cystic fibrosis'
                    },
                    {
                      id: 'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS',
                      label: 'Diabetes and other endocrinal, nutritional and metabolic conditions'
                    },
                    {
                      id: 'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_ADRENAL_DYSFUNCTION',
                      label: 'Diabetes and other endocrinal, nutritional and metabolic conditions - Adrenal dysfunction'
                    },
                    {
                      id: 'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_DIABETES',
                      label: 'Diabetes and other endocrinal, nutritional and metabolic conditions - Diabetes'
                    },
                    {
                      id: 'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_FAILURE_TO_THRIVE',
                      label: 'Diabetes and other endocrinal, nutritional and metabolic conditions - Failure to thrive'
                    },
                    {
                      id: 'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_LIPID_DISORDERS',
                      label: 'Diabetes and other endocrinal, nutritional and metabolic conditions - Lipid disorders'
                    },
                    {
                      id: 'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_MALNUTRITION',
                      label: 'Diabetes and other endocrinal, nutritional and metabolic conditions - Malnutrition'
                    },
                    {
                      id: 'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_METABOLIC_CONDITIONS',
                      label:
                        'Diabetes and other endocrinal, nutritional and metabolic conditions - Metabolic conditions'
                    },
                    {
                      id: 'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_OBESITY',
                      label: 'Diabetes and other endocrinal, nutritional and metabolic conditions - Obesity'
                    },
                    {
                      id: 'DIABETES_AND_OTHER_ENDOCRINAL_NUTRITIONAL_AND_METABOLIC_CONDITIONS_THYROID_DISORDERS',
                      label: 'Diabetes and other endocrinal, nutritional and metabolic conditions - Thyroid disorders'
                    },
                    {
                      id: 'DIGESTIVE_TRACT_CONDITIONS',
                      label: 'Digestive tract conditions'
                    },
                    {
                      id: 'DIGESTIVE_TRACT_CONDITIONS_CHOLELITHIASIS_AND_CHOLECYSTITIS',
                      label: 'Digestive tract conditions - Cholelithiasis and cholecystitis'
                    },
                    {
                      id: 'DIGESTIVE_TRACT_CONDITIONS_COELIAC_DISEASE',
                      label: 'Digestive tract conditions - Coeliac disease'
                    },
                    {
                      id: 'DIGESTIVE_TRACT_CONDITIONS_CONSTIPATION',
                      label: 'Digestive tract conditions - Constipation'
                    },
                    {
                      id: 'DIGESTIVE_TRACT_CONDITIONS_DIARRHOEA_AND_VOMITING',
                      label: 'Digestive tract conditions - Diarrhoea and vomiting'
                    },
                    {
                      id: 'DIGESTIVE_TRACT_CONDITIONS_DIVERTICULAR_DISEASE',
                      label: 'Digestive tract conditions - Diverticular disease'
                    },
                    {
                      id: 'DIGESTIVE_TRACT_CONDITIONS_FAECAL_INCONTINENCE',
                      label: 'Digestive tract conditions - Faecal incontinence'
                    },
                    {
                      id: 'DIGESTIVE_TRACT_CONDITIONS_GASTRO_OESOPHAGEAL_REFLUX_INCLUDING_BARRETTS_OESOPHAGUS',
                      label: "Digestive tract conditions - Gastro-oesophageal reflux, including Barrett's oesophagus"
                    },
                    {
                      id: 'DIGESTIVE_TRACT_CONDITIONS_GASTROPARESIS',
                      label: 'Digestive tract conditions - Gastroparesis'
                    },
                    {
                      id: 'DIGESTIVE_TRACT_CONDITIONS_HAEMORRHOIDS_AND_OTHER_ANAL_CONDITIONS',
                      label: 'Digestive tract conditions - Haemorrhoids and other anal conditions'
                    },
                    {
                      id: 'DIGESTIVE_TRACT_CONDITIONS_HERNIA',
                      label: 'Digestive tract conditions - Hernia'
                    },
                    {
                      id: 'DIGESTIVE_TRACT_CONDITIONS_INFLAMMATORY_BOWEL_DISEASE',
                      label: 'Digestive tract conditions - Inflammatory bowel disease'
                    },
                    {
                      id: 'DIGESTIVE_TRACT_CONDITIONS_IRRITABLE_BOWEL_SYNDROME',
                      label: 'Digestive tract conditions - Irritable bowel syndrome'
                    },
                    {
                      id: 'DIGESTIVE_TRACT_CONDITIONS_LOWER_GASTROINTESTINAL_LESIONS',
                      label: 'Digestive tract conditions - Lower gastrointestinal lesions'
                    },
                    {
                      id: 'DIGESTIVE_TRACT_CONDITIONS_PANCREATITIS',
                      label: 'Digestive tract conditions - Pancreatitis'
                    },
                    {
                      id: 'DIGESTIVE_TRACT_CONDITIONS_UPPER_GASTROINTESTINAL_BLEEDING',
                      label: 'Digestive tract conditions - Upper gastrointestinal bleeding'
                    },
                    {
                      id: 'EAR_NOSE_AND_THROAT_CONDITIONS',
                      label: 'Ear, nose and throat conditions'
                    },
                    {
                      id: 'EYE_CONDITIONS',
                      label: 'Eye conditions'
                    },
                    {
                      id: 'FERTILITY_PREGNANCY_AND_CHILDBIRTH',
                      label: 'Fertility, pregnancy and childbirth'
                    },
                    {
                      id: 'FERTILITY_PREGNANCY_AND_CHILDBIRTH_CONTRACEPTION',
                      label: 'Fertility, pregnancy and childbirth - Contraception'
                    },
                    {
                      id: 'FERTILITY_PREGNANCY_AND_CHILDBIRTH_FERTILITY',
                      label: 'Fertility, pregnancy and childbirth - Fertility'
                    },
                    {
                      id: 'FERTILITY_PREGNANCY_AND_CHILDBIRTH_INTRAPARTUM_CARE',
                      label: 'Fertility, pregnancy and childbirth - Intrapartum care'
                    },
                    {
                      id: 'FERTILITY_PREGNANCY_AND_CHILDBIRTH_POSTNATAL_CARE',
                      label: 'Fertility, pregnancy and childbirth - Postnatal care'
                    },
                    {
                      id: 'FERTILITY_PREGNANCY_AND_CHILDBIRTH_PREGNANCY',
                      label: 'Fertility, pregnancy and childbirth - Pregnancy'
                    },
                    {
                      id: 'FERTILITY_PREGNANCY_AND_CHILDBIRTH_TERMINATION_OF_PREGNANCY_SERVICES',
                      label: 'Fertility, pregnancy and childbirth - Termination of pregnancy services'
                    },
                    {
                      id: 'GENETIC_CONDITIONS',
                      label: 'Genetic conditions'
                    },
                    {
                      id: 'GYNAECOLOGICAL_CONDITIONS',
                      label: 'Gynaecological conditions'
                    },
                    {
                      id: 'GYNAECOLOGICAL_CONDITIONS_ENDOMETRIOSIS_AND_FIBROIDS',
                      label: 'Gynaecological conditions - Endometriosis and fibroids'
                    },
                    {
                      id: 'GYNAECOLOGICAL_CONDITIONS_HEAVY_MENSTRUAL_BLEEDING',
                      label: 'Gynaecological conditions - Heavy menstrual bleeding'
                    },
                    {
                      id: 'GYNAECOLOGICAL_CONDITIONS_MENOPAUSE',
                      label: 'Gynaecological conditions - Menopause'
                    },
                    {
                      id: 'GYNAECOLOGICAL_CONDITIONS_UTERINE_PROLAPSE',
                      label: 'Gynaecological conditions - Uterine prolapse'
                    },
                    {
                      id: 'GYNAECOLOGICAL_CONDITIONS_VAGINAL_CONDITIONS',
                      label: 'Gynaecological conditions - Vaginal conditions'
                    },
                    {
                      id: 'INFECTIONS',
                      label: 'Infections'
                    },
                    {
                      id: 'INFECTIONS_ANTIMICROBIAL_STEWARDSHIP',
                      label: 'Infections - Antimicrobial stewardship'
                    },
                    {
                      id: 'INFECTIONS_BITES_AND_STINGS',
                      label: 'Infections - Bites and stings'
                    },
                    {
                      id: 'INFECTIONS_COVID_19',
                      label: 'Infections - COVID-19'
                    },
                    {
                      id: 'INFECTIONS_FEVERISH_ILLNESS',
                      label: 'Infections - Feverish illness'
                    },
                    {
                      id: 'INFECTIONS_HEALTHCARE_ASSOCIATED_INFECTIONS',
                      label: 'Infections - Healthcare-associated infections'
                    },
                    {
                      id: 'INFECTIONS_HIV_AND_AIDS',
                      label: 'Infections - HIV and AIDS'
                    },
                    {
                      id: 'INFECTIONS_INFLUENZA',
                      label: 'Infections - Influenza'
                    },
                    {
                      id: 'INFECTIONS_MENINGITIS_AND_MENINGOCOCCAL_SEPTICAEMIA',
                      label: 'Infections - Meningitis and meningococcal septicaemia'
                    },
                    {
                      id: 'INFECTIONS_SEPSIS',
                      label: 'Infections - Sepsis'
                    },
                    {
                      id: 'INFECTIONS_SKIN_INFECTIONS',
                      label: 'Infections - Skin infections'
                    },
                    {
                      id: 'INFECTIONS_TUBERCULOSIS',
                      label: 'Infections - Tuberculosis'
                    },
                    {
                      id: 'INJURIES_ACCIDENTS_AND_WOUNDS',
                      label: 'Injuries, accidents and wounds'
                    },
                    {
                      id: 'KIDNEY_CONDITIONS',
                      label: 'Kidney conditions'
                    },
                    {
                      id: 'KIDNEY_CONDITIONS_ACUTE_KIDNEY_INJURY',
                      label: 'Kidney conditions - Acute kidney injury'
                    },
                    {
                      id: 'KIDNEY_CONDITIONS_CHRONIC_KIDNEY_DISEASE',
                      label: 'Kidney conditions - Chronic kidney disease'
                    },
                    {
                      id: 'KIDNEY_CONDITIONS_RENAL_STONES',
                      label: 'Kidney conditions - Renal stones'
                    },
                    {
                      id: 'LIVER_CONDITIONS',
                      label: 'Liver conditions'
                    },
                    {
                      id: 'LIVER_CONDITIONS_CHRONIC_LIVER_DISEASE',
                      label: 'Liver conditions - Chronic liver disease'
                    },
                    {
                      id: 'LIVER_CONDITIONS_HEPATITIS',
                      label: 'Liver conditions - Hepatitis'
                    },
                    {
                      id: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS',
                      label: 'Mental health and behavioural conditions'
                    },
                    {
                      id: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_ADDICTION',
                      label: 'Mental health and behavioural conditions - Addiction'
                    },
                    {
                      id: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_ALCOHOL_USE_DISORDERS',
                      label: 'Mental health and behavioural conditions - Alcohol-use disorders'
                    },
                    {
                      id: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_ANXIETY',
                      label: 'Mental health and behavioural conditions - Anxiety'
                    },
                    {
                      id: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_ATTENTION_DEFICIT_DISORDER',
                      label: 'Mental health and behavioural conditions - Attention deficit disorder'
                    },
                    {
                      id: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_AUTISM',
                      label: 'Mental health and behavioural conditions - Autism'
                    },
                    {
                      id: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_BIPOLAR_DISORDER',
                      label: 'Mental health and behavioural conditions - Bipolar disorder'
                    },
                    {
                      id: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_DELIRIUM',
                      label: 'Mental health and behavioural conditions - Delirium'
                    },
                    {
                      id: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_DEMENTIA',
                      label: 'Mental health and behavioural conditions - Dementia'
                    },
                    {
                      id: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_DEPRESSION',
                      label: 'Mental health and behavioural conditions - Depression'
                    },
                    {
                      id: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_DRUG_MISUSE',
                      label: 'Mental health and behavioural conditions - Drug misuse'
                    },
                    {
                      id: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_EATING_DISORDERS',
                      label: 'Mental health and behavioural conditions - Eating disorders'
                    },
                    {
                      id: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_MENTAL_HEALTH_SERVICES',
                      label: 'Mental health and behavioural conditions - Mental health services'
                    },
                    {
                      id: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_PERSONALITY_DISORDERS',
                      label: 'Mental health and behavioural conditions - Personality disorders'
                    },
                    {
                      id: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_PSYCHOSIS_AND_SCHIZOPHRENIA',
                      label: 'Mental health and behavioural conditions - Psychosis and schizophrenia'
                    },
                    {
                      id: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_SELF_HARM',
                      label: 'Mental health and behavioural conditions - Self-harm'
                    },
                    {
                      id: 'MENTAL_HEALTH_AND_BEHAVIOURAL_CONDITIONS_SUICIDE_PREVENTION',
                      label: 'Mental health and behavioural conditions - Suicide prevention'
                    },
                    {
                      id: 'MULTIPLE_LONG_TERM_CONDITIONS',
                      label: 'Multiple long-term conditions'
                    },
                    {
                      id: 'MUSCULOSKELETAL_CONDITIONS',
                      label: 'Musculoskeletal conditions'
                    },
                    {
                      id: 'MUSCULOSKELETAL_CONDITIONS_ARTHRITIS',
                      label: 'Musculoskeletal conditions - Arthritis'
                    },
                    {
                      id: 'MUSCULOSKELETAL_CONDITIONS_FRACTURES',
                      label: 'Musculoskeletal conditions - Fractures'
                    },
                    {
                      id: 'MUSCULOSKELETAL_CONDITIONS_HIP_CONDITIONS',
                      label: 'Musculoskeletal conditions - Hip conditions'
                    },
                    {
                      id: 'MUSCULOSKELETAL_CONDITIONS_JOINT_REPLACEMENT',
                      label: 'Musculoskeletal conditions - Joint replacement'
                    },
                    {
                      id: 'MUSCULOSKELETAL_CONDITIONS_KNEE_CONDITIONS',
                      label: 'Musculoskeletal conditions - Knee conditions'
                    },
                    {
                      id: 'MUSCULOSKELETAL_CONDITIONS_LOW_BACK_PAIN',
                      label: 'Musculoskeletal conditions - Low back pain'
                    },
                    {
                      id: 'MUSCULOSKELETAL_CONDITIONS_MAXILLOFACIAL_CONDITIONS',
                      label: 'Musculoskeletal conditions - Maxillofacial conditions'
                    },
                    {
                      id: 'MUSCULOSKELETAL_CONDITIONS_OSTEOPOROSIS',
                      label: 'Musculoskeletal conditions - Osteoporosis'
                    },
                    {
                      id: 'MUSCULOSKELETAL_CONDITIONS_SPINAL_CONDITIONS',
                      label: 'Musculoskeletal conditions - Spinal conditions'
                    },
                    {
                      id: 'NEUROLOGICAL_CONDITIONS',
                      label: 'Neurological conditions'
                    },
                    {
                      id: 'NEUROLOGICAL_CONDITIONS_EPILEPSY',
                      label: 'Neurological conditions - Epilepsy'
                    },
                    {
                      id: 'NEUROLOGICAL_CONDITIONS_HEADACHES',
                      label: 'Neurological conditions - Headaches'
                    },
                    {
                      id: 'NEUROLOGICAL_CONDITIONS_METASTATIC_SPINAL_CORD_COMPRESSION',
                      label: 'Neurological conditions - Metastatic spinal cord compression'
                    },
                    {
                      id: 'NEUROLOGICAL_CONDITIONS_MOTOR_NEURONE_DISEASE',
                      label: 'Neurological conditions - Motor neurone disease'
                    },
                    {
                      id: 'NEUROLOGICAL_CONDITIONS_MULTIPLE_SCLEROSIS',
                      label: 'Neurological conditions - Multiple sclerosis'
                    },
                    {
                      id: 'NEUROLOGICAL_CONDITIONS_PARKINSONS_DISEASE_TREMOR_AND_DYSTONIA',
                      label: "Neurological conditions - Parkinson's disease, tremor and dystonia"
                    },
                    {
                      id: 'NEUROLOGICAL_CONDITIONS_SPASTICITY',
                      label: 'Neurological conditions - Spasticity'
                    },
                    {
                      id: 'NEUROLOGICAL_CONDITIONS_TRANSIENT_LOSS_OF_CONSCIOUSNESS',
                      label: 'Neurological conditions - Transient loss of consciousness'
                    },
                    {
                      id: 'ORAL_AND_DENTAL_HEALTH',
                      label: 'Oral and dental health'
                    },
                    {
                      id: 'RARE_CONDITIONS',
                      label: 'Rare conditions'
                    },
                    {
                      id: 'RESPIRATORY_CONDITIONS',
                      label: 'Respiratory conditions'
                    },
                    {
                      id: 'RESPIRATORY_CONDITIONS_ASTHMA',
                      label: 'Respiratory conditions - Asthma'
                    },
                    {
                      id: 'RESPIRATORY_CONDITIONS_CHRONIC_OBSTRUCTIVE_PULMONARY_DISEASE',
                      label: 'Respiratory conditions - Chronic obstructive pulmonary disease'
                    },
                    {
                      id: 'RESPIRATORY_CONDITIONS_CYSTIC_FIBROSIS',
                      label: 'Respiratory conditions - Cystic fibrosis'
                    },
                    {
                      id: 'RESPIRATORY_CONDITIONS_MESOTHELIOMA',
                      label: 'Respiratory conditions - Mesothelioma'
                    },
                    {
                      id: 'RESPIRATORY_CONDITIONS_PNEUMONIA',
                      label: 'Respiratory conditions - Pneumonia'
                    },
                    {
                      id: 'RESPIRATORY_CONDITIONS_PULMONARY_FIBROSIS',
                      label: 'Respiratory conditions - Pulmonary fibrosis'
                    },
                    {
                      id: 'RESPIRATORY_CONDITIONS_RESPIRATORY_INFECTIONS',
                      label: 'Respiratory conditions - Respiratory infections'
                    },
                    {
                      id: 'SKIN_CONDITIONS',
                      label: 'Skin conditions'
                    },
                    {
                      id: 'SKIN_CONDITIONS_ACNE',
                      label: 'Skin conditions - Acne'
                    },
                    {
                      id: 'SKIN_CONDITIONS_DIABETIC_FOOT',
                      label: 'Skin conditions - Diabetic foot'
                    },
                    {
                      id: 'SKIN_CONDITIONS_ECZEMA',
                      label: 'Skin conditions - Eczema'
                    },
                    {
                      id: 'SKIN_CONDITIONS_PRESSURE_ULCERS',
                      label: 'Skin conditions - Pressure ulcers'
                    },
                    {
                      id: 'SKIN_CONDITIONS_PSORIASIS',
                      label: 'Skin conditions - Psoriasis'
                    },
                    {
                      id: 'SKIN_CONDITIONS_WOUND_MANAGEMENT',
                      label: 'Skin conditions - Wound management'
                    },
                    {
                      id: 'SLEEP_AND_SLEEP_CONDITIONS',
                      label: 'Sleep and sleep conditions'
                    },
                    {
                      id: 'UROLOGICAL_CONDITIONS',
                      label: 'Urological conditions'
                    },
                    {
                      id: 'UROLOGICAL_CONDITIONS_LOWER_URINARY_TRACT_SYMPTOMS',
                      label: 'Urological conditions - Lower urinary tract symptoms'
                    },
                    {
                      id: 'UROLOGICAL_CONDITIONS_URINARY_INCONTINENCE',
                      label: 'Urological conditions - Urinary incontinence'
                    },
                    {
                      id: 'UROLOGICAL_CONDITIONS_URINARY_TRACT_INFECTION',
                      label: 'Urological conditions - Urinary tract infection'
                    }
                  ]
                }
              ],
              condition: {
                id: 'impactDiseaseCondition',
                options: ['YES']
              }
            },
            {
              questions: [
                {
                  id: 'estimatedCarbonReductionSavings',
                  dataType: 'radio-group',
                  label: 'Have you estimated the carbon reduction or savings that your innovation will bring?',
                  description:
                    '<p>All NHS suppliers will be expected to provide the carbon footprint associated with the use of their innovation, as outlined in the <a href="{{urls.DELIVERING_A_NET_ZERO_NHS}}" target="_blank" rel="noopener noreferrer">Delivering a Net Zero NHS report (opens in a new window)</a>.</p><p>If this is something you are unsure of, the NHS Innovation Service can support you with this.</p>',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'YES',
                      label: 'Yes'
                    },
                    {
                      id: 'NOT_YET',
                      label: 'Not yet, but I have an idea'
                    },
                    {
                      id: 'NO',
                      label: 'No'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'estimatedCarbonReductionSavingsDescriptionA',
                  dataType: 'textarea',
                  label: 'Provide the estimates and how this was calculated',
                  validations: {
                    isRequired: 'A description is required'
                  },
                  lengthLimit: 'xl'
                }
              ],
              condition: {
                id: 'estimatedCarbonReductionSavings',
                options: ['YES']
              }
            },
            {
              questions: [
                {
                  id: 'estimatedCarbonReductionSavingsDescriptionB',
                  dataType: 'textarea',
                  label: 'Explain how you plan to calculate carbon reduction savings',
                  validations: {
                    isRequired: 'A description is required'
                  },
                  lengthLimit: 'xl'
                }
              ],
              condition: {
                id: 'estimatedCarbonReductionSavings',
                options: ['NOT_YET']
              }
            },
            {
              questions: [
                {
                  id: 'carbonReductionPlan',
                  dataType: 'radio-group',
                  label: 'Do you have or are you working on a carbon reduction plan (CRP)?',
                  description:
                    'All NHS suppliers will require a carbon reduction plan (CRP), as outlined in the <a href="{{urls.SUPPLIERS}}" target="_blank" rel="noopener noreferrer">NHS Suppliers Roadmap plan (opens in a new window)</a>.',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'YES',
                      label: 'Yes, I have one'
                    },
                    {
                      id: 'WORKING_ON',
                      label: 'I am working on one'
                    },
                    {
                      id: 'NO',
                      label: 'No, I do not have one'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'keyHealthInequalities',
                  dataType: 'checkbox-array',
                  label: 'Which key health inequalities does your innovation impact?',
                  description:
                    '<p>Core20PLUS5 is a national NHS England approach to support the reduction of health inequalities, defining target populations and clinical areas that require improvement.</p><p>More information is available on the <a href="{{urls.CORE20PLUS5}}" target="_blank" rel="noopener noreferrer">Core20PLUS5 web page (opens in a new window)</a>.</p>',
                  validations: {
                    isRequired: 'Choose at least one item'
                  },
                  items: [
                    {
                      id: 'MATERNITY',
                      label: 'Maternity'
                    },
                    {
                      id: 'SEVER_MENTAL_ILLNESS',
                      label: 'Severe mental illness'
                    },
                    {
                      id: 'CHRONIC_RESPIRATORY_DISEASE',
                      label: 'Chronic respiratory disease'
                    },
                    {
                      id: 'EARLY_CANCER_DIAGNOSIS',
                      label: 'Early cancer diagnosis'
                    },
                    {
                      id: 'HYPERTENSION_CASE_FINDING',
                      label: 'Hypertension case finding and optimal management and lipid optimal management'
                    },
                    {
                      type: 'separator'
                    },
                    {
                      id: 'NONE',
                      label: 'None of those listed',
                      exclusive: true
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'completedHealthInequalitiesImpactAssessment',
                  dataType: 'radio-group',
                  label: 'Have you completed a health inequalities impact assessment?',
                  description:
                    '<p>By this, we mean a document or template which assesses the impact of your innovation on health inequalities and on those with protected characteristics. Health inequalities are the unfair and avoidable differences in health across the population, and between different groups within society.</p><p>An example of a completed health inequalities impact assessment can be found on <a href="{{urls.EQUALITY_AND_HEALTH_INEQUALITIES_IMPACT_ASSESSMENT_EHIA}}" target="_blank" rel="noopener noreferrer">NHS England\'s web page (opens in a new window)</a>.</p>',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'YES',
                      label: 'Yes'
                    },
                    {
                      id: 'NO',
                      label: 'No'
                    }
                  ]
                }
              ]
            }
          ],
          hasFiles: true
        },
        {
          id: 'EVIDENCE_OF_EFFECTIVENESS',
          title: 'Evidence of impact and benefit',
          steps: [
            {
              questions: [
                {
                  id: 'hasEvidence',
                  dataType: 'radio-group',
                  label: 'Do you have any evidence to show the impact or benefits of your innovation?',
                  description: "You'll have the opportunity to add evidence at the end of this section.",
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'YES',
                      label: 'Yes'
                    },
                    {
                      id: 'NOT_YET',
                      label: 'Not yet'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'currentlyCollectingEvidence',
                  dataType: 'radio-group',
                  label: 'Are you currently collecting evidence, or have plans to collect evidence?',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'YES',
                      label: 'Yes'
                    },
                    {
                      id: 'NO',
                      label: 'No'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'summaryOngoingEvidenceGathering',
                  dataType: 'textarea',
                  label:
                    'Write a short summary of your ongoing or planned evidence gathering, including the IRAS number if known.',
                  description:
                    'An IRAS ID is a unique identifier, which is generated by IRAS when you first create a project. It is the accepted common study identifier, allowing research to be traced across its study lifecycle. For more information visit the <a href="{{urls.MY_RESEARCH_PROJECT}}" target="_blank" rel="noopener noreferrer">IRAS website (opens in a new window)</a>.',
                  validations: {
                    isRequired: 'A description is required'
                  },
                  lengthLimit: 'l'
                }
              ],
              condition: {
                id: 'currentlyCollectingEvidence',
                options: ['YES']
              }
            },
            {
              questions: [
                {
                  id: 'needsSupportAnyArea',
                  dataType: 'checkbox-array',
                  label: 'Do you need support with any of these areas?',
                  validations: {
                    isRequired: 'Choose at least one item'
                  },
                  items: [
                    {
                      id: 'RESEARCH_GOVERNANCE',
                      label: 'Research governance, including research ethics approvals'
                    },
                    {
                      id: 'DATA_SHARING',
                      label: 'Accessing and sharing health and care data'
                    },
                    {
                      id: 'CONFIDENTIAL_PATIENT_DATA',
                      label: 'Use of confidential patient data'
                    },
                    {
                      id: 'APPROVAL_DATA_STUDIES',
                      label: 'Approval of data studies'
                    },
                    {
                      id: 'UNDERSTANDING_LAWS',
                      label: 'Understanding the laws that regulate the use of health and care data'
                    },
                    {
                      type: 'separator'
                    },
                    {
                      id: 'DO_NOT_NEED_SUPPORT',
                      label: 'No, I do not need support',
                      exclusive: true
                    }
                  ]
                }
              ]
            }
          ],
          hasFiles: true
        }
      ]
    },
    {
      id: 'marketResearchAndCurrentCarePathway',
      title: 'Market research and current care pathway',
      subSections: [
        {
          id: 'MARKET_RESEARCH',
          title: 'Market research',
          steps: [
            {
              questions: [
                {
                  id: 'hasMarketResearch',
                  dataType: 'radio-group',
                  label:
                    'Have you conducted market research to determine the demand and need for your innovation in the UK?',
                  description:
                    'By this, we mean any research you have done to determine the market opportunity for your innovation. You will be able to explain any testing you have done with users later in the record.',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'YES',
                      label: 'Yes'
                    },
                    {
                      id: 'IN_PROGRESS',
                      label: "I'm currently doing market research"
                    },
                    {
                      id: 'NOT_YET',
                      label: 'Not yet'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'marketResearch',
                  dataType: 'textarea',
                  label: 'Describe the market research you have done, or are doing, within the UK market',
                  description:
                    'This could include a mix of interviews, focus groups, patient record forms, surveys, ethnography, or other market research methods.',
                  validations: {
                    isRequired: 'A description is required'
                  },
                  lengthLimit: 'l'
                }
              ],
              condition: {
                id: 'hasMarketResearch',
                options: ['YES', 'IN_PROGRESS']
              }
            },
            {
              questions: [
                {
                  id: 'optionBestDescribesInnovation',
                  dataType: 'radio-group',
                  label: 'Which option best describes your innovation?',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'ONE_OFF_INNOVATION',
                      label: 'A one-off innovation, or the first of its kind'
                    },
                    {
                      id: 'BETTER_ALTERNATIVE',
                      label: 'A better alternative to those that already exist'
                    },
                    {
                      id: 'EQUIVALENT_ALTERNATIVE',
                      label: 'An equivalent alternative to those that already exist'
                    },
                    {
                      id: 'COST_EFFECT_ALTERNATIVE',
                      label: 'A more cost-effect alternative to those that already exist'
                    },
                    {
                      id: 'NOT_SURE',
                      label: 'I am not sure'
                    }
                  ]
                }
              ],
              condition: {
                id: 'hasMarketResearch',
                options: ['YES', 'IN_PROGRESS']
              }
            },
            {
              questions: [
                {
                  id: 'whatCompetitorsAlternativesExist',
                  dataType: 'textarea',
                  label: 'What competitors or alternatives exist, or how is the problem addressed in current practice?',
                  description: 'Include how your innovation is different to the alternatives in the market.',
                  validations: {
                    isRequired: 'A description is required'
                  },
                  lengthLimit: 'l'
                }
              ],
              condition: {
                id: 'hasMarketResearch',
                options: ['YES', 'IN_PROGRESS']
              }
            }
          ]
        },
        {
          id: 'CURRENT_CARE_PATHWAY',
          title: 'Current care pathway',
          steps: [
            {
              questions: [
                {
                  id: 'innovationPathwayKnowledge',
                  dataType: 'radio-group',
                  label: 'Does your innovation relate to a current NHS care pathway?',
                  description:
                    '<p>An NHS care pathway outlines the entire patient journey and the actions taken in different parts of the healthcare system. It\'s key to understand the existing routines of clinical and care professionals, administrators and others who will be impacted by your innovation.</p><p>If your innovation does not play a role in the delivery of care, select "does not form part of a care pathway".</p>',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'PATHWAY_EXISTS_AND_CHANGED',
                      label: 'There is a pathway, and my innovation changes it'
                    },
                    {
                      id: 'PATHWAY_EXISTS_AND_FITS',
                      label: 'There is a pathway, and my innovation fits in to it'
                    },
                    {
                      id: 'NO_PATHWAY',
                      label: 'There is no current care pathway'
                    },
                    {
                      id: 'DONT_KNOW',
                      label: 'I do not know'
                    },
                    {
                      id: 'NOT_PART_PATHWAY',
                      label: 'Does not form part of a care pathway'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'potentialPathway',
                  dataType: 'textarea',
                  label: 'Describe the potential care pathway with your innovation in use',
                  description:
                    'Focus on any areas that will be impacted by introducing your innovation to the care pathway.',
                  validations: {
                    isRequired: 'A description is required'
                  },
                  lengthLimit: 'm'
                }
              ],
              condition: {
                id: 'innovationPathwayKnowledge',
                options: ['PATHWAY_EXISTS_AND_CHANGED', 'PATHWAY_EXISTS_AND_FITS', 'NO_PATHWAY']
              }
            }
          ]
        }
      ]
    },
    {
      id: 'testingWithUsers',
      title: 'Testing with users',
      subSections: [
        {
          id: 'TESTING_WITH_USERS',
          title: 'Testing with users',
          steps: [
            {
              questions: [
                {
                  id: 'involvedUsersDesignProcess',
                  dataType: 'radio-group',
                  label: 'Have you involved users in the design process?',
                  description:
                    'This includes involving patients or the public, carers, clinicians or administrators in the design process, including people with different accessibility needs.',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'YES',
                      label: 'Yes'
                    },
                    {
                      id: 'IN_PROGRESS',
                      label: 'I am in the process of involving users in the design'
                    },
                    {
                      id: 'NOT_YET',
                      label: 'Not yet'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'testedWithIntendedUsers',
                  dataType: 'radio-group',
                  label: 'Have you tested your innovation with its intended users in a real life setting?',
                  description: 'Do not include any testing you have done with users in a controlled setting.',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'YES',
                      label: 'Yes'
                    },
                    {
                      id: 'IN_PROGRESS',
                      label: 'I am in the process of testing with users'
                    },
                    {
                      id: 'NOT_YET',
                      label: 'Not yet'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'intendedUserGroupsEngaged',
                  dataType: 'checkbox-array',
                  label: 'Which groups of intended users have you engaged with?',
                  validations: {
                    isRequired: 'Choose at least one group'
                  },
                  items: [
                    {
                      id: 'CLINICAL_SOCIAL_CARE_WORKING_INSIDE_UK',
                      label: 'Clinical or social care professionals working in the UK health and social care system'
                    },
                    {
                      id: 'CLINICAL_SOCIAL_CARE_WORKING_OUTSIDE_UK',
                      label: 'Clinical or social care professionals working outside the UK'
                    },
                    {
                      id: 'NON_CLINICAL_HEALTHCARE',
                      label: 'Non-clinical healthcare staff'
                    },
                    {
                      id: 'PATIENTS',
                      label: 'Patients'
                    },
                    {
                      id: 'SERVICE_USERS',
                      label: 'Service users'
                    },
                    {
                      id: 'CARERS',
                      label: 'Carers'
                    },
                    {
                      id: 'OTHER',
                      label: 'Other',
                      conditional: {
                        id: 'otherIntendedUserGroupsEngaged',
                        dataType: 'text',
                        label: 'Other group',
                        validations: {
                          isRequired: 'Other group description is required',
                          maxLength: 100
                        }
                      }
                    }
                  ]
                }
              ],
              condition: {
                id: 'testedWithIntendedUsers',
                options: ['YES', 'IN_PROGRESS']
              }
            },
            {
              questions: [
                {
                  id: 'userTests',
                  dataType: 'fields-group',
                  label: 'What kind of testing with users have you done?',
                  description:
                    'This can include any testing you have done with people who would use your innovation, for example patients, nurses or administrative staff.',
                  field: {
                    id: 'kind',
                    dataType: 'text',
                    label: 'User test',
                    validations: {
                      isRequired: 'Required',
                      maxLength: 100
                    }
                  },
                  addNewLabel: 'Add new user test',
                  addQuestion: {
                    id: 'feedback',
                    dataType: 'textarea',
                    label: 'Describe the testing and feedback for {{item.kind}}',
                    description:
                      'Provide a brief summary of the method and key findings. You can upload any documents that showcase your user testing next.',
                    validations: {
                      isRequired: 'A description is required'
                    },
                    lengthLimit: 's'
                  }
                }
              ],
              condition: {
                id: 'testedWithIntendedUsers',
                options: ['YES', 'IN_PROGRESS']
              }
            }
          ],
          hasFiles: true
        }
      ]
    },
    {
      id: 'regulationsStandardsCertificationsAndIntellectualProperty',
      title: 'Regulations, standards, certifications and intellectual property',
      subSections: [
        {
          id: 'REGULATIONS_AND_STANDARDS',
          title: 'Regulatory approvals, standards and certifications',
          steps: [
            {
              questions: [
                {
                  id: 'hasRegulationKnowledge',
                  dataType: 'radio-group',
                  label: 'Do you know which regulations, standards and certifications apply to your innovation?',
                  description:
                    'Find out more about <a href="{{urls.INNOVATION_GUIDES_REGULATION}}" target="_blank" rel="noopener noreferrer">regulations (opens in a new window)</a>.',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'YES_ALL',
                      label: 'Yes, I know all of them'
                    },
                    {
                      id: 'YES_SOME',
                      label: 'Yes, I know some of them'
                    },
                    {
                      id: 'NO',
                      label: 'No'
                    },
                    {
                      id: 'NOT_RELEVANT',
                      label: 'Not relevant'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'standards',
                  dataType: 'checkbox-array',
                  checkboxAnswerId: 'type',
                  label: 'Which regulations, standards and certifications apply to your innovation?',
                  description:
                    'Find out more about <a href="{{urls.UNDERSTANDING_REGULATIONS_MEDICAL_DEVICES}}" target="_blank" rel="noopener noreferrer">UKCA / CE marking (opens in a new window)</a>, <a href="{{urls.UNDERSTANDING_CQC_REGULATIONS}}" target="_blank" rel="noopener noreferrer">CQC registration (opens in a new window)</a>, or <a href="{{urls.NHS_DIGITAL_TECHNOLOGY_ASSESSMENT_CRITERIA}}" target="_blank" rel="noopener noreferrer">DTAC (opens in a new window)</a>.',
                  addQuestion: {
                    id: 'hasMet',
                    dataType: 'radio-group',
                    label: 'Do you have a certification for {{item}}',
                    validations: {
                      isRequired: 'A description is required'
                    },
                    items: [
                      {
                        id: 'YES',
                        label: 'Yes'
                      },
                      {
                        id: 'IN_PROGRESS',
                        label: 'I am actively working towards it'
                      },
                      {
                        id: 'NOT_YET',
                        label: 'Not yet'
                      }
                    ]
                  },
                  validations: {
                    isRequired: 'Choose at least one option'
                  },
                  items: [
                    {
                      id: 'CE_UKCA_NON_MEDICAL',
                      label: 'Non-medical device',
                      group: 'UKCA / CE'
                    },
                    {
                      id: 'CE_UKCA_CLASS_I',
                      label: 'Class I medical device',
                      group: 'UKCA / CE'
                    },
                    {
                      id: 'CE_UKCA_CLASS_II_A',
                      label: 'Class IIa medical device',
                      group: 'UKCA / CE'
                    },
                    {
                      id: 'CE_UKCA_CLASS_II_B',
                      label: 'Class IIb medical device',
                      group: 'UKCA / CE'
                    },
                    {
                      id: 'CE_UKCA_CLASS_III',
                      label: 'Class III medical device',
                      group: 'UKCA / CE'
                    },
                    {
                      id: 'IVD_GENERAL',
                      label: 'IVD general',
                      group: 'In-vitro diagnostics'
                    },
                    {
                      id: 'IVD_SELF_TEST',
                      label: 'IVD self-test',
                      group: 'In-vitro diagnostics'
                    },
                    {
                      id: 'IVD_ANNEX_LIST_A',
                      label: 'IVD Annex II List A',
                      group: 'In-vitro diagnostics'
                    },
                    {
                      id: 'IVD_ANNEX_LIST_B',
                      label: 'IVD Annex II List B',
                      group: 'In-vitro diagnostics'
                    },
                    {
                      id: 'MARKETING',
                      label: 'Marketing authorisation for medicines'
                    },
                    {
                      id: 'CQC',
                      label: 'Care Quality Commission (CQC) registration, as I am providing a regulated activity'
                    },
                    {
                      id: 'DTAC',
                      label: 'Digital Technology Assessment Criteria (DTAC)'
                    },
                    {
                      id: 'OTHER',
                      label: 'Other',
                      conditional: {
                        id: 'otherRegulationDescription',
                        dataType: 'text',
                        label: 'Other regulations, standards and certifications that apply',
                        validations: {
                          isRequired: 'Other regulations, standards and certifications is required',
                          maxLength: 100
                        }
                      }
                    }
                  ]
                }
              ],
              condition: {
                id: 'hasRegulationKnowledge',
                options: ['YES_ALL', 'YES_SOME']
              }
            }
          ],
          hasFiles: true
        },
        {
          id: 'INTELLECTUAL_PROPERTY',
          title: 'Intellectual property',
          steps: [
            {
              questions: [
                {
                  id: 'hasPatents',
                  dataType: 'radio-group',
                  label: 'Do you have any patents for your innovation?',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'HAS_AT_LEAST_ONE',
                      label: 'I have one or more patents',
                      conditional: {
                        id: 'patentNumbers',
                        dataType: 'text',
                        label: 'Patent number(s)',
                        validations: {
                          isRequired: 'Patent number(s) required',
                          maxLength: 100
                        }
                      }
                    },
                    {
                      id: 'APPLIED_AT_LEAST_ONE',
                      label: 'I have applied for one or more patents'
                    },
                    {
                      id: 'HAS_NONE',
                      label: 'I do not have any patents, but believe I have freedom to operate'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'hasOtherIntellectual',
                  dataType: 'radio-group',
                  label: 'Do you have any other intellectual property for your innovation?',
                  description:
                    'Find out more about <a href="{{urls.INNOVATION_GUIDES_INTELLECTUAL_PROPERTY}}" target="_blank" rel="noopener noreferrer">intellectual property (opens in a new window)</a>.',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'YES',
                      label: 'Yes',
                      conditional: {
                        id: 'otherIntellectual',
                        dataType: 'text',
                        label: 'Type of intellectual property',
                        validations: {
                          isRequired: 'Type of intellectual property is required',
                          maxLength: 100
                        }
                      }
                    },
                    {
                      id: 'NO',
                      label: 'No'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'revenueModel',
      title: 'Revenue model',
      subSections: [
        {
          id: 'REVENUE_MODEL',
          title: 'Revenue model',
          steps: [
            {
              questions: [
                {
                  id: 'hasRevenueModel',
                  dataType: 'radio-group',
                  label: 'Do you have a model for generating revenue from your innovation?',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'YES',
                      label: 'Yes'
                    },
                    {
                      id: 'NO',
                      label: 'No'
                    },
                    {
                      id: 'DONT_KNOW',
                      label: 'I do not know'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'revenues',
                  dataType: 'checkbox-array',
                  label: 'What is the revenue model for your innovation?',
                  validations: {
                    isRequired: 'Choose at least one revenue model'
                  },
                  items: [
                    {
                      id: 'ADVERTISING',
                      label: 'Advertising'
                    },
                    {
                      id: 'DIRECT_PRODUCT_SALES',
                      label: 'Direct product sales'
                    },
                    {
                      id: 'FEE_FOR_SERVICE',
                      label: 'Fee for service'
                    },
                    {
                      id: 'LEASE',
                      label: 'Lease'
                    },
                    {
                      id: 'SALES_OF_CONSUMABLES_OR_ACCESSORIES',
                      label: 'Sales of consumables or accessories'
                    },
                    {
                      id: 'SUBSCRIPTION',
                      label: 'Subscription'
                    },
                    {
                      id: 'OTHER',
                      label: 'Other',
                      conditional: {
                        id: 'otherRevenueDescription',
                        dataType: 'text',
                        label: 'Other revenue model',
                        validations: {
                          isRequired: 'Other revenue model is required',
                          maxLength: 100
                        }
                      }
                    }
                  ]
                }
              ],
              condition: {
                id: 'hasRevenueModel',
                options: ['YES']
              }
            },
            {
              questions: [
                {
                  id: 'payingOrganisations',
                  dataType: 'textarea',
                  label:
                    'Which NHS or social care organisation and department do you think would pay for the innovation?',
                  description: 'Be as specific as you can.',
                  validations: {
                    isRequired: 'A description is required'
                  },
                  lengthLimit: 'm'
                }
              ],
              condition: {
                id: 'hasRevenueModel',
                options: ['YES']
              }
            },
            {
              questions: [
                {
                  id: 'benefittingOrganisations',
                  dataType: 'textarea',
                  label: 'Which NHS or social care organisation and department would benefit from the innovation?',
                  description: 'Be as specific as you can.',
                  validations: {
                    isRequired: 'A description is required'
                  },
                  lengthLimit: 'm'
                }
              ],
              condition: {
                id: 'hasRevenueModel',
                options: ['YES']
              }
            },
            {
              questions: [
                {
                  id: 'hasFunding',
                  dataType: 'radio-group',
                  label: 'Have you secured funding for the next stage of development?',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'YES',
                      label: 'Yes'
                    },
                    {
                      id: 'NO',
                      label: 'No'
                    },
                    {
                      id: 'NOT_RELEVANT',
                      label: 'Not relevant'
                    }
                  ]
                }
              ],
              condition: {
                id: 'hasRevenueModel',
                options: ['YES']
              }
            },
            {
              questions: [
                {
                  id: 'fundingDescription',
                  dataType: 'textarea',
                  label: 'Describe the funding you have secured for the next stage of development',
                  description:
                    'For example, venture capital, angel investor, seed funding, grant funding, government funding or similar.',
                  validations: {
                    isRequired: 'A description is required'
                  },
                  lengthLimit: 's'
                }
              ],
              condition: {
                id: 'hasFunding',
                options: ['YES']
              }
            }
          ]
        }
      ]
    },
    {
      id: 'costAndSavings',
      title: 'Cost and savings',
      subSections: [
        {
          id: 'COST_OF_INNOVATION',
          title: 'Cost of your innovation',
          steps: [
            {
              questions: [
                {
                  id: 'hasCostKnowledge',
                  dataType: 'radio-group',
                  label: 'Do you know the cost of your innovation?',
                  description:
                    'By cost, we mean the cost to the NHS or any care organisation that would implement your innovation. Support organisations will use this to calculate cost effectiveness.',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'DETAILED_ESTIMATE',
                      label: 'Yes, I have a detailed estimate'
                    },
                    {
                      id: 'ROUGH_IDEA',
                      label: 'Yes, I have a rough idea'
                    },
                    {
                      id: 'NO',
                      label: 'No'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'costDescription',
                  dataType: 'textarea',
                  label: 'What is the cost of your innovation?',
                  description:
                    '<p>Include the relevant metric such as a flat capital cost or cost per patient, cost per unit or cost per procedure. Include any costs associated with implementation and resources.</p><p>For example, £10 based on 500 units per site. £345 per procedure and a typical patient requires two procedures.</p>',
                  validations: {
                    isRequired: 'A description is required'
                  },
                  lengthLimit: 'm'
                }
              ],
              condition: {
                id: 'hasCostKnowledge',
                options: ['DETAILED_ESTIMATE', 'ROUGH_IDEA']
              }
            },
            {
              questions: [
                {
                  id: 'patientsRange',
                  dataType: 'radio-group',
                  label: 'Roughly how many patients would be eligible for your innovation in the UK?',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'UP_10000',
                      label: 'Up to 10,000 per year'
                    },
                    {
                      id: 'BETWEEN_10000_500000',
                      label: '10,000 to half a million per year'
                    },
                    {
                      id: 'MORE_THAN_500000',
                      label: 'More than half a million per year'
                    },
                    {
                      id: 'NOT_SURE',
                      label: 'I am not sure'
                    },
                    {
                      id: 'NOT_RELEVANT',
                      label: 'Not relevant to my innovation'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'eligibilityCriteria',
                  dataType: 'textarea',
                  label: 'What is the eligibility criteria for your innovation?',
                  description:
                    '<p>For example, users need to be over a certain age, or have a certain medical history or current health status.</p><p>Answer "not relevant" if your innovation does not have any eligibility criteria.</p>',
                  validations: {
                    isRequired: 'A description is required'
                  },
                  lengthLimit: 'm'
                }
              ],
              condition: {
                id: 'patientsRange',
                options: ['UP_10000', 'BETWEEN_10000_500000', 'NOT_SURE']
              }
            },
            {
              questions: [
                {
                  id: 'sellExpectations',
                  dataType: 'textarea',
                  label: 'How many units of your innovation would you expect to sell in the UK per year?',
                  validations: {
                    isRequired: 'A description is required'
                  },
                  lengthLimit: 's'
                }
              ]
            },
            {
              questions: [
                {
                  id: 'usageExpectations',
                  dataType: 'textarea',
                  label: 'Approximately how long do you expect each unit of your innovation to be in use?',
                  description:
                    "By this we mean the shelf life of the product, or the product's lifespan. This can include the lifespan of any components such as batteries.",
                  validations: {
                    isRequired: 'A description is required'
                  },
                  lengthLimit: 'm'
                }
              ]
            },
            {
              questions: [
                {
                  id: 'costComparison',
                  dataType: 'radio-group',
                  label:
                    'What are the costs associated with the use of your innovation, compared to current practice in the UK?',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'CHEAPER',
                      label: 'My innovation is cheaper to purchase'
                    },
                    {
                      id: 'COSTS_MORE_WITH_SAVINGS',
                      label:
                        'My innovation costs more to purchase, but has greater benefits that will lead to overall cost savings'
                    },
                    {
                      id: 'COSTS_MORE',
                      label:
                        'My innovation costs more to purchase and has greater benefits, but will lead to higher costs overall'
                    },
                    {
                      id: 'NOT_SURE',
                      label: 'I am not sure'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'deployment',
      title: 'Deployment',
      subSections: [
        {
          id: 'DEPLOYMENT',
          title: 'Deployment',
          steps: [
            {
              questions: [
                {
                  id: 'hasDeployPlan',
                  dataType: 'radio-group',
                  label: 'Is your innovation ready for wider adoption across the health and care system?',
                  description:
                    'Find out more about <a href="{{urls.INNOVATION_GUIDES_COMISSIONING_AND_ADOPTION}}" target="_blank" rel="noopener noreferrer">commissioning and adoption (opens in a new window)</a>.',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'YES',
                      label: 'Yes'
                    },
                    {
                      id: 'NO',
                      label: 'No'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'isDeployed',
                  dataType: 'radio-group',
                  label: 'Has your innovation been deployed in a NHS or care setting?',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'YES',
                      label: 'Yes'
                    },
                    {
                      id: 'NO',
                      label: 'No'
                    }
                  ]
                }
              ]
            },
            {
              questions: [
                {
                  id: 'deploymentPlans',
                  dataType: 'fields-group',
                  label: 'Where have you deployed your innovation?',
                  description: 'Provide the name of the organisation and the department, if possible.',
                  field: {
                    id: 'organizationDepartment',
                    dataType: 'text',
                    label: 'Organisation and department',
                    validations: {
                      isRequired: 'Organisation and department are required',
                      maxLength: 100
                    }
                  },
                  addNewLabel: 'Add new organisations and department'
                }
              ],
              condition: {
                id: 'isDeployed',
                options: ['YES']
              }
            },
            {
              questions: [
                {
                  id: 'commercialBasis',
                  dataType: 'textarea',
                  label: 'What was the commercial basis for deployment?',
                  description:
                    "For example, did you provide your innovation for free or was it purchased? Or was it part funded by yourself and the NHS area in which it's being deployed?",
                  validations: {
                    isRequired: 'A description is required'
                  },
                  lengthLimit: 'xl'
                }
              ],
              condition: {
                id: 'isDeployed',
                options: ['YES']
              }
            },
            {
              questions: [
                {
                  id: 'organisationDeploymentAffect',
                  dataType: 'textarea',
                  label: 'How did the deployment of your innovation affect the organisation(s)?',
                  description: 'For example, which job roles were affected and how was the care pathway redesigned?',
                  validations: {
                    isRequired: 'A description is required'
                  },
                  lengthLimit: 'xl'
                }
              ],
              condition: {
                id: 'isDeployed',
                options: ['YES']
              }
            },
            {
              questions: [
                {
                  id: 'hasResourcesToScale',
                  dataType: 'radio-group',
                  label: 'Does your team have the resources for scaling up to national deployment?',
                  description: 'This includes having a team with the right combination of skills and knowledge.',
                  validations: {
                    isRequired: 'Choose one option'
                  },
                  items: [
                    {
                      id: 'YES',
                      label: 'Yes'
                    },
                    {
                      id: 'NO',
                      label: 'No'
                    },
                    {
                      id: 'NOT_SURE',
                      label: 'I am not sure'
                    }
                  ]
                }
              ]
            }
          ],
          hasFiles: true
        }
      ]
    }
  ]
};
