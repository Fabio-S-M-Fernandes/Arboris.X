const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePagination, parseTrendQuery } = require('../src/validators/query.validator');

test('validators reject invalid pagination and accept supported trends', () => {
  assert.throws(() => parsePagination({ limite: '0' }), { status: 400 });
  assert.deepEqual(parseTrendQuery({ periodo: '7d', medida: 'umidade' }), { periodo: '7d', medida: 'umidade', regiao: 'Todas as regiões' });
});
