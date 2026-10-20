const assert = require('assert');

// 10. Empty input and malformed input
const emptyMessages = [
  { id: "msg_29", sender: "Alice", text: "" },
  { id: "msg_30", sender: "Bob", text: "   " },
  { id: "msg_31", sender: "Charlie", text: null }
];

function extractHybrid(messages) {
  const fallbackActions = [];
  messages.forEach(msg => {
    if (msg.text && msg.text.trim().length > 0) {
      fallbackActions.push({
        text: `Valid message: "${msg.text}"`,
        owner: msg.sender,
        quote: msg.text,
        source_id: msg.id
      });
    }
  });
  return { fallbackActions };
}

const result = extractHybrid(emptyMessages);
assert.strictEqual(result.fallbackActions.length, 0, "Expected 0 valid messages");
console.log("Empty input test passed");
