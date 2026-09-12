'use strict';

function selectScenarios(scenarios, name = 'all') {
  if (name === 'all') return scenarios;
  const selected = scenarios.filter(scenario => scenario.name === name);
  if (!selected.length) throw new Error('Unknown migration scenario: ' + name);
  return selected;
}

function diffModels(a, b, path = '', out = []) {
  if (Object.is(a, b)) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      diffModels(a[key], b[key], path ? path + '.' + key : key, out);
    }
  } else out.push({ path, before: a, after: b });
  return out;
}

function compareOutput(a, b) {
  return {
    htmlEqual: a.paper === b.paper,
    textEqual: a.text === b.text,
    nonEmpty: !!String(a.text || '').trim() && !!String(b.text || '').trim(),
    errorFree: !a.err && !b.err
  };
}

module.exports = { selectScenarios, diffModels, compareOutput };
