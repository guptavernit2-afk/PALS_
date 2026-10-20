const assert = require('assert');

// 6. Questions versus genuine action items
const questionMessages = [
  { id: "msg_20", sender: "Alice", text: "Should we use React or Vue?" },
  { id: "msg_21", sender: "Bob", text: "Please finish the report by Friday." }
];

function extractHybrid(messages) {
  const fallbackQuestions = [];
  const fallbackActions = [];
  messages.forEach(msg => {
    if (msg.text.includes('?')) {
      fallbackQuestions.push({
        text: `Question: "${msg.text}"`,
        quote: msg.text,
        source_id: msg.id
      });
    } else if (/please|finish|due/i.test(msg.text)) {
      fallbackActions.push({
        text: `Action: "${msg.text}"`,
        owner: msg.sender,
        quote: msg.text,
        source_id: msg.id
      });
    }
  });
  return { fallbackQuestions, fallbackActions };
}

const result = extractHybrid(questionMessages);
assert.strictEqual(result.fallbackQuestions.length, 1, "Expected 1 question");
assert.strictEqual(result.fallbackActions.length, 1, "Expected 1 action");
console.log("Questions test passed");
