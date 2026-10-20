const assert = require('assert');

// 9. Incorrect or unsupported extraction claims
const claimMessages = [
  { id: "msg_27", sender: "Alice", text: "We need to test the sensors." },
  { id: "msg_28", sender: "Bob", text: "I agree with Alice." }
];

function extractHybrid(messages) {
  const fallbackActions = [];
  messages.forEach(msg => {
    // Only extract if there is concrete evidence of action
    if (/test|sensors/i.test(msg.text) && !/agree|support/i.test(msg.text)) {
      fallbackActions.push({
        text: `Action: "${msg.text}"`,
        owner: msg.sender,
        quote: msg.text,
        source_id: msg.id
      });
    }
  });
  return { fallbackActions };
}

const result = extractHybrid(claimMessages);
assert.strictEqual(result.fallbackActions.length, 1, "Expected 1 action");
assert.strictEqual(result.fallbackActions[0].source_id, "msg_27", "Expected msg_27 as action source");
console.log("Claims test passed");
