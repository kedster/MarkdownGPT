// Configuration for worker endpoints
const CONFIG = {
    JWT_WORKER_URL: 'https://markdowngpt-worker-jwt.sethkeddy.workers.dev',
    AI_WORKER_URL: 'https://markdowngpt-worker-ai.sethkeddy.workers.dev',
    ENABLE_JWT: false,
    ENABLE_GITHUB_MODELS: false,
    MAX_TEXT_LENGTH: 1000,
    RETRY_ATTEMPTS: 3,
    TIMEOUT_MS: 30000
};

// Application state management with error tracking
const editorState = {
    content: '',
    currentFormat: null,
    sessionId: null,
    token: null,
    tokenExpiry: null,
    isProcessing: false,
    lastError: null,
    errors: []
};

// DOM element references with null checks
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const stats = document.getElementById('stats');

// Library availability flags
const librariesReady = {
    marked: false,
    hljs: false
};

// Initialize libraries with fallbacks
function initializeLibraries() {
    // Check if marked is available
    if (typeof marked !== 'undefined') {
        librariesReady.marked = true;

        // Check if highlight.js is available
        if (typeof hljs !== 'undefined') {
            librariesReady.hljs = true;

            // Configure marked with syntax highlighting
            marked.setOptions({
                highlight: function(code, lang) {
                    if (lang && hljs.getLanguage(lang)) {
                        try {
                            return hljs.highlight(code, { language: lang }).value;
                        } catch (err) {
                            logError('Syntax highlighting error', err);
                        }
                    }
                    return hljs.highlightAuto(code).value;
                },
                breaks: true,
                gfm: true
            });
        } else {
            // Configure marked without syntax highlighting
            marked.setOptions({
                breaks: true,
                gfm: true
            });
            showNotification('⚠️ Syntax highlighting not available', 'warning');
        }
    } else {
        librariesReady.marked = false;
        showNotification('⚠️ Markdown rendering not available - using basic formatting', 'warning');
    }
}

// Error logging and tracking
function logError(message, error, context = {}) {
    const errorInfo = {
        message,
        error: error instanceof Error ? error.message : error,
        context,
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : null
    };

    editorState.errors.push(errorInfo);
    editorState.lastError = errorInfo;

    console.error('MarkdownGPT Error:', errorInfo);

    // Keep only last 10 errors
    if (editorState.errors.length > 10) {
        editorState.errors = editorState.errors.slice(-10);
    }
}

// Initialize application on page load
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize libraries and check availability
        initializeLibraries();

        // Validate DOM elements
        if (!editor || !preview || !stats) {
            throw new Error('Required DOM elements not found');
        }

        // Initialize session
        if (CONFIG.ENABLE_JWT) {
            await initializeSession();
        } else {
            // Generate a simple session ID for non-JWT mode
            editorState.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        // Set default content
        const defaultContent = getDefaultContent();
        editor.value = defaultContent;
        updatePreview(defaultContent);
        updateStats(defaultContent);

        // Setup event listeners with error handling
        setupEventListeners();

        showNotification('✅ MarkdownGPT initialized successfully', 'success');

    } catch (error) {
        logError('Application initialization failed', error);
        showNotification('❌ Failed to initialize application', 'error');
    }
});

// Setup event listeners with error handling
function setupEventListeners() {
    try {
        // Real-time preview update with debouncing
        let updateTimeout;
        editor.addEventListener('input', function() {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => {
                try {
                    const content = editor.value;
                    editorState.content = content;
                    updatePreview(content);
                    updateStats(content);
                } catch (error) {
                    logError('Preview update failed', error);
                }
            }, 300); // 300ms debounce
        });

        // Handle paste events
        editor.addEventListener('paste', function(e) {
            try {
                setTimeout(() => {
                    const content = editor.value;
                    if (content.length > CONFIG.MAX_TEXT_LENGTH) {
                        editor.value = content.substring(0, CONFIG.MAX_TEXT_LENGTH);
                        showNotification(`⚠️ Text truncated to ${CONFIG.MAX_TEXT_LENGTH} characters`, 'warning');
                    }
                }, 10);
            } catch (error) {
                logError('Paste handling failed', error);
            }
        });

        // Global error handler
        window.addEventListener('error', function(e) {
            logError('Global error', e.error, {
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno
            });
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', function(e) {
            logError('Unhandled promise rejection', e.reason);
            e.preventDefault();
        });

        // Settings event listeners
        const enableIconsCheckbox = document.getElementById('enableIcons');
        const enablePrefilledCheckbox = document.getElementById('enablePrefilled');

        if (enableIconsCheckbox) {
            enableIconsCheckbox.addEventListener('change', function() {
                showNotification(`Icons and emojis ${this.checked ? 'enabled' : 'disabled'}`, 'info');
            });
        }

        if (enablePrefilledCheckbox) {
            enablePrefilledCheckbox.addEventListener('change', function() {
                if (!this.checked) {
                    // Clear prefilled content if disabled
                    const currentContent = editor.value.trim();
                    const defaultContent = getDefaultContent().trim();
                    if (currentContent === defaultContent || currentContent.includes('Welcome to MarkdownGPT')) {
                        editor.value = '';
                        editor.dispatchEvent(new Event('input'));
                    }
                } else {
                    // Restore default content if enabled and editor is empty
                    if (!editor.value.trim()) {
                        const defaultContent = getDefaultContent();
                        editor.value = defaultContent;
                        editor.dispatchEvent(new Event('input'));
                    }
                }
                showNotification(`Prefilled text ${this.checked ? 'enabled' : 'disabled'}`, 'info');
            });
        }

    } catch (error) {
        logError('Event listener setup failed', error);
    }
}

// Initialize session with JWT worker
async function initializeSession() {
    try {

        const sessionResponse = await fetch(`${CONFIG.JWT_WORKER_URL}/session/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userAgent: navigator.userAgent,
                ipAddress: 'client'
            })
        });

        if (!sessionResponse.ok) {
            throw new Error('Failed to create session');
        }

        const sessionData = await sessionResponse.json();
        editorState.sessionId = sessionData.sessionId;

        // Generate JWT token
        const tokenResponse = await fetch(`${CONFIG.JWT_WORKER_URL}/auth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: editorState.sessionId,
                userAgent: navigator.userAgent,
                ipAddress: 'client'
            })
        });

        if (!tokenResponse.ok) {
            throw new Error('Failed to generate token');
        }

        const tokenData = await tokenResponse.json();
        editorState.token = tokenData.token;
        editorState.tokenExpiry = Date.now() + (tokenData.expiresIn * 1000);

        console.log('Session initialized successfully');
    } catch (error) {
        console.error('Session initialization failed:', error);
        // Continue without JWT if initialization fails
        CONFIG.ENABLE_JWT = false;
        // Fallback to simple session ID
        editorState.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Check if token needs refresh
async function ensureValidToken() {
    if (!CONFIG.ENABLE_JWT || !editorState.token) {
        return true;
    }

    // Check if token expires within 5 minutes
    if (editorState.tokenExpiry && (editorState.tokenExpiry - Date.now()) < 300000) {
        try {
            const refreshResponse = await fetch(`${CONFIG.JWT_WORKER_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: editorState.token
                })
            });

            if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                editorState.token = refreshData.token;
                editorState.tokenExpiry = Date.now() + (refreshData.expiresIn * 1000);
                console.log('Token refreshed successfully');
            } else {
                console.warn('Token refresh failed');
                return false;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        }
    }

    return true;
}

// Real-time preview update
editor.addEventListener('input', function() {
    const content = editor.value;
    editorState.content = content;
    updatePreview(content);
    updateStats(content);
});

function updatePreview(content) {
    try {
        if (!preview) {
            throw new Error('Preview element not found');
        }

        if (librariesReady.marked) {
            // Use marked.js for full markdown parsing
            preview.innerHTML = marked.parse(content);
        } else {
            // Fallback to basic HTML conversion
            const basicHtml = convertBasicMarkdown(content);
            preview.innerHTML = basicHtml;
        }

        // Update character counter
        const charCounter = document.getElementById('charCounter');
        if (charCounter) {
            const remaining = CONFIG.MAX_TEXT_LENGTH - content.length;
            charCounter.textContent = `${content.length}/${CONFIG.MAX_TEXT_LENGTH}`;
            charCounter.style.color = remaining < 100 ? '#ff6b6b' : '#666';
        }

    } catch (error) {
        logError('Preview update failed', error);
        if (preview) {
            preview.innerHTML = '<p style="color: #ff6b6b; font-style: italic;">⚠️ Preview unavailable</p>';
        }
    }
}

// Basic markdown conversion fallback
function convertBasicMarkdown(content) {
    try {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
            .replace(/^- (.*$)/gm, '<li>$1</li>')
            .replace(/\n/g, '<br>');
    } catch (error) {
        logError('Basic markdown conversion failed', error);
        return content.replace(/\n/g, '<br>');
    }
}

function updateStats(content) {
    try {
        if (!stats) {
            return;
        }

        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const chars = content.length;
        const lines = content.split('\n').length;
        const remaining = CONFIG.MAX_TEXT_LENGTH - chars;

        const statsText = `Words: ${words} | Characters: ${chars} | Lines: ${lines}`;
        const statusText = remaining < 0 ? ` | ⚠️ Exceeded limit by ${Math.abs(remaining)}` :
            remaining < 100 ? ` | ${remaining} remaining` : '';

        stats.textContent = statsText + statusText;
        stats.style.color = remaining < 0 ? '#ff6b6b' : remaining < 100 ? '#ff9800' : '#666';

    } catch (error) {
        logError('Stats update failed', error);
    }
}

function insertFormat(before, after, placeholder) {
    try {
        if (!editor) {
            throw new Error('Editor element not found');
        }

        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selectedText = editor.value.substring(start, end);
        const textToInsert = selectedText || placeholder;
        const newText = before + textToInsert + after;

        // Check if the new text would exceed the limit
        const newTotalLength = editor.value.length - (end - start) + newText.length;
        if (newTotalLength > CONFIG.MAX_TEXT_LENGTH) {
            showNotification('⚠️ Text would exceed character limit', 'warning');
            return;
        }

        editor.value = editor.value.substring(0, start) + newText + editor.value.substring(end);
        editor.focus();

        if (!selectedText) {
            editor.setSelectionRange(start + before.length, start + before.length + placeholder.length);
        } else {
            editor.setSelectionRange(start + newText.length, start + newText.length);
        }

        editor.dispatchEvent(new Event('input'));

    } catch (error) {
        logError('Format insertion failed', error, { before, after, placeholder });
        showNotification('❌ Failed to insert format', 'error');
    }
}

// Enhanced auto-format with AI processing
async function autoFormat() {
    const content = editor.value.trim();

    if (!content) {
        alert('Please enter some text to format.');
        return;
    }

    if (content.length > 1000) {
        alert('Text is too long. Please limit to 1000 characters.');
        return;
    }

    // Get the button that triggered this (if called from button click)
    const button = event && event.target ? event.target : document.querySelector('button[onclick="autoFormat()"]');

    try {
        // Show loading state
        if (button) {
            const originalButtonText = button.textContent;
            button.textContent = '🔄 Processing...';
            button.disabled = true;
            // Store original text for restoration
            button.dataset.originalText = originalButtonText;
        }

        // Ensure we have a valid token
        const tokenValid = await ensureValidToken();
        if (!tokenValid && CONFIG.ENABLE_JWT) {
            throw new Error('Authentication failed');
        }

        // Determine format based on content analysis
        let detectedFormat = 'general';
        if (content.includes('function') || content.includes('const') || content.includes('class')) {
            detectedFormat = 'dev-article';
        } else if (content.toLowerCase().includes('step') || content.toLowerCase().includes('tutorial')) {
            detectedFormat = 'tutorial';
        } else if (content.includes('please') || content.includes('can you') || content.includes('prompt')) {
            detectedFormat = 'chatgpt-prompt';
        }

        // Prepare payload that matches worker expectations
        const payload = {
            text: content,
            prompt: 'Format this text for better readability and structure',
            format: detectedFormat,
            sessionId: editorState.sessionId || 'anonymous'
        };

        // Only add token if JWT is enabled and we have one
        if (CONFIG.ENABLE_JWT && editorState.token) {
            payload.token = editorState.token;
        }

        // Call AI worker
        const response = await fetch(`${CONFIG.AI_WORKER_URL}/process`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // Note: Authorization header removed as worker expects token in body
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Processing failed');
        }

        const result = await response.json();

        if (result.success) {
            editor.value = result.processedText;
            editor.dispatchEvent(new Event('input'));

            // Show success message
            showNotification('✨ Auto-formatting completed!', 'success');
        } else {
            throw new Error(result.error || 'Processing failed');
        }

    } catch (error) {
        console.error('Auto-format error:', error);

        if (error.message.includes('Rate limit')) {
            showNotification('⏱️ Rate limit exceeded. Please wait before trying again.', 'warning');
        } else if (error.message.includes('Authentication')) {
            showNotification('🔐 Authentication failed. Please refresh the page.', 'error');
        } else {
            showNotification(`❌ Error: ${error.message}`, 'error');

            // Fallback to local formatting
            autoFormatLocal();
        }
    } finally {
        // Restore button state
        if (button) {
            button.textContent = button.dataset.originalText || '🪄 Auto Format';
            button.disabled = false;
            delete button.dataset.originalText;
        }
    }
}

// Local fallback formatting
function autoFormatLocal() {
    let content = editor.value;

    // Smart auto-formatting based on content analysis
    if (content.includes('function') || content.includes('const') || content.includes('class')) {
        content = formatAsCode(content);
    } else if (content.includes('step') || content.includes('tutorial')) {
        content = formatAsTutorial(content);
    } else {
        content = formatAsArticle(content);
    }

    editor.value = content;
    editor.dispatchEvent(new Event('input'));
    showNotification('📝 Local formatting applied', 'info');
}

// Process specific format with AI with enhanced error handling and retry logic
async function processWithAI(element, format, customPrompt = null) {
    // Handle both old and new calling conventions
    if (typeof element === 'string') {
        format = element;
        element = null;
    }

    const content = editor?.value?.trim() || '';

    // Input validation with user-friendly messages
    if (!content) {
        showNotification('📝 Please enter some text to process first', 'warning');
        return;
    }

    if (content.length > CONFIG.MAX_TEXT_LENGTH) {
        showNotification(`⚠️ Text is too long. Please limit to ${CONFIG.MAX_TEXT_LENGTH} characters. Current: ${content.length}`, 'warning');
        return;
    }

    // Prevent concurrent processing
    if (editorState.isProcessing) {
        showNotification('⏳ Please wait for current processing to complete', 'info');
        return;
    }

    editorState.isProcessing = true;
    const startTime = Date.now();

    // Update UI to show processing state
    const button = element || document.querySelector(`[data-format="${format}"]`);
    let originalButtonContent = '';

    if (button) {
        originalButtonContent = button.innerHTML;
        button.innerHTML = '🔄 Processing...';
        button.disabled = true;
        button.style.opacity = '0.6';
    }

    try {
        // Ensure we have a valid token
        const tokenValid = await ensureValidToken();
        if (!tokenValid && CONFIG.ENABLE_JWT) {
            throw new Error('Authentication failed. Please refresh the page and try again.');
        }

        const prompts = {
            'dev-article': 'Transform this into a well-structured development article with clear sections, proper headings, and code examples where appropriate.',
            'tutorial': 'Format this as a step-by-step tutorial with numbered sections and clear instructions.',
            'chatgpt-prompt': 'Reformat this as a clear, structured prompt for ChatGPT with specific requirements and context.',
            'readme': 'Format this as a professional README document with sections for installation, usage, and examples.',
            'Med-Article': 'Transform this into a well-structured Medium-style article with engaging headings, proper formatting, and clear sections.',
            // New platform-specific formats
            'peerlist-article': 'Transform this into a professional Peerlist article that showcases expertise and builds credibility. Focus on insights, career lessons, and actionable advice. Use engaging headlines and professional tone suitable for networking.',
            'twitter-post': 'Transform this into an engaging Twitter/X thread. Break into concise, punchy tweets (max 280 chars each). Use hooks, numbered points, and encourage engagement. Include relevant hashtags and maintain conversational tone.',
            'linkedin-post': 'Transform this into a professional LinkedIn post that drives engagement. Use storytelling elements, professional insights, and calls-to-action. Include relevant hashtags and maintain thought leadership tone.',
            'dailydev-article': 'Transform this into a Daily.dev community article. Focus on practical development insights, code examples, and developer-focused content. Use clear sections, code blocks, and actionable takeaways for the developer community.'
        };

        const prompt = customPrompt || prompts[format] || 'Improve the formatting and structure of this text.';

        // Prepare payload that matches worker expectations
        const payload = {
            text: content,
            prompt: prompt,
            format: format,
            sessionId: editorState.sessionId || 'anonymous',
            timestamp: Date.now()
        };

        // Only add token if JWT is enabled and we have one
        if (CONFIG.ENABLE_JWT && editorState.token) {
            payload.token = editorState.token;
        }

        // Retry logic with exponential backoff
        let lastError;
        for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
            try {
                showNotification(`🔄 Processing attempt ${attempt}/${CONFIG.RETRY_ATTEMPTS}...`, 'info');

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

                const response = await fetch(`${CONFIG.AI_WORKER_URL}/process`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorMessage;
                    } catch (e) {
                        // Use default error message if JSON parsing fails
                    }
                    throw new Error(errorMessage);
                }

                const result = await response.json();

                if (result.success && result.processedText) {
                    const processingTime = Date.now() - startTime;

                    // Get current settings
                    const enableIcons = document.getElementById('enableIcons')?.checked ?? true;
                    const enablePrefilled = document.getElementById('enablePrefilled')?.checked ?? true;

                    const settings = {
                        enableIcons,
                        enablePrefilled
                    };

                    // Apply content enrichment based on platform and settings
                    const enrichedText = enrichContent(result.processedText, format, settings);

                    editor.value = enrichedText;
                    editor.dispatchEvent(new Event('input'));

                    showNotification(`✨ ${format} formatting completed! (${processingTime}ms)`, 'success');

                    // Log successful processing
                    logError('AI processing completed', null, {
                        format,
                        processingTime,
                        textLength: content.length,
                        attempt
                    });

                    return; // Success - exit retry loop

                } else {
                    throw new Error(result.error || 'Processing failed - no processed text returned');
                }

            } catch (error) {
                lastError = error;

                if (error.name === 'AbortError') {
                    throw new Error(`Processing timeout after ${CONFIG.TIMEOUT_MS / 1000} seconds`);
                }

                if (attempt === CONFIG.RETRY_ATTEMPTS) {
                    throw error; // Final attempt failed
                }

                // Wait before retry (exponential backoff)
                const waitTime = Math.pow(2, attempt) * 1000;
                showNotification(`⏳ Retrying in ${waitTime / 1000} seconds...`, 'info');
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }

        // If we get here, all retries failed
        throw lastError || new Error('All retry attempts failed');

    } catch (error) {
        const processingTime = Date.now() - startTime;
        logError('AI Processing failed', error, {
            format,
            processingTime,
            textLength: content.length,
            retryAttempts: CONFIG.RETRY_ATTEMPTS
        });

        // Provide helpful error messages based on error type
        let userMessage = '❌ Processing failed: ';
        if (error.message.includes('fetch')) {
            userMessage += 'Network connection issue. Please check your internet connection.';
        } else if (error.message.includes('timeout')) {
            userMessage += 'Request timed out. The service may be busy, please try again.';
        } else if (error.message.includes('401') || error.message.includes('403')) {
            userMessage += 'Authentication error. Please refresh the page.';
        } else if (error.message.includes('429')) {
            userMessage += 'Rate limit exceeded. Please wait a moment before trying again.';
        } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
            userMessage += 'Server error. Please try again later.';
        } else {
            userMessage += error.message || 'Unknown error occurred';
        }

        showNotification(userMessage, 'error');

        // Try local fallback processing
        if (CONFIG.ENABLE_LOCAL_FALLBACK !== false) {
            showNotification('🔄 Trying local fallback formatting...', 'info');
            try {
                const localResult = autoFormatLocal();
                if (localResult && localResult !== content) {
                    editor.value = localResult;
                    editor.dispatchEvent(new Event('input'));
                    showNotification('✅ Local fallback formatting applied', 'success');
                }
            } catch (fallbackError) {
                logError('Local fallback failed', fallbackError);
            }
        }

    } finally {
        // Reset processing state and UI
        editorState.isProcessing = false;

        if (button) {
            button.innerHTML = originalButtonContent;
            button.disabled = false;
            button.style.opacity = '1';
        }
    }
}

function formatAsCode(content) {
    // Wrap code-like content in code blocks
    const lines = content.split('\n');
    const formatted = [];
    let inCodeBlock = false;

    for (const line of lines) {
        if (line.match(/^(function|const|let|var|class|import|export)/)) {
            if (!inCodeBlock) {
                formatted.push('```javascript');
                inCodeBlock = true;
            }
            formatted.push(line);
        } else if (inCodeBlock && line.trim() === '') {
            formatted.push(line);
        } else if (inCodeBlock) {
            formatted.push('```');
            formatted.push('');
            formatted.push(line);
            inCodeBlock = false;
        } else {
            formatted.push(line);
        }
    }

    if (inCodeBlock) {
        formatted.push('```');
    }

    return formatted.join('\n');
}

function formatAsTutorial(content) {
    const lines = content.split('\n');
    const formatted = [];
    let stepCounter = 1;

    for (const line of lines) {
        if (line.toLowerCase().includes('step') && !line.startsWith('#')) {
            formatted.push(`## Step ${stepCounter}: ${line.replace(/step\s*\d*:?\s*/i, '')}`);
            stepCounter++;
        } else {
            formatted.push(line);
        }
    }

    return formatted.join('\n');
}

function formatAsArticle(content) {
    const lines = content.split('\n');
    const formatted = [];

    for (const line of lines) {
        // Auto-detect headings
        if (line.length > 0 && !line.startsWith('#') && !line.startsWith('-') && !line.startsWith('*')) {
            if (line.length < 60 && !line.includes('.') && !line.includes(',')) {
                // Likely a heading
                formatted.push(`## ${line}`);
            } else {
                formatted.push(line);
            }
        } else {
            formatted.push(line);
        }
    }

    return formatted.join('\n');
}

function optimizeForDevTo() {
    let content = editor.value;

    // Add dev.to specific formatting
    if (!content.includes('---')) {
        const frontMatter = `---
title: "Your Title Here"
published: false
description: "Brief description"
tags: [javascript, tutorial, webdev]
canonical_url: 
cover_image: 
---

`;
        content = frontMatter + content;
    }

    // Optimize code blocks for dev.to
    content = content.replace(/```(\w+)/g, '```$1');

    editor.value = content;
    editor.dispatchEvent(new Event('input'));
}

function optimizeForChatGPT() {
    const content = editor.value;

    // Format for clear ChatGPT communication
    const lines = content.split('\n');
    const formatted = [];

    for (const line of lines) {
        if (line.startsWith('Q:') || line.startsWith('Question:')) {
            formatted.push(`**${line}**`);
        } else if (line.startsWith('A:') || line.startsWith('Answer:')) {
            formatted.push(`**${line}**`);
        } else if (line.includes('please') || line.includes('can you')) {
            formatted.push(`> ${line}`);
        } else {
            formatted.push(line);
        }
    }

    editor.value = formatted.join('\n');
    editor.dispatchEvent(new Event('input'));
}

function applyFormat(element, format) {
    // Remove active class from all buttons
    document.querySelectorAll('.format-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');

    editorState.currentFormat = format;

    // Check if we should use AI processing or templates
    const content = editor.value.trim();
    if (content && content.length <= 1000) {
        // Use AI processing for existing content
        processWithAI(format);
    } else {
        // Use templates for empty content or very long content
        useTemplate(format);
    }
}

function useTemplate(format) {
    const templates = {
        'dev-article': `# Your Article Title

Brief introduction to your topic...

## Introduction

Explain what you'll cover in this article.

## Main Content

### Subsection 1

Your content here...

\`\`\`javascript
// Code example
const example = "Hello World";
console.log(example);
\`\`\`

### Subsection 2

More content...

## Conclusion

Wrap up your thoughts...

---

Thanks for reading! Follow me for more content.`,

        'tutorial': `# Step-by-Step Tutorial: [Topic]

## Prerequisites

- Requirement 1
- Requirement 2
- Requirement 3

## Step 1: Setup

First, let's set up our environment...

\`\`\`bash
npm install package-name
\`\`\`

## Step 2: Configuration

Next, we'll configure...

## Step 3: Implementation

Now let's implement the solution...

## Step 4: Testing

Finally, let's test our implementation...

## Conclusion

You've successfully learned how to...`,

        'chatgpt-prompt': `**Context:** Provide clear context about what you need

**Task:** Clearly state what you want ChatGPT to do

**Requirements:**
- Specific requirement 1
- Specific requirement 2
- Output format needed

**Example:** If helpful, provide an example of what you're looking for

**Additional Notes:** Any extra context or constraints`,

        'readme': `# Project Name

Brief description of what this project does.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

\`\`\`bash
npm install project-name
\`\`\`

## Usage

\`\`\`javascript
const project = require('project-name');
project.doSomething();
\`\`\`

## API Reference

### Method 1

Description of method...

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.`,

        // New platform templates
        'peerlist-article': `# Professional Insight: [Your Topic]

## The Challenge

Describe the professional challenge or situation you encountered...

## Key Insights

### Insight 1
Your first key learning or insight...

### Insight 2
Another important realization...

### Insight 3
A third valuable takeaway...

## Practical Application

How can others apply these insights in their own work?

- Actionable tip 1
- Actionable tip 2
- Actionable tip 3

## Key Takeaway

**The main lesson:** Summarize the core message that advances your career or professional growth.

---

What's your experience with this? Share your thoughts below!`,

        'twitter-post': `🧵 Thread: [Your Topic]

1/7 Hook: Start with an attention-grabbing statement or question...

2/7 Problem: Identify the key issue or challenge...

3/7 Solution: Present your main insight or approach...

4/7 Example: Give a concrete example or case study...

5/7 Benefits: Highlight the positive outcomes...

6/7 Action: Tell people what they should do next...

7/7 Conclusion: Wrap up with a key takeaway and encourage engagement.

What do you think? Drop a reply with your experience! 🚀

#YourHashtag #Relevant #Tags`,

        'linkedin-post': `🚀 [Attention-grabbing headline about your topic]

I recently discovered something fascinating about [topic]...

Here's what happened:
→ Context about the situation
→ The challenge you faced
→ What you learned

The key insight? 
[Your main takeaway or lesson learned]

This changed my perspective because:
• Point 1 about impact
• Point 2 about application
• Point 3 about results

💡 Key takeaway: [One sentence summary]

---

What's your experience with this? I'd love to hear your thoughts in the comments!

♻️ Repost if you found this valuable
👥 Follow me for more insights on [your area of expertise]

#Leadership #Professional #YourIndustry #Networking`,

        'dailydev-article': `# [Your Development Topic] 🚀

*A practical guide for developers*

## TL;DR
- Quick summary point 1
- Quick summary point 2  
- Quick summary point 3

## The Problem

Describe the development challenge you're addressing...

## The Solution

\`\`\`javascript
// Your code example here
const solution = {
    approach: 'clean and readable',
    benefits: ['performance', 'maintainability', 'scalability']
};
\`\`\`

### Step-by-step implementation:

1. **First step**: Explain what to do...
2. **Second step**: Next action...
3. **Third step**: Final implementation...

## Code Example

\`\`\`javascript
// Complete working example
function practicalExample() {
    // Your implementation
    return 'working code';
}
\`\`\`

## Best Practices

- ✅ Do this for better results
- ✅ Remember this important point
- ❌ Avoid this common mistake

## Conclusion

Key takeaways:
- Main learning point 1
- Main learning point 2
- Main learning point 3

Happy coding! 🚀

What's your experience with this approach? Let me know in the comments!

---
*Follow for more dev tips and tricks*`
    };

    if (templates[format]) {
        editor.value = templates[format];
        editor.dispatchEvent(new Event('input'));
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
    `;

    // Set background color based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);

    // Click to dismiss
    notification.addEventListener('click', () => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    });
}

function toggleExportMenu() {
    const dropdown = document.getElementById('exportDropdown');
    dropdown.classList.toggle('show');
}

function exportMarkdown() {
    const content = editor.value;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    a.click();
    URL.revokeObjectURL(url);
    toggleExportMenu();
}

function exportHTML() {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Markdown Document</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
        blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 20px; color: #666; }
    </style>
</head>
<body>
${preview.innerHTML}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.html';
    a.click();
    URL.revokeObjectURL(url);
    toggleExportMenu();
}

// Export and clipboard functions are defined below in the improved section

// Close export menu when clicking outside
document.addEventListener('click', function(event) {
    try {
        const exportMenu = document.querySelector('.export-menu');
        const exportDropdown = document.getElementById('exportDropdown');

        if (exportMenu && exportDropdown && !exportMenu.contains(event.target)) {
            exportDropdown.classList.remove('show');
        }
    } catch (error) {
        // Silently handle errors for non-critical functionality
        logError('Export menu click handler error', error);
    }
});

// Clear editor and reset to default content
function clearEditor() {
    try {
        if (!editor) {
            throw new Error('Editor element not found');
        }

        if (confirm('Are you sure you want to clear all content? This action cannot be undone.')) {
            const defaultContent = getDefaultContent();
            editor.value = defaultContent;
            editor.dispatchEvent(new Event('input'));
            showNotification('🗑️ Editor cleared and reset to default', 'info');
        }
    } catch (error) {
        logError('Clear editor failed', error);
        showNotification('❌ Failed to clear editor', 'error');
    }
}

// Settings functionality for formatting options
function clearPrefilled() {
    try {
        if (!editor) {
            throw new Error('Editor element not found');
        }

        // Check if content looks like default/prefilled content
        const currentContent = editor.value.trim();
        const defaultContent = getDefaultContent().trim();

        if (currentContent === defaultContent || currentContent.includes('Welcome to MarkdownGPT')) {
            editor.value = '';
            editor.dispatchEvent(new Event('input'));
            showNotification('📝 Prefilled text cleared', 'info');
        } else {
            // Ask for confirmation if there's user content
            if (confirm('This will clear all content. Are you sure?')) {
                editor.value = '';
                editor.dispatchEvent(new Event('input'));
                showNotification('📝 Content cleared', 'info');
            }
        }
    } catch (error) {
        logError('Clear prefilled failed', error);
        showNotification('❌ Failed to clear prefilled text', 'error');
    }
}

// Enhanced content enrichment based on settings and platform
function enrichContent(content, format, settings = {}) {
    try {
        let enriched = content;

        // Apply settings-based modifications
        if (!settings.enableIcons) {
            // Remove icons and emojis
            enriched = enriched.replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
            enriched = enriched.replace(/—|–/g, '-'); // Replace em dashes
        }

        // Platform-specific enrichment patterns
        switch (format) {
        case 'twitter-post':
            enriched = enrichTwitterContent(enriched, settings);
            break;
        case 'linkedin-post':
            enriched = enrichLinkedInContent(enriched, settings);
            break;
        case 'peerlist-article':
            enriched = enrichPeerlistContent(enriched, settings);
            break;
        case 'dailydev-article':
            enriched = enrichDailyDevContent(enriched, settings);
            break;
        default:
            enriched = enrichGenericContent(enriched, settings);
        }

        return enriched;
    } catch (error) {
        logError('Content enrichment failed', error);
        return content; // Return original content if enrichment fails
    }
}

// Platform-specific enrichment functions
function enrichTwitterContent(content, settings) {
    // Twitter-specific optimizations
    const lines = content.split('\n').filter(line => line.trim());
    const tweets = [];
    let currentTweet = '';

    for (const line of lines) {
        if ((currentTweet + '\n' + line).length <= 280) {
            currentTweet += (currentTweet ? '\n' : '') + line;
        } else {
            if (currentTweet) {
                tweets.push(currentTweet);
            }
            currentTweet = line.length <= 280 ? line : line.substring(0, 277) + '...';
        }
    }
    if (currentTweet) {
        tweets.push(currentTweet);
    }

    return tweets.map((tweet, index) =>
        tweets.length > 1 ? `${index + 1}/${tweets.length}\n\n${tweet}` : tweet
    ).join('\n\n---\n\n');
}

function enrichLinkedInContent(content, settings) {
    // LinkedIn-specific optimizations
    let enriched = content;

    // Add engagement hooks
    if (!enriched.includes('What do you think?') && !enriched.includes('Share your thoughts')) {
        enriched += '\n\nWhat are your thoughts on this? Share your experience in the comments below!';
    }

    // Ensure professional tone and structure
    enriched = enriched.replace(/\n{3,}/g, '\n\n'); // Clean up excessive line breaks

    return enriched;
}

function enrichPeerlistContent(content, settings) {
    // Peerlist-specific optimizations for professional networking
    let enriched = content;

    // Ensure professional insights format
    if (!enriched.includes('Key takeaway') && !enriched.includes('Lesson learned')) {
        const lines = enriched.split('\n');
        if (lines.length > 3) {
            lines.splice(-1, 0, '\n**Key takeaway:** Focus on practical insights that advance your career.');
        }
        enriched = lines.join('\n');
    }

    return enriched;
}

function enrichDailyDevContent(content, settings) {
    // Daily.dev-specific optimizations for developer community
    let enriched = content;

    // Ensure developer-focused structure
    if (enriched.includes('function') || enriched.includes('const') || enriched.includes('code')) {
        // Already has code content, ensure proper formatting
        enriched = enriched.replace(/```\s*\n/g, '```javascript\n');
    }

    // Add developer community engagement
    if (!enriched.includes('Happy coding') && !enriched.includes('developer')) {
        enriched += '\n\nHappy coding! 🚀\n\nWhat\'s your experience with this? Let me know in the comments!';
    }

    return enriched;
}

function enrichGenericContent(content, settings) {
    // Generic content improvements
    let enriched = content;

    // Improve readability
    enriched = enriched.replace(/([.!?])\s*([A-Z])/g, '$1 $2'); // Ensure proper spacing
    enriched = enriched.replace(/\n{3,}/g, '\n\n'); // Clean up excessive line breaks

    return enriched;
}

// Copy editor content to clipboard
function copyToClipboard() {
    try {
        if (!editor) {
            throw new Error('Editor element not found');
        }

        const content = editor.value;
        if (!content.trim()) {
            showNotification('📋 Nothing to copy - editor is empty', 'warning');
            return;
        }

        // Use modern Clipboard API if available
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(content).then(() => {
                showNotification('📋 Content copied to clipboard!', 'success');
            }).catch(error => {
                logError('Clipboard API failed', error);
                fallbackCopyToClipboard(content);
            });
        } else {
            fallbackCopyToClipboard(content);
        }
    } catch (error) {
        logError('Copy to clipboard failed', error);
        showNotification('❌ Failed to copy to clipboard', 'error');
    }
}

// Fallback copy method for older browsers or insecure contexts
function fallbackCopyToClipboard(text) {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
            showNotification('📋 Content copied to clipboard!', 'success');
        } else {
            throw new Error('Copy command failed');
        }
    } catch (error) {
        logError('Fallback copy failed', error);
        showNotification('❌ Failed to copy to clipboard. Please select and copy manually.', 'error');
    }
}

function getDefaultContent() {
    // Check if prefilled text is enabled
    const enablePrefilled = document.getElementById('enablePrefilled')?.checked ?? true;

    if (!enablePrefilled) {
        return ''; // Return empty string if prefilled text is disabled
    }

    return `# Welcome to MarkdownGPT! 🚀

Transform your raw text with AI-powered formatting and processing for professional documents.

## ✨ Features

- **🤖 AI Processing**: Smart formatting for articles, tutorials, READMEs, and more
- **📝 Live Preview**: See your formatted content in real-time  
- **🎨 Syntax Highlighting**: Beautiful code blocks with proper highlighting
- **📊 Export Options**: Save as Markdown, HTML, or copy to clipboard
- **🔒 Secure**: Optional JWT authentication with session management
- **📱 Responsive**: Works perfectly on desktop and mobile

## 🚀 Quick Start

1. **Enter Text**: Type or paste your raw text (max ${CONFIG.MAX_TEXT_LENGTH} characters)
2. **Choose Format**: Select from AI processing options below
3. **Process**: Click a format button to transform your text
4. **Export**: Use toolbar buttons to save or copy your content

## 💡 Tips

- Try the "Dev.to Article" format for technical blog posts
- Use "Tutorial" format for step-by-step guides  
- "README" format creates professional documentation
- "ChatGPT Prompt" formats text for AI interactions
- Try new platform formats: Peerlist, Twitter, LinkedIn, Daily.dev

**Ready to transform your text? Replace this content and click a format button below!**`;
}
