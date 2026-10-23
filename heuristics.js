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

    const getKey = f => {
      if (!f || !f.source_id) return null;
      if (f.quote && typeof f.quote === 'string' && f.quote.trim().length > 0) {
        return f.source_id + '::' + f.quote;
      }
      return f.source_id + '::' + f.text;
    };

    // First pass: deduplicate using the key function
    const allFindings = [...arr1, ...arr2];
    const uniqueKeys = new Set();
    const deduplicated = [];

    allFindings.forEach(f => {
      if (!f || !f.text || !f.source_id) return;

      const key = getKey(f);
      if (key === null) return;

      if (!uniqueKeys.has(key)) {
        uniqueKeys.add(key);
        deduplicated.push(f);
      }
    });

    // Second pass: apply owner guard to deduplicated findings
    const finalMap = new Map();
    deduplicated.forEach(f => {
      const key = getKey(f);
      if (key === null) return;

      const existing = finalMap.get(key);

      if (existing) {
        // If one finding is quote-based and the other is text-based (fallback),
        // but they have different text/quotes, do not consider them duplicates.
        const isExistingQuoteBased = existing.quote && typeof existing.quote === 'string' && existing.quote.trim().length > 0;
        const isNewQuoteBased = f.quote && typeof f.quote === 'string' && f.quote.trim().length > 0;

        if (isExistingQuoteBased !== isNewQuoteBased) {
          finalMap.set(key + '::' + (f.quote || f.text), f);
          return;
        }

        // Same key found — apply owner guard
        const existingOwner = existing.owner;
        const newOwner = f.owner;

        const ownersDiffer = existingOwner !== newOwner &&
          existingOwner !== undefined && newOwner !== undefined &&
          String(existingOwner).trim() !== String(newOwner).trim();

        if (ownersDiffer) {
          const newKey = key + '::' + (f.owner || 'unknown');
          finalMap.set(newKey, f);
        } else if (existingOwner === undefined && f.owner !== undefined) {
          existing.owner = f.owner;
        }
      } else {
        finalMap.set(key, f);
      }
    });

    return Array.from(finalMap.values());
}
