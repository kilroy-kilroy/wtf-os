import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type ModelProvider = 'anthropic' | 'openai';
export type ModelId =
  | 'claude-sonnet-4-6'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-5-sonnet-20240620'
  | 'claude-3-opus-20240229'
  | 'gpt-4o'
  | 'gpt-4o-mini';

export interface ModelConfig {
  provider: ModelProvider;
  model: ModelId;
  maxTokens: number;
  temperature: number;
}

// Default model configurations for different tools
const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'call-lab-lite': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 4096,
    temperature: 0.3,
  },
  'call-lab-full': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 8192,
    temperature: 0.3,
  },
  'call-lab-pro': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 16384,
    temperature: 0.3,
  },
  'discovery-lab-lite': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 4096,
    // Low temperature: this is a factual briefing, not creative writing.
    // Higher temps increase the model's willingness to fill gaps with invention.
    temperature: 0.1,
  },
  'discovery-lab-pro': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 8192,
    // Low temperature: this is a factual briefing, not creative writing.
    // Higher temps increase the model's willingness to fill gaps with invention.
    temperature: 0.1,
  },
  // Content Engine tools
  'content-engine-calibrate': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 4096,
    temperature: 0.4,
  },
  'content-engine-categorize': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 2048,
    temperature: 0.2,
  },
  'content-engine-repurpose': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 4096,
    temperature: 0.6,
  },
  'content-engine-moment-detection': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 8192,
    temperature: 0.3,
  },
  'one-shot': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 8192,
    temperature: 0.4,
  },
  'discovery-agent': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 8192,
    temperature: 0.4,
  },
  'discovery-agent-summary': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    maxTokens: 1024,
    temperature: 0.3,
  },
  'biz-dev-assessment-v1': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 8192,
    temperature: 0.4,
  },
  'contract-sow': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 4096,
    temperature: 0.3,
  },
  // Client portal: office-hours / 1:1 session synopsis + teaching (JSON)
  'session-content': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 2000,
    temperature: 0.4,
  },
  // Admin: assessment marketing-content generation
  'assessment-content': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 4096,
    temperature: 0.4,
  },
  // Coaching report generation
  'coaching-report': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 4096,
    temperature: 0.4,
  },
  // Assessment diagnosis revelations (run in parallel; degrade to null on error/timeout)
  'assessment-diagnosis': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 1500,
    temperature: 0.3,
  },
  // Unified person timeline: cached "where we are / next step" contact summary
  'contact-summary': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 600,
    // Low temperature: this restates known activity, not creative writing.
    temperature: 0.2,
  },
};

function assertModelConfig(toolName: string, config: ModelConfig | undefined): asserts config is ModelConfig {
  if (!config?.provider || !config.model) {
    throw new Error(
      `[runModel] No MODEL_CONFIGS entry for tool '${toolName}'. Add one in packages/utils/ai.ts.`,
    );
  }
}

export interface ModelResponse {
  content: string;
  usage: {
    input: number;
    output: number;
  };
}

/**
 * Strip lone (unpaired) UTF-16 surrogates so the string can be JSON-encoded
 * into a request body the model APIs will accept.
 *
 * Scraped content (emoji-heavy LinkedIn posts, raw BrightData output) can carry
 * unpaired surrogates — directly, or because a fixed-length `substring`/`slice`
 * bisected an emoji's surrogate pair. Such strings are legal in memory but
 * illegal in JSON (RFC 8259), so Anthropic/OpenAI reject the request with
 * "The request body is not valid JSON: no low surrogate in string". Sanitizing
 * here, at the single API boundary, guards every caller against every source.
 */
export function ensureWellFormed(input: string): string {
  // ES2024 String.prototype.toWellFormed replaces lone surrogates with U+FFFD.
  if (typeof (input as { toWellFormed?: () => string }).toWellFormed === 'function') {
    return (input as unknown as { toWellFormed: () => string }).toWellFormed();
  }
  // Fallback for older runtimes: drop any unpaired high or low surrogate.
  return input.replace(
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
    '�'
  );
}

/**
 * Run an AI model with the given prompts.
 * Abstracts away provider-specific details.
 */
export async function runModel(
  toolName: string,
  systemPrompt: string,
  userPrompt: string,
  options?: Partial<ModelConfig> & { timeoutMs?: number }
): Promise<ModelResponse> {
  const { timeoutMs, ...configOverrides } = options ?? {};
  const baseConfig = MODEL_CONFIGS[toolName];
  const config = { ...baseConfig, ...configOverrides } as ModelConfig | undefined;
  assertModelConfig(toolName, config);

  // Guard against malformed Unicode in scraped prompt content reaching the API.
  const safeSystemPrompt = ensureWellFormed(systemPrompt);
  const safeUserPrompt = ensureWellFormed(userPrompt);

  try {
    return config.provider === 'anthropic'
      ? await runAnthropic(config, safeSystemPrompt, safeUserPrompt, timeoutMs)
      : await runOpenAI(config, safeSystemPrompt, safeUserPrompt, timeoutMs);
  } catch (error) {
    // Stamp which provider failed so describeModelError can name it without an
    // instanceof check against a possibly-duplicated SDK copy. Annotate in place
    // rather than wrapping: retryWithBackoff sniffs error.message, and callers
    // already catch the SDK's own error type.
    if (error && typeof error === 'object' && !('provider' in error)) {
      Object.defineProperty(error, 'provider', {
        value: config.provider,
        enumerable: false,
        configurable: true,
      });
    }
    throw error;
  }
}

/**
 * Run Anthropic Claude model
 */
async function runAnthropic(
  config: ModelConfig,
  systemPrompt: string,
  userPrompt: string,
  timeoutMs?: number
): Promise<ModelResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  const anthropic = new Anthropic({
    apiKey,
  });

  // A caller-supplied deadline (e.g. parallel fan-out that degrades to null)
  // implies fail-fast: cap the request and skip the SDK's default retries.
  const requestOptions = timeoutMs ? { timeout: timeoutMs, maxRetries: 0 } : undefined;

  const message = await anthropic.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  }, requestOptions);

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic');
  }

  return {
    content: content.text,
    usage: {
      input: message.usage.input_tokens,
      output: message.usage.output_tokens,
    },
  };
}

/**
 * Run OpenAI GPT model
 */
async function runOpenAI(
  config: ModelConfig,
  systemPrompt: string,
  userPrompt: string,
  timeoutMs?: number
): Promise<ModelResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const openai = new OpenAI({
    apiKey,
  });

  // A caller-supplied deadline implies fail-fast: cap the request, skip retries.
  const requestOptions = timeoutMs ? { timeout: timeoutMs, maxRetries: 0 } : undefined;

  const completion = await openai.chat.completions.create({
    model: config.model,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  }, requestOptions);

  const choice = completion.choices[0];
  if (!choice.message.content) {
    throw new Error('No content in OpenAI response');
  }

  return {
    content: choice.message.content,
    usage: {
      input: completion.usage?.prompt_tokens || 0,
      output: completion.usage?.completion_tokens || 0,
    },
  };
}

/**
 * Turn a provider SDK error into one sentence an operator can act on.
 *
 * Anthropic and OpenAI report account-level problems — exhausted credits, a
 * revoked key, a rate limit — as ordinary failed requests carrying a precise
 * explanation. Routes that let those bubble into a generic "Internal server
 * error" discard that explanation, so whoever clicked the button has to go read
 * deploy logs to discover the account just needs topping up.
 *
 * Deliberately duck-typed rather than `instanceof Anthropic.APIError`: this
 * monorepo resolves two different copies of each SDK (root vs apps/web), so an
 * identity check silently fails whenever the throwing copy isn't the checking
 * copy. Shape is stable across both versions; module identity is not.
 *
 * Returns null when the error isn't a recognizable provider error, letting
 * callers fall back to their own generic handling.
 */
export function describeModelError(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;

  const status = (error as { status?: unknown }).status;
  if (typeof status !== 'number') return null;

  const body = (error as { error?: unknown }).error;
  // Anthropic nests { type: 'error', error: { type, message } }; OpenAI is flat.
  const nested = (body as { error?: { message?: unknown } } | undefined)?.error;
  const detail =
    typeof nested?.message === 'string'
      ? nested.message
      : typeof (body as { message?: unknown } | undefined)?.message === 'string'
        ? ((body as { message: string }).message)
        : null;

  // runModel tags the provider on the way out; fall back to a neutral noun.
  const tagged = (error as { provider?: unknown }).provider;
  const provider = tagged === 'anthropic' ? 'Anthropic' : tagged === 'openai' ? 'OpenAI' : 'The AI provider';

  if (detail && /credit balance|billing|quota|insufficient funds/i.test(detail)) {
    return `${provider} is out of credits, so the AI step could not run. Add credits in the ${provider} console and retry — your upload was not saved.`;
  }
  if (status === 401 || status === 403) {
    return `${provider} rejected the API key (${status}). Check the key configured for this environment.`;
  }
  if (status === 429) {
    return `${provider} rate limit reached. Wait a moment and retry.`;
  }
  if (status >= 500) {
    return `${provider} is having an outage (${status}). Retry shortly.`;
  }
  return `${provider} rejected the request (${status})${detail ? `: ${detail}` : ''}`;
}

/**
 * Parse JSON response from AI models with error handling
 * LLMs sometimes wrap JSON in markdown code blocks
 */
export function parseModelJSON<T>(content: string): T {
  // Remove markdown code blocks if present
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    throw new Error(
      `Failed to parse JSON from model response: ${error instanceof Error ? error.message : 'Unknown error'}\n\nContent:\n${content.substring(0, 500)}`
    );
  }
}

/**
 * Retry a function with exponential backoff
 * Useful for handling rate limits and transient errors
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on certain errors
      if (
        lastError.message.includes('API key') ||
        lastError.message.includes('authentication')
      ) {
        throw lastError;
      }

      // Wait before retrying
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
