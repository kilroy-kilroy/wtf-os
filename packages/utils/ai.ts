import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type ModelProvider = 'anthropic' | 'openai';
export type AnthropicModelId = 'claude-sonnet-4-5-20250929';
export type OpenAIModelId = 'gpt-5.1' | 'gpt-4o';
export type ModelId = AnthropicModelId | OpenAIModelId;

export interface ModelConfig {
  provider: ModelProvider;
  model: ModelId;
  maxTokens: number;
  temperature: number;
}

export interface FallbackConfig {
  primary: ModelConfig;
  fallback: ModelConfig;
}

// Default model configurations for different tools
// Primary: Claude Sonnet 4.5 | Fallback: OpenAI o1
const MODEL_CONFIGS: Record<string, FallbackConfig> = {
  'call-lab-lite': {
    primary: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 4096,
      temperature: 0.3,
    },
    fallback: {
      provider: 'openai',
      model: 'gpt-5.1',
      maxTokens: 4096,
      temperature: 0.3,
    },
  },
  'call-lab-full': {
    primary: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 8192,
      temperature: 0.3,
    },
    fallback: {
      provider: 'openai',
      model: 'gpt-5.1',
      maxTokens: 8192,
      temperature: 0.3,
    },
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
 * Primary: Claude Sonnet 4.5 | Fallback: OpenAI o1
 * Automatically falls back to OpenAI if Anthropic fails
 */
export async function runModel(
  toolName: string,
  systemPrompt: string,
  userPrompt: string,
  options?: Partial<ModelConfig>
): Promise<ModelResponse & { provider: ModelProvider }> {
  const fallbackConfig = MODEL_CONFIGS[toolName];
  if (!fallbackConfig) {
    throw new Error(`No model configuration found for tool: ${toolName}`);
  }

  const primaryConfig = { ...fallbackConfig.primary, ...options };
  const fallbackModelConfig = { ...fallbackConfig.fallback, ...options };

  // Try primary provider (Claude Sonnet 4.5)
  try {
    const result = await runProvider(primaryConfig, systemPrompt, userPrompt);
    return { ...result, provider: primaryConfig.provider };
  } catch (primaryError) {
    console.warn(
      `Primary provider (${primaryConfig.provider}/${primaryConfig.model}) failed:`,
      primaryError instanceof Error ? primaryError.message : primaryError
    );

    // Fall back to OpenAI o1
    try {
      console.log(`Falling back to ${fallbackModelConfig.provider}/${fallbackModelConfig.model}`);
      const result = await runProvider(fallbackModelConfig, systemPrompt, userPrompt);
      return { ...result, provider: fallbackModelConfig.provider };
    } catch (fallbackError) {
      console.error(
        `Fallback provider (${fallbackModelConfig.provider}/${fallbackModelConfig.model}) also failed:`,
        fallbackError instanceof Error ? fallbackError.message : fallbackError
      );
      // Throw the original error for better debugging
      throw primaryError;
    }
  }
}

/**
 * Run a specific provider
 */
async function runProvider(
  config: ModelConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<ModelResponse> {
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
