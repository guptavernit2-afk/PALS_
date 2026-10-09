/**
 * app.js — CatchUp Application Controller
 * 
 * Manages UI state, navigation, user input, and renders results.
 * Delegates all AI work to engine.js.
 * All model-generated content is rendered via safe DOM APIs (textContent / createTextNode).
 */

import { initEngine, isEngineReady, parseConversation, analyzeConversation } from './engine.js';

// ── Sample Conversation ──
const SAMPLE_CONVERSATION = `Alice: Hey, are we still meeting for the hackathon planning tomorrow at 10 AM?
Bob: I can't make 10 AM, I have a dentist appointment. Can we do 1 PM instead?
Charlie: 1 PM works for me. We need to decide on the tech stack. I'm thinking we use WebLLM for the AI component.
Alice: Sounds good. Bob, can you look into the WebLLM documentation before we meet?
Bob: Will do. Also, should we use React or keep it vanilla JS?
Alice: Let's keep it simple for now. Vanilla JS unless we hit a wall.
Charlie: Agreed. Who's handling the UI design? I can do it if nobody else wants to.
Alice: That would be great, Charlie. I'll focus on the AI integration then.
Bob: Perfect. See you both at 1 PM tomorrow.
Charlie: One more thing — do we have access to the hackathon API credentials yet?
Alice: Not yet. I'll email the organizers today and ask.`;

// ── DOM Elements ──
const $ = id => document.getElementById(id);

const dom = {
  // Sidebar & nav
  sidebar:         $('sidebar'),
  sidebarOverlay:  $('sidebar-overlay'),
  mobileMenuBtn:   $('mobile-menu-btn'),
  navAnalyze:      $('nav-analyze'),
  navAbout:        $('nav-about'),
  pageAnalyze:     $('page-analyze'),
  pageAbout:       $('page-about'),

  // Model status
  modelDot:        $('model-dot'),
  modelStatusText: $('model-status-text'),

  // Input
  inputPanel:      $('input-panel'),
  textarea:        $('conversation-input'),
  charCount:       $('char-count'),
  loadSampleBtn:   $('load-sample-btn'),
  clearBtn:        $('clear-btn'),
  analyzeBtn:      $('analyze-btn'),
  inputHint:       $('input-hint'),

  // Progress
  progressPanel:   $('progress-panel'),
  progressTitle:   $('progress-title'),
  progressDetail:  $('progress-detail'),
  progressFill:    $('progress-fill'),

  // Error
  errorPanel:      $('error-panel'),
  errorDetail:     $('error-detail'),
  retryBtn:        $('retry-btn'),

  // Results
  resultsWorkspace:$('results-workspace'),
  newAnalysisBtn:  $('new-analysis-btn'),
  sectionNeedsYou: $('section-needs-you'),
  needsYouList:    $('needs-you-list'),
  summaryList:     $('summary-list'),
  sectionActions:  $('section-actions'),
  actionsList:     $('actions-list'),
  sectionDecisions:$('section-decisions'),
  decisionsList:   $('decisions-list'),
  sectionQuestions:$('section-questions'),
  questionsList:   $('questions-list'),
};

// ── State ──
let isAnalyzing = false;
let currentMessages = [];

// ══════════════
// Navigation
// ══════════════
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  if (page === 'about') {
    dom.pageAbout.classList.add('active');
    dom.navAbout.classList.add('active');
  } else {
    dom.pageAnalyze.classList.add('active');
    dom.navAnalyze.classList.add('active');
  }
  closeSidebar();
}

function closeSidebar() {
  dom.sidebar.classList.remove('open');
  dom.sidebarOverlay.classList.add('hidden');
}

dom.navAnalyze.addEventListener('click', e => { e.preventDefault(); navigateTo('analyze'); });
dom.navAbout.addEventListener('click', e => { e.preventDefault(); navigateTo('about'); });
dom.mobileMenuBtn.addEventListener('click', () => {
  dom.sidebar.classList.add('open');
  dom.sidebarOverlay.classList.remove('hidden');
});
dom.sidebarOverlay.addEventListener('click', closeSidebar);

// ══════════════
// Input Handling
// ══════════════
function updateCharCount() {
  const val = dom.textarea.value;
  const len = val.length;
  dom.charCount.textContent = `${len.toLocaleString()} character${len !== 1 ? 's' : ''}`;
}

dom.textarea.addEventListener('input', () => {
  updateCharCount();
  dom.inputHint.textContent = '';
});

dom.loadSampleBtn.addEventListener('click', () => {
  dom.textarea.value = SAMPLE_CONVERSATION;
  updateCharCount();
  dom.inputHint.textContent = '';
});

dom.clearBtn.addEventListener('click', () => {
  dom.textarea.value = '';
  updateCharCount();
  dom.inputHint.textContent = '';
});

// ══════════════
// Model Status
// ══════════════
function setModelStatus(state, text) {
  dom.modelDot.className = 'model-dot';
  if (state) dom.modelDot.classList.add(state);
  dom.modelStatusText.textContent = text;
}

// ══════════════
// UI State Transitions
// ══════════════
function showView(view) {
  dom.inputPanel.classList.toggle('hidden', view !== 'input');
  dom.progressPanel.classList.toggle('hidden', view !== 'progress');
  dom.errorPanel.classList.toggle('hidden', view !== 'error');
  dom.resultsWorkspace.classList.toggle('hidden', view !== 'results');
}

function setProgress(title, detail, pct) {
  dom.progressTitle.textContent = title;
  dom.progressDetail.textContent = detail;
  if (pct !== undefined) {
    dom.progressFill.style.width = `${Math.round(pct * 100)}%`;
  }
}

function showError(message) {
  showView('error');
  dom.errorDetail.textContent = message;
  dom.analyzeBtn.disabled = false;
  isAnalyzing = false;
}

// ══════════════
// Analysis Flow
// ══════════════
async function runAnalysis() {
  if (isAnalyzing) return;

  const raw = dom.textarea.value.trim();
  if (!raw) {
    dom.inputHint.textContent = 'Please paste a conversation to analyze.';
    return;
  }

  currentMessages = parseConversation(raw);
  if (currentMessages.length < 2) {
    dom.inputHint.textContent = 'Could not detect messages. Use the format "Name: message", one per line.';
    return;
  }

  isAnalyzing = true;
  dom.analyzeBtn.disabled = true;
  dom.inputHint.textContent = '';

  showView('progress');
  setProgress('Preparing model…', 'This may take a moment on the first run.', 0);
  setModelStatus('loading', 'Loading model…');

  try {
    const result = await analyzeConversation(currentMessages, (info) => {
      setProgress('Loading model…', info.text, info.progress);
    });

    setModelStatus('ready', 'Model ready');
    renderResults(result);
    showView('results');

  } catch (err) {
    console.error('Analysis failed:', err);
    setModelStatus('error', 'Model error');
    showError(err.message || 'An unknown error occurred during analysis.');
  } finally {
    dom.analyzeBtn.disabled = false;
    isAnalyzing = false;
  }
}

dom.analyzeBtn.addEventListener('click', runAnalysis);
dom.retryBtn.addEventListener('click', () => {
  showView('input');
  runAnalysis();
});
dom.newAnalysisBtn.addEventListener('click', () => {
  showView('input');
  dom.textarea.focus();
});

// ══════════════
// Render Results (safe DOM only)
// ══════════════
function renderResults(data) {
  // Needs You
  renderCardList(dom.needsYouList, data.needs_you, dom.sectionNeedsYou, true);

  // Summary
  dom.summaryList.innerHTML = '';
  data.summary_points.forEach(point => {
    const li = document.createElement('li');
    li.textContent = point; // Safe
    dom.summaryList.appendChild(li);
  });

  // Action Items
  renderCardList(dom.actionsList, data.action_items, dom.sectionActions, false, true);

  // Decisions
  renderCardList(dom.decisionsList, data.decisions, dom.sectionDecisions);

  // Open Questions
  renderCardList(dom.questionsList, data.open_questions, dom.sectionQuestions);
}

/**
 * Renders a list of finding cards using safe DOM APIs.
 * @param {HTMLElement} container 
 * @param {Array} items 
 * @param {HTMLElement} section - The section wrapper to show/hide
 * @param {boolean} showPriority 
 * @param {boolean} showOwner 
 */
function renderCardList(container, items, section, showPriority = false, showOwner = false) {
  container.innerHTML = '';

  if (!items || items.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'finding-card';

    // Text
    const textEl = document.createElement('p');
    textEl.className = 'finding-text';
    textEl.textContent = item.text; // Safe
    card.appendChild(textEl);

    // Owner (action items)
    if (showOwner && item.owner) {
      const ownerEl = document.createElement('span');
      ownerEl.className = 'finding-owner';
      ownerEl.textContent = `→ ${item.owner}`; // Safe
      card.appendChild(ownerEl);
    }

    // Meta row
    const meta = document.createElement('div');
    meta.className = 'finding-meta';

    // Quote
    if (item.quote) {
      const quoteEl = document.createElement('span');
      quoteEl.className = 'finding-quote';
      quoteEl.textContent = `"${item.quote}"`; // Safe
      meta.appendChild(quoteEl);
    }

    // Ref badge
    if (item.source_id) {
      const ref = document.createElement('span');
      ref.className = 'finding-ref';

      // Look up the sender for this message
      const msg = currentMessages.find(m => m.id === item.source_id);
      const senderLabel = msg ? `${msg.sender} · ` : '';
      ref.textContent = `${senderLabel}${item.source_id}`; // Safe
      meta.appendChild(ref);
    }

    card.appendChild(meta);
    container.appendChild(card);
  });
}

// ══════════════
// Init
// ══════════════
updateCharCount();
