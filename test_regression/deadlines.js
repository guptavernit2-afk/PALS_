const assert = require('assert');

// 7. Missing, ambiguous, past and future deadlines
const deadlineMessages = [
  { id: "msg_22", sender: "Alice", text: "Finish the report." },
  { id: "msg_23", sender: "Bob", text: "Submit by Friday." },
  { id: "msg_24", sender: "Charlie", text: "We missed the deadline." }
];

function extractHybrid(messages) {
  const fallbackActions = [];
  const now = new Date();
  messages.forEach(msg => {
    const hasDeadline = /(?:submit|due|by|before|after)\s+\w+/i.test(msg.text);
    const isPast = /missed|late|overdue/i.test(msg.text);
    fallbackActions.push({
      text: `Deadline ${hasDeadline ? "present" : "missing"} ${isPast ? "(past)" : ""}: "${msg.text}"`,
      owner: msg.sender,
      quote: msg.text,
      source_id: msg.id
    });
  });
  return { fallbackActions };
}

const result = extractHybrid(deadlineMessages);
assert.strictEqual(result.fallbackActions[0].text.includes("missing"), true, "Expected missing deadline");
assert.strictEqual(result.fallbackActions[2].text.includes("(past)"), true, "Expected past deadline");
console.log("Deadlines test passed");
