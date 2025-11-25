// promptEnhancer.js
// Exports a single function: enhancePrompt(rawText, options)
// options = { style: 'professional'|'creative'|'technical'|'concise', provider: 'chatgpt', aggressiveness: 1 }

const DEFAULTS = {
  style: 'professional',
  provider: 'chatgpt',
  aggressiveness: 1
};

const styleTemplates = {
  professional: {
    prefix: "Provide a clear, professional response. ",
    defaults: "Be concise and formal. Include examples if applicable. ",
    lengthHint: ""
  },
  creative: {
    prefix: "Write with imaginative, expressive language. ",
    defaults: "Use sensory details and unexpected turns. ",
    lengthHint: ""
  },
  technical: {
    prefix: "Be precise and technical. ",
    defaults: "Include code examples or exact steps when relevant. ",
    lengthHint: ""
  },
  concise: {
    prefix: "Be concise and to the point. ",
    defaults: "Limit to the essentials and avoid fluff. ",
    lengthHint: ""
  }
};

function sanitize(input) {
  return input.replace(/\s+/g, ' ').trim();
}

function detectIntent(text) {
  const t = text.toLowerCase();
  const keywords = {
    coding: ['code', 'function', 'implement', 'debug', 'algorithm', 'unit test', 'typescript', 'javascript', 'python'],
    creative: ['story', 'poem', 'song', 'character', 'plot', 'narrative'],
    explanation: ['explain', 'what is', 'how does', 'why', 'difference', 'describe'],
    professional: ['email', 'draft', 'report', 'proposal', 'summary'],
    academic: ['essay', 'thesis', 'research', 'study', 'explain like i\'m'],
  };
  for (const [intent, arr] of Object.entries(keywords)) {
    for (const kw of arr) {
      if (t.includes(kw)) return intent;
    }
  }
  return 'general';
}

function extractConstraints(text) {
  // simple slot extraction
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

  // Basic instruction
  pieces.push(template.prefix);

  // Include the user's original text rephrased as instruction
  const isQuestion = /\?$/i.test(text) || /^how|what|why|explain/i.test(text);
  if (isQuestion) {
    pieces.push(`Answer the following request: "${text}". `);
  } else {
    pieces.push(`Perform this task: "${text}". `);
  }

  // Intent-specific additions
  if (intent === 'coding') {
    pieces.push("Provide code examples, edge cases, and test cases where relevant. ");
  } else if (intent === 'creative') {
    pieces.push("Include vivid descriptions, character details, and an engaging opening. ");
  } else if (intent === 'explanation' || intent === 'academic') {
    pieces.push("Break the explanation into short paragraphs or numbered steps. Include examples and analogies. ");
  } else if (intent === 'professional') {
    pieces.push("Use a formal tone and include a short summary at the end. ");
  }

  // Style defaults
  pieces.push(template.defaults);

  // Slots
  if (slots.audience) pieces.push(`Target the response to ${slots.audience}. `);
  if (slots.length) pieces.push(`Keep the response around ${slots.length} words. `);
  if (slots.tone) pieces.push(`Maintain a ${slots.tone} tone. `);

  // Provider-specific hint (example)
  if (options.provider === 'chatgpt') {
    pieces.push("Format code blocks using triple backticks if including code. ");
  }

  // Aggressiveness: how much to add new info
  if (options.aggressiveness > 1) {
    pieces.push("Add helpful assumptions where necessary, and propose follow-up questions the user might want to ask. ");
  }

  // Final sanitation
  return pieces.join('').replace(/\s+/g, ' ').trim();
}

// exported function
export function enhancePrompt(rawText, opts = {}) {
  const options = Object.assign({}, DEFAULTS, opts);
  const text = sanitize(rawText || '');
  if (!text) return '';

  const intent = detectIntent(text);
  const slots = extractConstraints(text);
  const enhanced = applyTemplate(intent, options.style, text, slots, options);

  return enhanced;
}

// generateCRISPE: convert an ordinary prompt into a structured CRISPE-style prompt.
// Assumptions: CRISPE is a structured prompt with fields like Context, Role, Instruction,
// Persona, Style, and Examples. This helper produces a deterministic wrapper the LLM
// or local enhancer can consume. If you want server-side CRISPE generation instead,
// we can move this logic to the server.
export function generateCRISPE(rawText, opts = {}) {
  const text = sanitize(rawText || '');
  if (!text) return '';

  const intent = detectIntent(text);
  const slots = extractConstraints(text);

  // Defaults and overrides
  const roleIntro = opts.roleIntro || 'You are a specialized professional with expertise in creating high-quality content.';
  const styleHint = opts.style || DEFAULTS.style;
  const examples = opts.examples || '';
  const context = opts.context || '';

  // Build the CRISPE-style wrapper following the user's required headings and content.
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

  // Optionally add audience/length hints
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

  // Final instruction for the model to generate the content (the LLM should produce the response following the above constraints)
  lines.push('Now, produce the requested response following the instructions above.');

  return lines.join('\n');
}

// For compatibility we still expose a browser-global; module consumers should import enhancePrompt.
window.PromptEnhancer = {
  enhancePrompt: (t, o) => enhancePrompt(t, o),
  generateCRISPE: (t, o) => generateCRISPE(t, o)
};




