// content.js
// Enhances prompts directly on supported web UIs (e.g., ChatGPT) by inserting
// an "Enhance" button next to the composer controls. When clicked the current
// prompt is transformed using the same template logic as the popup enhancer.

// --- Simple prompt enhancer (copied/adapted from promptEnhancer.js) ---
const DEFAULTS = { style: 'professional', provider: 'chatgpt', aggressiveness: 1 };
const styleTemplates = {
  professional: { prefix: "Provide a clear, professional response. ", defaults: "Be concise and formal. Include examples if applicable. ", lengthHint: "" },
  creative: { prefix: "Write with imaginative, expressive language. ", defaults: "Use sensory details and unexpected turns. ", lengthHint: "" },
  technical: { prefix: "Be precise and technical. ", defaults: "Include code examples or exact steps when relevant. ", lengthHint: "" },
  concise: { prefix: "Be concise and to the point. ", defaults: "Limit to the essentials and avoid fluff. ", lengthHint: "" }
};

function sanitize(input) { return input.replace(/\s+/g, ' ').trim(); }

function detectIntent(text) {
  const t = text.toLowerCase();
  const keywords = {
    coding: ['code', 'function', 'implement', 'debug', 'algorithm', 'unit test', 'typescript', 'javascript', 'python'],
    creative: ['story', 'poem', 'song', 'character', 'plot', 'narrative'],
    explanation: ['explain', 'what is', 'how does', 'why', 'difference', 'describe'],
    professional: ['email', 'draft', 'report', 'proposal', 'summary'],
    academic: ['essay', 'thesis', 'research', 'study', 'explain like i\'m']
  };
  for (const [intent, arr] of Object.entries(keywords)) {
    for (const kw of arr) if (t.includes(kw)) return intent;
  }
  return 'general';
}

function extractConstraints(text) {
  const slots = {};
  const mLen = text.match(/(\d+)\s*(words|word|words?)/i);
  if (mLen) slots.length = parseInt(mLen[1], 10);
  const mAudience = text.match(/for (beginners|experts|students|children|kids)/i);
  if (mAudience) slots.audience = mAudience[1];
  const tone = text.match(/\b(formal|informal|casual|professional|friendly|technical|creative)\b/i);
  if (tone) slots.tone = tone[1];
  return slots;
}

function applyTemplate(intent, style, text, slots, options) {
  const template = styleTemplates[style] || styleTemplates['professional'];
  const pieces = [];
  pieces.push(template.prefix);
  const isQuestion = /\?$/.test(text) || /^how|what|why|explain/i.test(text);
  if (isQuestion) pieces.push(`Answer the following request: "${text}". `);
  else pieces.push(`Perform this task: "${text}". `);
  if (intent === 'coding') pieces.push("Provide code examples, edge cases, and test cases where relevant. ");
  else if (intent === 'creative') pieces.push("Include vivid descriptions, character details, and an engaging opening. ");
  else if (intent === 'explanation' || intent === 'academic') pieces.push("Break the explanation into short paragraphs or numbered steps. Include examples and analogies. ");
  else if (intent === 'professional') pieces.push("Use a formal tone and include a short summary at the end. ");
  pieces.push(template.defaults);
  if (slots.audience) pieces.push(`Target the response to ${slots.audience}. `);
  if (slots.length) pieces.push(`Keep the response around ${slots.length} words. `);
  if (slots.tone) pieces.push(`Maintain a ${slots.tone} tone. `);
  if (options.provider === 'chatgpt') pieces.push("Format code blocks using triple backticks if including code. ");
  if (options.aggressiveness > 1) pieces.push("Add helpful assumptions where necessary, and propose follow-up questions the user might want to ask. ");
  return pieces.join('').replace(/\s+/g, ' ').trim();
}

function enhancePrompt(rawText, opts = {}) {
  const options = Object.assign({}, DEFAULTS, opts);
  const text = sanitize(rawText || '');
  if (!text) return '';
  const intent = detectIntent(text);
  const slots = extractConstraints(text);
  return applyTemplate(intent, options.style, text, slots, options);
}

// generateCRISPE: client-side CRISPE wrapper matching the extension's prompt format.
function generateCRISPE(rawText, opts = {}) {
  const text = sanitize(rawText || '');
  if (!text) return '';

  const slots = extractConstraints(text);
  const roleIntro = opts.roleIntro || 'You are a specialized professional with expertise in creating high-quality content.';
  const examples = opts.examples || '';
  const context = opts.context || '';

  const lines = [];
  lines.push('# Expert Role Assignment');
  lines.push(roleIntro);
  lines.push('');

  lines.push('# Task & Purpose');
  lines.push(`Create a detailed, comprehensive response based on this request: "${text}"`);
  if (context) lines.push(`\nContext: ${context}`);
  lines.push('');

  lines.push('# Content Structure');
  lines.push('Organize your response with clear sections, logical flow, and appropriate hierarchy. Use headings, short paragraphs, and lists where helpful.');
  lines.push('');

  lines.push('# Required Elements');
  lines.push('- Include specific, actionable information rather than general statements');
  lines.push('- Provide concrete examples or applications where appropriate');
  lines.push('- Address all key aspects of the request with appropriate depth');
  lines.push('- Incorporate relevant context and background information');
  lines.push('');

  lines.push('# Style & Approach');
  lines.push('- Use natural, professional language that avoids AI-sounding patterns');
  lines.push('- Maintain a balanced tone that matches the subject matter');
  lines.push('- Employ clear, precise terminology appropriate to the topic');
  lines.push('- Write in active voice with concise, well-structured sentences');
  lines.push('');

  lines.push('# Quality Standards');
  lines.push('- Ensure factual accuracy and logical consistency throughout');
  lines.push('- Provide sufficient detail to be genuinely useful');
  lines.push('- Maintain appropriate scope - neither too broad nor too narrow');
  lines.push('- Create content that demonstrates domain expertise');
  lines.push('');

  lines.push('# Output Format');
  lines.push('Present your response in a well-structured format with clear headings, concise paragraphs, and appropriate use of formatting to highlight key points. Follow the structure above when composing the final answer.');
  lines.push('');

  const hints = [];
  if (slots.audience) hints.push(`Audience: ${slots.audience}`);
  if (slots.length) hints.push(`Length: approx ${slots.length} words`);
  if (hints.length) {
    lines.push('## Additional Hints');
    for (const h of hints) lines.push(`- ${h}`);
    lines.push('');
  }

  if (examples) {
    lines.push('## Examples');
    lines.push(examples);
    lines.push('');
  }

  lines.push('Now, produce the requested response following the instructions above.');
  return lines.join('\n');
}

// --- UI injection logic ---
function createEnhanceButton() {
  const btn = document.createElement('button');
  // ensure this button won't act as a submit button in forms
  btn.type = 'button';
  btn.innerText = 'Enhance';
  btn.className = 'ape-enhance-btn';
  // style to blend with ChatGPT dark UI: green rounded pill
  Object.assign(btn.style, {
    marginLeft: '8px',
    padding: '8px 12px',
    borderRadius: '999px',
    border: 'none',
    background: '#10a37f',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 1px 0 rgba(0,0,0,0.12)'
  });
  return btn;
}

function setComposerText(inputEl, text) {
  if (!inputEl) return;
  try {
    inputEl.focus();
    if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
      inputEl.value = text;
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    // For contenteditable (ChatGPT uses a React-controlled div[contenteditable])
    // use the selection + execCommand approach which React typically observes.
    const sel = window.getSelection();
    const range = document.createRange();
    // clear existing content then insert text
    range.selectNodeContents(inputEl);
    sel.removeAllRanges();
    sel.addRange(range);
    // try execCommand (widely supported) to insert text in a way React notices
    const success = document.execCommand('insertText', false, text);
    if (!success) {
      // fallback: set textContent and dispatch input event
      inputEl.textContent = text;
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
    } else {
      // dispatch input event so listeners pick up the change
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
  } catch (e) {
    try { inputEl.textContent = text; inputEl.dispatchEvent(new InputEvent('input', { bubbles: true })); } catch (e2) { /* swallow */ }
  }
}

function findComposerArea() {
  // Try multiple heuristics because chat UIs vary. Prefer a visible contenteditable role="textbox".
  // 1) contenteditable role=textbox
  const editable = Array.from(document.querySelectorAll('[contenteditable="true"][role="textbox"], [contenteditable="true"]')).find(el => {
    const rc = el.getBoundingClientRect();
    return rc.width > 20 && rc.height > 10 && window.getComputedStyle(el).visibility !== 'hidden';
  });
  // 2) send button nearby
  const sendBtn = document.querySelector('#composer-submit-button, button[class*="composer-submit"], button[data-testid*="send"], button[aria-label*="Send"], button[aria-label*="Submit"]') || document.querySelector('button[type="submit"], button[role="button"][aria-label*="send"]');

  if (editable) {
    // try to find a parent that also contains the send button
    const parentWithSend = sendBtn ? sendBtn.closest('form, div') : null;
    const parent = parentWithSend || editable.closest('form, div') || document.body;
    return { sendBtn: sendBtn || null, inputEl: editable, parent };
  }

  if (sendBtn) {
    const p = sendBtn.closest('form, div') || document.body;
    const inputEl = p.querySelector('textarea, input[type="text"]') || p.querySelector('[contenteditable="true"]');
    return { sendBtn, inputEl, parent: p };
  }

  return null;
}

function injectEnhanceButtonOnce() {
  const found = findComposerArea();
  if (!found) return;
  const { sendBtn, parent } = found;
  if (!sendBtn || parent.querySelector('.ape-enhance-btn')) return; // already injected
  const enhanceBtn = createEnhanceButton();
  // Use a stable handler that re-queries the composer area at click time
  enhanceBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleEnhanceClick(e.currentTarget, e);
  });
  // insert before send button so it appears near mic/send
  sendBtn.parentNode.insertBefore(enhanceBtn, sendBtn);
}

// central handler used by injected button and delegated clicks
async function handleEnhanceClick(buttonEl, evt) {
  if (evt) {
    try { evt.preventDefault(); evt.stopPropagation(); } catch (e) {}
  }
  const found = findComposerArea();
  if (!found) return;
  const { inputEl, sendBtn } = found;
  if (!inputEl) return;
  const raw = (inputEl && (inputEl.value || inputEl.textContent || inputEl.innerText || '')) || '';

  // Decide mode from storage: client-side wrapper or send CRISPE to server
  try {
    chrome.storage.local.get(['enhanceMode'], async (res) => {
      const mode = (res && res.enhanceMode) || 'client';
      const wrapper = generateCRISPE(raw, { context: '' });
      if (mode === 'server') {
        // send wrapper to server for LLM processing
        try {
          const serverResult = await requestRemoteEnhancement(wrapper, 'professional');
          if (serverResult) {
            setComposerText(inputEl, serverResult);
          } else {
            setComposerText(inputEl, wrapper);
          }
        } catch (e) {
          // fallback to client wrapper on error
          setComposerText(inputEl, wrapper);
        }
      } else {
        // client mode: insert the wrapper directly
        setComposerText(inputEl, wrapper);
      }

      try { if (sendBtn && typeof sendBtn.blur === 'function') sendBtn.blur(); } catch (e) {}
    });
  } catch (e) {
    // if storage API fails, fallback to client wrapper
    const enhanced = generateCRISPE(raw, { context: '' });
    if (enhanced) setComposerText(inputEl, enhanced);
    try { if (sendBtn && typeof sendBtn.blur === 'function') sendBtn.blur(); } catch (e) {}
  }
}

// Delegate clicks in case the page replaces our button or another white button is present
document.addEventListener('click', (e) => {
  const btn = e.target.closest && e.target.closest('.ape-enhance-btn, .ape-enhance-white');
  if (btn) {
    e.preventDefault();
    e.stopPropagation();
    handleEnhanceClick(btn);
  }
});

// Ask the background service worker to call the local server for enhancement.
// Returns a promise that resolves to the enhanced string, or rejects if the
// request failed or the server did not return a value.
function requestRemoteEnhancement(text, style) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({ type: 'enhance-request', text, style }, (resp) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (!resp) return reject(new Error('no response'));
        if (resp.ok && resp.enhanced) return resolve(resp.enhanced);
        return reject(new Error(resp.error || 'server failed'));
      });
    } catch (e) {
      reject(e);
    }
  });
}

// watch for dynamic UI (ChatGPT mounts controls after load)
const observer = new MutationObserver((mutations) => {
  injectEnhanceButtonOnce();
});
observer.observe(document.body, { childList: true, subtree: true });

// try once after idle
window.addEventListener('load', () => setTimeout(injectEnhanceButtonOnce, 1000));
setTimeout(injectEnhanceButtonOnce, 1500);

// keep selection capture behavior for context menu usage
document.addEventListener('mouseup', () => {
  let sel = window.getSelection().toString().trim();
  if (sel) {
    // optional: could send selection to background or popup via messages
    // chrome.runtime.sendMessage({ type: 'selection', text: sel });
  }
});
