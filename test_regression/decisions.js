const assert = require('assert');

// 5. Tentative suggestions versus confirmed decisions
const decisionMessages = [
  { id: "msg_17", sender: "Alice", text: "Maybe we should use React?" },
  { id: "msg_18", sender: "Bob", text: "We decided to use React." },
  { id: "msg_19", sender: "Charlie", text: "It's unconfirmed if we'll use Vue." }
];

function extractHybrid(messages) {
  const fallbackDecisions = [];
  messages.forEach(msg => {
    if (/decided|agreed/i.test(msg.text) && !/maybe|unconfirmed|undecided/i.test(msg.text)) {
      fallbackDecisions.push({
        text: `Confirmed decision: "${msg.text}"`,
        quote: msg.text,
        source_id: msg.id
      });
    }
  });
  return { fallbackDecisions };
}

const result = extractHybrid(decisionMessages);
assert.strictEqual(result.fallbackDecisions.length, 1, "Expected 1 confirmed decision");
assert.strictEqual(result.fallbackDecisions[0].source_id, "msg_18", "Expected msg_18 as decision source");
console.log("Decisions test passed");
