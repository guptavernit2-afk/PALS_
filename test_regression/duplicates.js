const assert = require('assert');

// 2. Duplicate messages and repeated action items
const duplicateMessages = [
  { id: "msg_12", sender: "Alice", text: "Upload files by Sunday 9 PM." },
  { id: "msg_13", sender: "Bob", text: "Upload files by Sunday 9 PM." },
  { id: "msg_14", sender: "Alice", text: "Upload files by Sunday 9 PM." }
];

function extractHybrid(messages) {
  const fallbackActions = [];
  const seen = new Set();
  messages.forEach(msg => {
    if (!seen.has(msg.text)) {
      seen.add(msg.text);
      fallbackActions.push({
        text: `Unique action: "${msg.text}"`,
        owner: msg.sender,
        quote: msg.text,
        source_id: msg.id
      });
    }
  });
  return { fallbackActions };
}

const result = extractHybrid(duplicateMessages);
assert.strictEqual(result.fallbackActions.length, 1, "Expected 1 unique action");
console.log("Duplicate messages test passed");
