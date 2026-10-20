const fs = require('fs');
const assert = require('assert');

// The runner loads the actual heuristics.js production file.
// We use a Function constructor to evaluate it in a controlled environment
// because Node.js does not yet support ESM imports seamlessly for local files
// without a package.json or specific extensions, and heuristics.js is an ESM module.
const heuristicsCode = fs.readFileSync('heuristics.js', 'utf8');

// Strip ESM exports for evaluation
const cleanCode = heuristicsCode
  .replace(/export function/g, 'function')
  .replace(/export /g, '');

const fn = new Function('assert', cleanCode + '\nreturn { extractDeterministicFindings, dedupe };');
const { extractDeterministicFindings, dedupe } = fn(assert);

// Test Utilities
const createMsg = (id, sender, text) => ({ id: `msg_${id}`, sender, text });

const runTest = (name, messages, expected) => {
  process.stdout.write(`Running: ${name}... `);
  const result = extractDeterministicFindings(messages);
  try {
    expected(result, dedupe);
    process.stdout.write('✅\n');
  } catch (err) {
    process.stdout.write('❌\n');
    console.error(`  Error in "${name}": ${err.message}`);
    console.log('  Actual result:', JSON.stringify(result, null, 2));
    process.exit(1);
  }
};

console.log('CatchUp Extraction Regression Suite\n');

// 1. Explicit assignee vs message sender
runTest('Explicit assignee recognition', 
  [createMsg('01', 'Alice', '@Bob I will finish the report')],
  (res) => {
    assert.strictEqual(res.fallbackActions.length, 1);
    assert.strictEqual(res.fallbackActions[0].owner, 'Bob', 'Task should be assigned to @Bob');
  }
);

// 2. Mentions that are not assignments
runTest('Non-assignment mention filtering',
  [createMsg('02', 'Charlie', 'Please look at @Bob\'s draft')],
  (res) => {
    assert.strictEqual(res.fallbackActions.length, 0, 'Should not be an action');
  }
);

// 3. Missing owners
runTest('Unassigned task detection',
  [createMsg('03', 'Dave', 'I can help fix the server')],
  (res) => {
    assert.strictEqual(res.fallbackActions.length, 1);
    assert.strictEqual(res.fallbackActions[0].owner, 'Dave', 'Owner should be the sender');
  }
);

// 4. Confirmed vs tentative decisions
runTest('Decision classification',
  [
    createMsg('04', 'Grace', 'We decided to use PostgreSQL'),
    createMsg('05', 'Heidi', 'Maybe we should use Redis?')
  ],
  (res) => {
    assert.strictEqual(res.fallbackDecisions.length, 1);
    assert.strictEqual(res.fallbackDecisions[0].source_id, 'msg_04');
  }
);

// 5. Question resolution
runTest('Resolved question filtering',
  [
    createMsg('06', 'Ivan', 'Who is setting up the database?'),
    createMsg('07', 'Judy', 'I will set up the database tomorrow')
  ],
  (res) => {
    assert.strictEqual(res.fallbackQuestions.length, 0, 'Question should be resolved by follow-up keyword match');
  }
);

// 6. Unrelated open question
runTest('Open question tracking',
  [
    createMsg('08', 'Karl', 'What about the API documentation?'),
    createMsg('09', 'Alice', 'I will finish the report')
  ],
  (res) => {
    assert.strictEqual(res.fallbackQuestions.length, 1);
    assert.strictEqual(res.fallbackQuestions[0].source_id, 'msg_08');
  }
);

// 7. Duplicate findings (same source)
runTest('Deduplication (same source)',
  [],
  (res, dedupe) => {
    const dupe1 = { text: "Same", source_id: "msg_1" };
    const dupe2 = { text: "Same", source_id: "msg_1" };
    const deduped = dedupe([dupe1], [dupe2]);
    assert.strictEqual(deduped.length, 1);
  }
);

// 8. Global deduplication (different source)
runTest('Global deduplication (different source)',
  [],
  (res, dedupe) => {
    const dupe1 = { text: "Task A", source_id: "msg_1" };
    const dupe2 = { text: "Task A", source_id: "msg_2" };
    const deduped = dedupe([dupe1], [dupe2]);
    assert.strictEqual(deduped.length, 1, 'Currently deduplicates across sources if text matches exactly');
  }
);

// 9. Multiline messages
runTest('Multiline message support',
  [createMsg('10', 'Alice', 'First line\nSecond line')],
  (res) => {
    // Current parser collapses lines into one, let's verify it doesn't crash
    assert.ok(res, 'Should handle multiline input');
  }
);

// 10. Empty input
runTest('Empty input resilience',
  [createMsg('11', 'Bob', '')],
  (res) => {
    assert.strictEqual(Object.values(res).every(arr => arr.length === 0), true);
  }
);

console.log('\nAll tests completed successfully.');
