/**
 * heuristics.js — Deterministic Extraction Logic
 * 
 * Contains pure, stateless extraction heuristics for CatchUp.
 * Does not depend on WebLLM or external APIs.
 */

export function extractDeterministicFindings(messages) {
  const fallbackNeedsYou = [];
  const fallbackActions = [];
  const fallbackDecisions = [];
  const fallbackQuestions = [];

  messages.forEach(msg => {
    // 1. Needs You (Attention)
    if (/(^|\W)@?Sumit(\W|$)/i.test(msg.text) || /(^|\W)@?Sumit(\W|$)/i.test(msg.sender)) {
      fallbackNeedsYou.push({ text: `Attention requested: "${msg.text}"`, quote: msg.text, source_id: msg.id, priority: "high" });
    }

    // 2. Open Questions
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

    // 3. Commitments/Tasks
    const isCommitment = /(?:I will|I'll|I can|we will|we'll)/i.test(msg.text);
    const isTeamImperative = /(?:Everyone must|Everyone arrive|We need team|team testing)/i.test(msg.text);

    if ((isCommitment || isTeamImperative) && !msg.text.includes('?')) {
      let owner = msg.sender;
      const mentionMatch = msg.text.match(/^@([A-Za-z0-9_]+)/);
      if (mentionMatch) {
        owner = mentionMatch[1];
      }
      if (/everyone|team/i.test(msg.text)) owner = "Team";
      fallbackActions.push({ text: `Confirmed task: "${msg.text}"`, owner, quote: msg.text, source_id: msg.id });
    }

    // 4. Decisions
    if (/(?:decided|agreed|will use|decision|require|requirement)/i.test(msg.text) && !/(?:maybe|unconfirmed|undecided|pending|haven't decided|not decided|not booked)/i.test(msg.text) && !msg.text.includes('?')) {
      fallbackDecisions.push({ text: `Decision made: "${msg.text}"`, quote: msg.text, source_id: msg.id });
    }
  });

  return { fallbackNeedsYou, fallbackActions, fallbackDecisions, fallbackQuestions };
}

export function dedupe(arr1, arr2) {
    const map = new Map();
    const seenTexts = new Set();

    [...arr1, ...arr2].forEach(f => {
      if (!f || !f.text) return;
      const key = f.source_id + '::' + f.text;
      if (!map.has(key) && !seenTexts.has(f.text)) {
        map.set(key, f);
        seenTexts.add(f.text);
      }
    });
    return Array.from(map.values());
}
