const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCredentials } = require('../src/validators/auth.validator');

test('authentication validation accepts valid login and registration credentials', () => {
  assert.doesNotThrow(() => validateCredentials({
    email: 'person@example.com',
    senha: 'senha-segura',
  }, false));

  assert.doesNotThrow(() => validateCredentials({
    nome: 'Pessoa',
    email: 'person@example.com',
    senha: 'senha-segura',
    termosAceitos: true,
  }, true));
});

test('registration validation still requires a name and accepted terms', () => {
  assert.throws(() => validateCredentials({
    email: 'person@example.com',
    senha: 'senha-segura',
  }, true));
});
