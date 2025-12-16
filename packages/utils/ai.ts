import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type ModelProvider = 'anthropic' | 'openai';
export type ModelId =
  | 'claude-sonnet-4-5-20250929'
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
    model: 'claude-sonnet-4-5-20250929',
    maxTokens: 4096,
    temperature: 0.3,
  },
  'call-lab-full': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    maxTokens: 8192,
    temperature: 0.3,
  },
  'call-lab-pro': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    maxTokens: 16384,
    temperature: 0.3,
  },
  'discovery-lab-lite': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    maxTokens: 4096,
    temperature: 0.4,
  },
  'discovery-lab-pro': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    maxTokens: 8192,
    temperature: 0.4,
  },
};

export interface ModelResponse {
  content: string;
  usage: {
    input: number;
    output: number;
  };
}

/**
 * Run an AI model with the given prompts
 * Abstracts away provider-specific details
 */
export async function runModel(
  toolName: string,
  systemPrompt: string,
  userPrompt: string,
  options?: Partial<ModelConfig>
): Promise<ModelResponse> {
  const config = { ...MODEL_CONFIGS[toolName], ...options };

  if (config.provider === 'anthropic') {
    return runAnthropic(config, systemPrompt, userPrompt);
  } else {
    return runOpenAI(config, systemPrompt, userPrompt);
  }
}

/**
 * Run Anthropic Claude model
 */
async function runAnthropic(
  config: ModelConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<ModelResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  const anthropic = new Anthropic({
    apiKey,
  });

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
  });

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
  userPrompt: string
): Promise<ModelResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const openai = new OpenAI({
    apiKey,
  });

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
  });

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
