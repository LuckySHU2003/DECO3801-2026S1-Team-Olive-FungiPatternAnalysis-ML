import OpenAI from 'openai';
import { env } from '../config/env.js';
import { ResultModel } from '../models/Result.js';
import type { ChatRequestDTO, ChatResponseDTO } from '../dto/chat.dto.js';

type ResultLike = {
  _id?: unknown;
  result_id?: string;
  job_id?: string;
  type?: string;
  summary?: Record<string, unknown>;
  output?: {
    summary?: Record<string, unknown>;
  };
  created_at?: string;
};

function extractSummary(result: ResultLike | null, fallback?: Record<string, unknown>) {
  return result?.summary || result?.output?.summary || fallback || null;
}

function getResultType(result: ResultLike | null, fallback?: string) {
  return result?.type || fallback || 'unknown_result_type';
}

function buildCombinedData(resultType: string, summary: Record<string, unknown>) {
  return {
    [resultType]: {
      summary,
    },
  };
}

function buildSystemPrompt() {
  return `You are an expert data analyst in fungal electrophysiology.

You are given backend AI model result data from fungal bioelectrical signal analysis.

The data includes:
- Core "summary" information. Always use this as the main source.
- Do not rely on raw detailed arrays unless they are explicitly provided. For this request, interpretation should be based on the summary data only.

Use your judgment:
- Base your analysis primarily on the summary data.
- Do not invent values that are not present in the summary.
- If a relevant value is missing, explain the limitation naturally instead of guessing.
- Interpret the meaning of pattern count, recurrence, frequency, amplitude, interval, prediction range, and confidence only when those fields are present.

Return a valid JSON object with exactly these TWO keys:

{
  "patternAnalysis": "Write one complete paragraph about pattern detection, spike behaviour, frequency, amplitude, recurrence, and related insights when pattern summary data is provided.",
  "predictionAnalysis": "Write one complete paragraph about prediction, future behaviour, trends, confidence, and related insights when prediction summary data is provided."
}

Do not mention internal job names like "Job 2", "Job 3", or "Job 5". Write as if you are explaining the findings directly to a researcher.

Writing Style Rules:
- Do not use technical labels like "Pattern 001", "Pattern 002", etc.
- Instead, describe them naturally, for example:
  - "the dominant oscillation pattern"
  - "the high-amplitude spike pattern"
  - "the recurring drop pattern"
  - "the low-frequency rhythmic pattern"
- Write in a natural, insightful, and research-friendly tone as if you are explaining the results to fellow researchers.`;
}

export class ChatService {
  async createChatResponse(dto: ChatRequestDTO): Promise<ChatResponseDTO> {
    if (!process.env.OPENROUTER_API_KEY) {
      return {
        answer: 'Chat service is configured, but OPENAI_API_KEY is not set yet.',
        dataset_id: dto.dataset_id,
        result_id: dto.result_id,
      };
    }

    const result = dto.result_id
      ? ((await ResultModel.findById(dto.result_id).lean()) as ResultLike | null)
      : null;

    if (dto.result_id && !result) {
      throw new Error('Result not found for the provided result_id.');
    }

    const summary = extractSummary(result, dto.summary);
    const resultType = getResultType(result, dto.result_type);

    if (!summary) {
      throw new Error('No summary was found. Provide result_id for a stored result or pass a summary object.');
    }

    const combinedData = buildCombinedData(resultType, summary);

    const client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });

    try {
      const completion = await client.chat.completions.create({
        model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
        temperature: 0.45,
        max_tokens: 1000,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          {
            role: "user",
            content: `Here is the backend result summary data:\n\n${JSON.stringify(combinedData, null, 2)}`,
          },
        ],
      });

      const answer =
        completion?.choices?.[0]?.message?.content ||
        "No interpretation response generated.";

      return { answer };
    } catch (error: any) {
      if (error?.status === 429) {
        return {
          answer:
            "The AI interpretation service is temporarily rate-limited. Please wait a short moment and try again.",
        };
      }

      throw error;
    }
  }
}
