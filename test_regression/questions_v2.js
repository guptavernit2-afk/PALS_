const assert = require('assert');

function extractHybrid(messages) {
  const fallbackQuestions = [];
  messages.forEach(msg => {
    // Engine logic updated
    if (msg.text.includes('?') || /(?:unconfirmed|undecided|pending|haven't decided|not booked|not decided)/i.test(msg.text)) {
      let resolved = false;
      if (msg.text.includes('?')) {
        const questionWords = msg.text.toLowerCase().match(/\w{4,}/g) || [];
        const currentIndex = messages.indexOf(msg);
        for (let j = currentIndex + 1; j <= currentIndex + 2 && j < messages.length; j++) {
          const nextMsg = messages[j].text.toLowerCase();
          if (/(?:sure|will do|got it|accepted|yes|ok|okay|no problem|on it|i'll|i will)\b/i.test(nextMsg)) {
            const sharesKeyword = questionWords.some(w => nextMsg.includes(w) && !['what', 'when', 'where', 'will', 'have', 'need', 'can', 'you'].includes(w));
            if (sharesKeyword) {
              resolved = true;
              break;
            }
          }
        }
      }
      if (!resolved && (msg.text.includes('?') || /unconfirmed|undecided|pending|haven't decided|not booked|not decided/i.test(msg.text))) {
        fallbackQuestions.push({ text: `Open item/question: "${msg.text}"`, quote: msg.text, source_id: msg.id });
      }
    }
  });
  return fallbackQuestions;
}

const messages = [
  { id: "msg_1", sender: "Alice", text: "Should we use React?" }, // Question
  { id: "msg_2", sender: "Bob", text: "I'll use React." }, // Answer
  { id: "msg_3", sender: "Charlie", text: "It's unconfirmed if we'll use Vue." } // Unconfirmed
];

const result = extractHybrid(messages);
console.log(JSON.stringify(result, null, 2));

// We expect only msg_3 to be extracted (msg_1 is answered, msg_3 is unconfirmed)
assert.strictEqual(result.length, 1, "Current engine FAILS to filter answered questions");
assert.strictEqual(result[0].source_id, "msg_3", "Current engine FAILS to identify unconfirmed items");
