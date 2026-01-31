/**
 * AI Service - Provider Abstraction Layer
 * Supports OpenAI (GPT-4) and Anthropic (Claude) APIs
 */

const AIService = {
  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════

  config: {
    provider: 'openai', // 'openai' | 'anthropic'
    apiKey: '',
    model: 'gpt-4o', // Default model
    maxTokens: 4096,
    temperature: 0.7,
    systemPrompt: `You are a helpful AI assistant integrated into a web browser. You can help users with:
- Understanding and summarizing web page content
- Answering questions about what they're viewing
- General knowledge and assistance
- Writing, coding, and analysis tasks

When the user is viewing a web page, you'll receive its content as context. Be concise but thorough in your responses.`
  },

  // Available models per provider
  models: {
    openai: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and efficient' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'High performance' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast responses' }
    ],
    anthropic: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Best for most tasks' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fast and efficient' }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize the AI service with configuration
   * @param {Object} options - Configuration options
   */
  init(options = {}) {
    if (options.provider) this.config.provider = options.provider;
    if (options.apiKey) this.config.apiKey = options.apiKey;
    if (options.model) this.config.model = options.model;
    if (options.systemPrompt) this.config.systemPrompt = options.systemPrompt;

    // Try to load API key from localStorage
    const savedKey = localStorage.getItem(`ai_api_key_${this.config.provider}`);
    if (savedKey && !this.config.apiKey) {
      this.config.apiKey = savedKey;
    }

    const savedProvider = localStorage.getItem('ai_provider');
    if (savedProvider) {
      this.config.provider = savedProvider;
    }

    const savedModel = localStorage.getItem('ai_model');
    if (savedModel) {
      this.config.model = savedModel;
    }

    console.log('[AI] Service initialized:', this.config.provider, this.config.model);
    return this;
  },

  /**
   * Set the API key for the current provider
   * @param {string} apiKey
   */
  setApiKey(apiKey) {
    this.config.apiKey = apiKey;
    localStorage.setItem(`ai_api_key_${this.config.provider}`, apiKey);
    console.log('[AI] API key set for', this.config.provider);
  },

  /**
   * Set the provider (openai or anthropic)
   * @param {string} provider
   */
  setProvider(provider) {
    if (!['openai', 'anthropic'].includes(provider)) {
      console.error('[AI] Invalid provider:', provider);
      return;
    }
    this.config.provider = provider;
    localStorage.setItem('ai_provider', provider);
    
    // Load saved API key for this provider
    const savedKey = localStorage.getItem(`ai_api_key_${provider}`);
    if (savedKey) {
      this.config.apiKey = savedKey;
    }

    // Set default model for provider
    const defaultModel = this.models[provider][0].id;
    this.config.model = defaultModel;
    localStorage.setItem('ai_model', defaultModel);

    console.log('[AI] Provider set to', provider, 'model:', defaultModel);
  },

  /**
   * Set the model
   * @param {string} model
   */
  setModel(model) {
    this.config.model = model;
    localStorage.setItem('ai_model', model);
    console.log('[AI] Model set to', model);
  },

  /**
   * Check if the service is configured with an API key
   * @returns {boolean}
   */
  isConfigured() {
    return !!this.config.apiKey;
  },

  /**
   * Get available models for the current provider
   * @returns {Array}
   */
  getAvailableModels() {
    return this.models[this.config.provider] || [];
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MESSAGE FORMATTING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Build the messages array for the API call
   * @param {Array} conversationMessages - Messages from the conversation
   * @param {Object} pageContext - Current page context
   * @param {Object} tabContext - All open tabs context
   * @returns {Array} Formatted messages
   */
  buildMessages(conversationMessages, pageContext, tabContext) {
    const messages = [];

    // System message with context
    let systemContent = this.config.systemPrompt;

    // Add page context if available
    if (pageContext && !pageContext.restricted) {
      systemContent += `\n\n## Current Page Context
Title: ${pageContext.title || 'Unknown'}
URL: ${pageContext.url || 'Unknown'}

Page Content:
${pageContext.content ? pageContext.content.slice(0, 8000) : 'No content available'}`;
    } else if (pageContext?.restricted) {
      systemContent += `\n\n## Current Page Context
The user is viewing a page that cannot be read due to security restrictions.
URL: ${pageContext.url || 'Unknown'}`;
    }

    // Add tab context
    if (tabContext && tabContext.tabs && tabContext.tabs.length > 0) {
      systemContent += `\n\n## Open Tabs
The user has ${tabContext.tabs.length} tab(s) open:
${tabContext.tabs.map((t, i) => `${i + 1}. ${t.title}${t.url ? ` (${t.url})` : ''}`).join('\n')}`;
    }

    messages.push({
      role: 'system',
      content: systemContent
    });

    // Add conversation history
    conversationMessages.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    return messages;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // API CALLS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Send a chat completion request (non-streaming)
   * @param {Array} messages - Formatted messages
   * @returns {Promise<string>} The assistant's response
   */
  async chat(messages) {
    if (!this.isConfigured()) {
      throw new Error('AI service not configured. Please set an API key.');
    }

    if (this.config.provider === 'openai') {
      return this.chatOpenAI(messages);
    } else if (this.config.provider === 'anthropic') {
      return this.chatAnthropic(messages);
    }

    throw new Error(`Unknown provider: ${this.config.provider}`);
  },

  /**
   * Send a streaming chat completion request
   * @param {Array} messages - Formatted messages
   * @param {Function} onChunk - Callback for each chunk of text
   * @param {Function} onComplete - Callback when complete
   * @param {Function} onError - Callback on error
   * @returns {Promise<void>}
   */
  async chatStream(messages, onChunk, onComplete, onError) {
    if (!this.isConfigured()) {
      onError?.(new Error('AI service not configured. Please set an API key.'));
      return;
    }

    try {
      if (this.config.provider === 'openai') {
        await this.chatStreamOpenAI(messages, onChunk, onComplete);
      } else if (this.config.provider === 'anthropic') {
        await this.chatStreamAnthropic(messages, onChunk, onComplete);
      } else {
        throw new Error(`Unknown provider: ${this.config.provider}`);
      }
    } catch (error) {
      onError?.(error);
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OPENAI IMPLEMENTATION
  // ═══════════════════════════════════════════════════════════════════════════

  async chatOpenAI(messages) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  },

  async chatStreamOpenAI(messages, onChunk, onComplete) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              onChunk?.(content, fullContent);
            }
          } catch (e) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }

    onComplete?.(fullContent);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ANTHROPIC IMPLEMENTATION
  // ═══════════════════════════════════════════════════════════════════════════

  async chatAnthropic(messages) {
    // Extract system message and convert to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: systemMessage?.content || '',
        messages: chatMessages
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  },

  async chatStreamAnthropic(messages, onChunk, onComplete) {
    // Extract system message and convert to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: systemMessage?.content || '',
        messages: chatMessages,
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              const content = parsed.delta.text;
              fullContent += content;
              onChunk?.(content, fullContent);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

    onComplete?.(fullContent);
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIService;
}
