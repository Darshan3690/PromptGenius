// Helper functions from promptEnhancer.js
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
    const slots = {};
    const mLen = text.match(/(\d+)\s*(words|word|words?)/i);
    if (mLen) slots.length = parseInt(mLen[1], 10);
    const mAudience = text.match(/for (beginners|experts|students|children|kids)/i);
    if (mAudience) slots.audience = mAudience[1];
    const tone = text.match(/\b(formal|informal|casual|professional|friendly|technical|creative)\b/i);
    if (tone) slots.tone = tone[1];
    return slots;
}

// CRISPE Template Generator (from promptEnhancer.js)
function generateCRISPE(rawText, opts = {}) {
    const text = sanitize(rawText || '');
    if (!text) return '';

    const intent = detectIntent(text);
    const slots = extractConstraints(text);

    // Defaults and overrides
    const roleIntro = opts.roleIntro || 'You are a specialized professional with expertise in creating high-quality content.';
    const styleHint = opts.style || 'professional';
    const examples = opts.examples || '';
    const context = opts.context || '';

    // Build the CRISPE-style wrapper
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

    // Final instruction
    lines.push('Now, produce the requested response following the instructions above.');

    return lines.join('\n');
}

// DOM Elements
const enhanceBtn = document.getElementById('enhanceBtn');
const btnText = document.getElementById('btnText');
const rawInput = document.getElementById('rawPrompt');
const enhancedOutput = document.getElementById('enhanced');
const outputSection = document.getElementById('outputSection');
const emptyState = document.getElementById('emptyState');
const copyBtn = document.getElementById('copyBtn');
const openBtn = document.getElementById('openBtn');
const statusToast = document.getElementById('statusToast');
const statusText = document.getElementById('statusText');
const complexityBadge = document.getElementById('complexityBadge');

let currentEnhancedPrompt = "";

// Debug log
console.log('Popup script loaded');
console.log('Enhance button:', enhanceBtn);

// Load prefilled selection if any
chrome.storage.local.get(['lastSelection'], (res) => {
    if (res.lastSelection) {
        rawInput.value = res.lastSelection;
        chrome.storage.local.remove('lastSelection');
    }
});

// --- ENHANCE LOGIC (Client-side CRISPE) ---
if (enhanceBtn) {
    enhanceBtn.addEventListener('click', () => {
        console.log('Button clicked!');
        const prompt = rawInput.value.trim();
        if (!prompt) { 
            shakeInput(); 
            return; 
        }

        setButtonLoading(true, "Enhancing...");

        const style = document.getElementById('style').value;
        const provider = document.getElementById('provider').value;
        
        console.log('Generating CRISPE with:', { prompt, style, provider });
        
        // Generate CRISPE template
        const options = {
            style: style,
            provider: provider,
            aggressiveness: 1
        };

        setTimeout(() => {
            const result = generateCRISPE(prompt, options);
            console.log('Generated result:', result.substring(0, 100) + '...');
            currentEnhancedPrompt = result;
            showOutputSection();
            streamText(enhancedOutput, result);
            
            // Show complexity badge
            analyzeComplexity(result);
            
            setButtonLoading(false, "Enhance Again");
        }, 500);
    });
} else {
    console.error('Enhance button not found!');
}

// --- COMPLEXITY ANALYSIS (Client-side estimation) ---
function analyzeComplexity(prompt) {
    complexityBadge.classList.add('hidden');
    
    setTimeout(() => {
        const wordCount = prompt.split(/\s+/).length;
        const intent = detectIntent(prompt);
        
        let level = wordCount < 100 ? "Basic" : wordCount < 200 ? "Intermediate" : "Advanced";
        let type = intent.charAt(0).toUpperCase() + intent.slice(1);
        
        complexityBadge.innerHTML = `${level} • ${type}`;
        complexityBadge.classList.remove('hidden');
        complexityBadge.style.opacity = '0';
        complexityBadge.style.transform = 'scale(0.9)';
        complexityBadge.style.display = 'block';
        setTimeout(() => {
            complexityBadge.style.transition = 'all 0.3s';
            complexityBadge.style.opacity = '1';
            complexityBadge.style.transform = 'scale(1)';
        }, 10);
    }, 300);
}

openBtn.addEventListener('click', () => {
    const p = document.getElementById('provider').value;
    const text = encodeURIComponent(currentEnhancedPrompt);
    let url = "https://gemini.google.com/app";
    if (p.includes("ChatGPT")) url = `https://chat.openai.com/?q=${text}`;
    else if (p.includes("Claude")) url = "https://claude.ai/new";
    
    chrome.tabs.create({ url });
});

function setButtonLoading(isLoading, text) {
    btnText.style.opacity = '0';
    setTimeout(() => {
        btnText.innerText = text;
        btnText.style.transition = 'opacity 0.2s';
        btnText.style.opacity = '1';
    }, 200);
}

function showOutputSection() {
    if(emptyState.style.display !== 'none') {
        emptyState.style.transition = 'all 0.3s';
        emptyState.style.height = '0';
        emptyState.style.opacity = '0';
        setTimeout(() => emptyState.style.display = 'none', 300);
        
        outputSection.classList.remove('hidden');
        outputSection.style.opacity = '0';
        outputSection.style.transform = 'translateY(20px)';
        setTimeout(() => {
            outputSection.style.transition = 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            outputSection.style.opacity = '1';
            outputSection.style.transform = 'translateY(0)';
        }, 10);
    }
}

function streamText(element, text) {
    element.value = "";
    let i = 0;
    const speed = Math.min(2000 / text.length, 20);
    
    function typeChar() {
        if (i < text.length) {
            element.value += text.charAt(i);
            i++;
            setTimeout(typeChar, speed);
        }
    }
    typeChar();
}

function shakeInput() {
    const parent = rawInput.parentElement;
    parent.style.animation = 'shake 0.4s';
    setTimeout(() => parent.style.animation = '', 400);
    rawInput.classList.add('placeholder-red-400');
    setTimeout(() => rawInput.classList.remove('placeholder-red-400'), 1000);
}

copyBtn.addEventListener('click', () => {
    if(!enhancedOutput.value) return;
    navigator.clipboard.writeText(enhancedOutput.value);
    statusText.innerText = "Copied!";
    statusToast.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    statusToast.style.transform = 'translateY(0)';
    statusToast.style.opacity = '1';
    setTimeout(() => {
        statusToast.style.transform = 'translateY(20px)';
        statusToast.style.opacity = '0';
    }, 2000);
});

// Add shake animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    .placeholder-red-400::placeholder { color: #f87171; }
`;
document.head.appendChild(style);

