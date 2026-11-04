import {
  frenchValidationException,
  translateValidationMessage,
} from './validation-messages';

describe('translateValidationMessage', () => {
  it.each([
    ['contactName should not be empty', '« contactName » est obligatoire'],
    [
      'quantity must not be less than 1',
      '« quantity » doit être supérieur ou égal à 1',
    ],
    ['property foo should not exist', "Le champ « foo » n'est pas accepté"],
    [
      'comment must be shorter than or equal to 2000 characters',
      '« comment » doit faire au plus 2000 caractères',
    ],
  ])('%s', (message, expected) => {
    const field =
      message.split(' ')[0] === 'property' ? 'foo' : message.split(' ')[0];
    expect(translateValidationMessage(field, message)).toBe(expected);
  });

  it('garde tel quel un message deja ecrit dans le DTO', () => {
    const custom =
      'Le numéro MVola doit commencer par 034 ou 038 (10 chiffres)';
    expect(translateValidationMessage('mvolaPhone', custom)).toBe(custom);
  });
});

describe('frenchValidationException', () => {
  it('prefixe le chemin des champs imbriques', () => {
    const exception = frenchValidationException([
      {
        property: 'specs',
        children: [
          {
            property: '0',
            children: [
              {
                property: 'label',
                constraints: { isNotEmpty: 'label should not be empty' },
              },
            ],
          },
        ],
      },
    ]);

    expect(exception.getResponse()).toMatchObject({
      message: ['« specs.0.label » est obligatoire'],
      statusCode: 400,
    });
  });
});
