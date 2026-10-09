const messages = [
  { id: "msg_01", sender: "Priya", text: "Who is booking the electronics lab for Sunday?" },
  { id: "msg_02", sender: "Ananya", text: "I haven't booked it yet. It's unconfirmed. I'll confirm the room availability tomorrow." },
  { id: "msg_03", sender: "Karthik", text: "I have uploaded the component list, but the final cost table is still pending." },
  { id: "msg_04", sender: "Rahul", text: "We need to test the sensors on Sunday 3 PM." },
  { id: "msg_05", sender: "Ananya", text: "Should we buy another moisture sensor? It's undecided." },
  { id: "msg_06", sender: "Priya", text: "Upload files by Sunday 9 PM." },
  { id: "msg_07", sender: "Rahul", text: "Everyone arrive Monday at 9:30 AM for the 10 AM review." },
  { id: "msg_08", sender: "Karthik", text: "@Sumit, we need the PPT and system architecture diagram done." },
  { id: "msg_09", sender: "Sumit", text: "I'll have it due Sunday at 8 PM." }
];

function extractHybrid(messages) {
  const fallbackNeedsYou = [];
  const fallbackActions = [];
  const fallbackDecisions = [];
  const fallbackQuestions = [];

  messages.forEach(msg => {
    // 1. Needs You
    if (/(^|\W)@?Sumit(\W|$)/i.test(msg.text) || /(^|\W)@?Sumit(\W|$)/i.test(msg.sender)) {
      fallbackNeedsYou.push({
        text: `Attention requested: "${msg.text}"`,
        quote: msg.text,
        source_id: msg.id,
        priority: "high"
      });
    }

    // 2. Open Questions
    if (msg.text.includes('?')) {
      fallbackQuestions.push({
        text: `Question raised: "${msg.text}"`,
        quote: msg.text,
        source_id: msg.id
      });
    }

    // 3. Action Items and Deadlines
    const timeRegex = /Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|tomorrow|today|AM|PM|\d{1,2}:\d{2}/i;
    const taskRegex = /will|need to|upload|buy|test|book|diagram|ppt|architecture/i;
    
    if (timeRegex.test(msg.text) || taskRegex.test(msg.text)) {
      let owner = msg.sender;
      if (/(^|\W)@?Rahul(\W|$)/i.test(msg.text)) owner = "Rahul";
      if (/(^|\W)@?Priya(\W|$)/i.test(msg.text)) owner = "Priya";
      if (/(^|\W)@?Ananya(\W|$)/i.test(msg.text)) owner = "Ananya";
      if (/(^|\W)@?Karthik(\W|$)/i.test(msg.text)) owner = "Karthik";
      if (/(^|\W)@?Sumit(\W|$)/i.test(msg.text)) owner = "Sumit";
      if (/team|everyone/i.test(msg.text)) owner = "Team";
      
      fallbackActions.push({
        text: `Task or deadline: "${msg.text}"`,
        owner: owner,
        quote: msg.text,
        source_id: msg.id
      });
    }

    // 4. Decisions and Statuses
    if (/(?:decided|agreed|unconfirmed|undecided|pending|confirm)/i.test(msg.text) && !msg.text.includes('?')) {
      fallbackDecisions.push({
        text: `Status update: "${msg.text}"`,
        quote: msg.text,
        source_id: msg.id
      });
    }
  });
  
  return { fallbackNeedsYou, fallbackActions, fallbackDecisions, fallbackQuestions };
}

console.log(JSON.stringify(extractHybrid(messages), null, 2));
