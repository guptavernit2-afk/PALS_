import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

const conversation = [
  { id: "msg_01", sender: "Alice", text: "Hey, are we still meeting for the hackathon planning tomorrow at 10 AM?" },
  { id: "msg_02", sender: "Bob", text: "I can't make 10 AM, I have a dentist appointment. Can we do 1 PM instead?" },
  { id: "msg_03", sender: "Charlie", text: "1 PM works for me. We need to decide on the tech stack. I'm thinking WebLLM." },
  { id: "msg_04", sender: "Alice", text: "Sounds good. Bob, can you look into WebLLM docs before we meet?" },
  { id: "msg_05", sender: "Bob", text: "Will do. See you both at 1 PM." }
];

const elements = {
  chatContainer: document.getElementById('chat-container'),
  analyzeBtn: document.getElementById('analyze-btn'),
  statusContainer: document.getElementById('status-container'),
  statusText: document.getElementById('status-text'),
  statusDetail: document.getElementById('status-detail'),
  progressFill: document.getElementById('progress-fill'),
  errorContainer: document.getElementById('error-container'),
  errorText: document.getElementById('error-text'),
  retryBtn: document.getElementById('retry-btn'),
  resultsSection: document.getElementById('results-section'),
  summaryText: document.getElementById('summary-text'),
  findingsList: document.getElementById('findings-list')
};

// Global engine promise to prevent concurrent initialization
let enginePromise = null;

function renderConversation() {
  elements.chatContainer.innerHTML = '';
  conversation.forEach(msg => {
    const div = document.createElement('div');
    div.className = `message ${msg.sender}`;
    // Safe innerHTML because conversation array is controlled/hardcoded constants
    div.innerHTML = `
      <div class="message-header">${msg.sender} (ID: ${msg.id})</div>
      <div class="message-bubble">${msg.text}</div>
    `;
    elements.chatContainer.appendChild(div);
  });
}

function updateStatus(text, detail, progress) {
  elements.statusContainer.classList.remove('hidden');
  elements.errorContainer.classList.add('hidden');
  elements.statusText.textContent = text;
  if (detail) elements.statusDetail.textContent = detail;
  if (progress !== undefined) elements.progressFill.style.width = `${progress * 100}%`;
}

function showError(msg) {
  elements.statusContainer.classList.add('hidden');
  elements.errorContainer.classList.remove('hidden');
  elements.errorText.textContent = msg;
  elements.analyzeBtn.disabled = false;
}

async function runAnalysis() {
  elements.analyzeBtn.disabled = true;
  elements.resultsSection.classList.add('hidden');
  elements.errorContainer.classList.add('hidden');
  
  try {
    if (!enginePromise) {
      updateStatus("Initializing Model...", "Checking WebGPU and downloading weights if needed.", 0);
      
      const selectedModel = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
      enginePromise = CreateMLCEngine(
        selectedModel,
        {
          initProgressCallback: (progress) => {
            updateStatus("Loading Model", progress.text, progress.progress);
          }
        }
      );
    }
    
    const engine = await enginePromise;

    updateStatus("Running Inference...", "Analyzing conversation locally...", 1);

    const convText = conversation.map(c => `[${c.id}] ${c.sender}: ${c.text}`).join('\n');
    
    const messages = [
      {
        role: "system",
        content: `You are an AI assistant that analyzes conversations. You MUST output strictly in JSON format. 
The JSON must have this exact structure:
{
  "summary": "A 1-2 sentence summary of the conversation.",
  "findings": [
    { 
      "text": "Actionable insight or key decision",
      "quote": "A short, exact phrase quoted directly from the source message.",
      "source_id": "msg_xx" 
    }
  ]
}
Do not output any text before or after the JSON. Only return the JSON object.`
      },
      {
        role: "user",
        content: `Analyze this conversation:\n\n${convText}`
      }
    ];

    const reply = await engine.chat.completions.create({
      messages,
      temperature: 0.1,
      response_format: { type: "text" }
    });

    const replyText = reply.choices[0].message.content;
    
    // Attempt to parse JSON
    let parsed;
    try {
      parsed = JSON.parse(replyText);
    } catch (e) {
      // Fallback: extract json from markdown blocks if model hallucinated them
      const match = replyText.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (match) {
        parsed = JSON.parse(match[1]);
      } else {
        throw new Error("Model did not return valid JSON. Output: " + replyText.substring(0, 50) + "...");
      }
    }

    if (!parsed.summary || !Array.isArray(parsed.findings)) {
      throw new Error("JSON structure is invalid.");
    }

    // Validate IDs and Quotations
    const msgMap = new Map(conversation.map(c => [c.id, c.text]));
    
    parsed.findings = parsed.findings.filter(f => {
      // 1. Strict ID Check
      if (!msgMap.has(f.source_id)) {
        console.warn(`Filtering finding with invalid source_id: ${f.source_id}`);
        return false;
      }
      
      // 2. Strict Quotation Check
      const originalMessage = msgMap.get(f.source_id);
      if (!f.quote || !originalMessage.includes(f.quote)) {
        console.warn(`Filtering finding with hallucinated or missing quote: "${f.quote}" for ID: ${f.source_id}`);
        return false;
      }
      
      return true;
    });

    displayResults(parsed);
    elements.statusContainer.classList.add('hidden');
    
  } catch (error) {
    console.error("Analysis failed:", error);
    showError(error.message || "An unknown error occurred during inference.");
  } finally {
    elements.analyzeBtn.disabled = false;
  }
}

function displayResults(data) {
  elements.resultsSection.classList.remove('hidden');
  elements.summaryText.textContent = data.summary; // Secure assignment (prevents XSS)
  
  elements.findingsList.innerHTML = '';
  data.findings.forEach(finding => {
    const li = document.createElement('li');
    
    // Secure DOM creation prevents XSS
    const textNode = document.createTextNode(`${finding.text} `);
    li.appendChild(textNode);
    
    const quoteEl = document.createElement('em');
    quoteEl.textContent = `"${finding.quote}"`;
    li.appendChild(quoteEl);
    
    const badgeSpan = document.createElement('span');
    badgeSpan.className = 'ref-badge';
    badgeSpan.textContent = `[Ref: ${finding.source_id}]`;
    li.appendChild(badgeSpan);
    
    elements.findingsList.appendChild(li);
  });
}

elements.analyzeBtn.addEventListener('click', runAnalysis);
elements.retryBtn.addEventListener('click', runAnalysis);

renderConversation();
