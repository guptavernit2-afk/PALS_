const assert = require('assert');

// 1. Multiline messages and nested quoted text
const multilineMessages = [
  { id: "msg_10", sender: "Alice", text: "> Bob said:\n> We should meet at 2 PM.\nI agree with Bob." },
  { id: "msg_11", sender: "Bob", text: "Here is the plan:\n1. Finish the slides.\n2. Review with team." }
];

function extractHybrid(messages) {
  const fallbackActions = [];
  messages.forEach(msg => {
    if (msg.text.includes('\n')) {
      fallbackActions.push({
        text: `Multiline message: "${msg.text}"`,
        owner: msg.sender,
        quote: msg.text,
        source_id: msg.id
      });
    }
  });
  return { fallbackActions };
}

const result = extractHybrid(multilineMessages);
assert.strictEqual(result.fallbackActions.length, 2, "Expected 2 multiline messages");
console.log("Edge cases test passed");
