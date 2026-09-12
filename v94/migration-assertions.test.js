const assert = require('node:assert/strict');
const { selectScenarios, diffModels, compareOutput } = require('./migration-assertions');

const scenarios = [{ name: '67-basic' }, { name: 'accident' }];
assert.deepEqual(selectScenarios(scenarios, 'accident'), [scenarios[1]]);
assert.equal(selectScenarios(scenarios).length, 2);
assert.throws(() => selectScenarios(scenarios, 'typo'), /Unknown migration scenario/);
assert.equal(compareOutput({ paper: '', text: '' }, { paper: '', text: '' }).nonEmpty, false);
assert.equal(compareOutput({ paper: '<p>case s</p>', text: 'case s' }, { paper: '<p>ca e </p>', text: 'ca e ' }).textEqual, false);
assert.equal(compareOutput({ paper: '<p>same</p>', text: 'same' }, { paper: '<b>same</b>', text: 'same' }).htmlEqual, false);
assert.deepEqual(diffModels({ accident: { petition: { months: '4' } } }, { accident: { petition: { months: '6' } } }), [
  { path: 'accident.petition.months', before: '4', after: '6' }
]);
assert.equal(diffModels({ x: null }, { x: {} }).length, 1);
console.log('PASS migration selection, exact output, empty-output rejection and model diagnostics');
