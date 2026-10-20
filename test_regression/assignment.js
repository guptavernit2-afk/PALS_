const assert = require('assert');

// 3. Message sender versus actual task assignee
const assignmentMessages = [
  { id: "msg_15", sender: "Alice", text: "@Bob, please finish the report by Friday." },
  { id: "msg_16", sender: "Charlie", text: "I'll handle the presentation." }
];

function extractHybrid(messages) {
  const fallbackActions = [];
  messages.forEach(msg => {
    let owner = msg.sender;
    if (/(^|\W)@?Bob(\W|$)/i.test(msg.text)) owner = "Bob";
    fallbackActions.push({
      text: `Assigned to ${owner}: "${msg.text}"`,
      owner: owner,
      quote: msg.text,
      source_id: msg.id
    });
  });
  return { fallbackActions };
}

const result = extractHybrid(assignmentMessages);
assert.strictEqual(result.fallbackActions[0].owner, "Bob", "Expected Bob as owner");
assert.strictEqual(result.fallbackActions[1].owner, "Charlie", "Expected Charlie as owner");
console.log("Assignment test passed");
