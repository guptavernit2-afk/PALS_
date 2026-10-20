const assert = require('assert');

// 8. Missing owners and incomplete evidence
const ownerMessages = [
  { id: "msg_25", sender: "Alice", text: "We need to finish the project." },
  { id: "msg_26", sender: "Bob", text: "I'll handle the presentation." }
];

function extractHybrid(messages) {
  const fallbackActions = [];
  messages.forEach(msg => {
    // Check if the message explicitly mentions "I'll" or "I will" for owner assignment
    const hasOwner = /I'll|I will/i.test(msg.text);
    fallbackActions.push({
      text: `Owner ${hasOwner ? "specified" : "missing"}: "${msg.text}"`,
      owner: hasOwner ? msg.sender : "Unassigned",
      quote: msg.text,
      source_id: msg.id
    });
  });
  return { fallbackActions };
}

const result = extractHybrid(ownerMessages);
assert.strictEqual(result.fallbackActions[0].owner, "Unassigned", "Expected unassigned owner");
assert.strictEqual(result.fallbackActions[1].owner, "Bob", "Expected Bob as owner");
console.log("Owners test passed");
