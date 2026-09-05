import { ShotPlanItem } from '../../shared/types/project';
import { MockGroqProvider } from './MockGroqProvider';
import { Logger } from '../logging/logger';
import { AppDatabase } from '../database/db';

export class GroqProvider {
  /**
   * Cleans model output by stripping markdown json blocks, comments, and repairing structure.
   */
  public static cleanAndParseJSON(rawText: string): any {
    let clean = rawText.trim();

    // Strip markdown code blocks
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/i, '').replace(/\s*```$/, '');
    }

    // Find bounding JSON object if there is conversational preamble
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }

    try {
      return JSON.parse(clean);
    } catch (parseError) {
      // Structured repair attempt: remove trailing commas before closing braces/brackets
      const repaired = clean
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/\n/g, ' ')
        .replace(/\r/g, '');
      try {
        return JSON.parse(repaired);
      } catch {
        throw new Error(`Failed to parse Groq JSON response: ${(parseError as Error).message}`);
      }
    }
  }

  /**
   * Validates parsed JSON against the strict ShotPlan schema.
   */
  public static validatePlan(data: any): { projectName: string; description: string; shots: ShotPlanItem[] } {
    if (!data || typeof data !== 'object') {
      throw new Error('Groq plan must be a valid JSON object');
    }

    const projectName = typeof data.projectName === 'string' && data.projectName.trim()
      ? data.projectName.trim()
      : typeof data.project === 'string' && data.project.trim()
        ? data.project.trim()
        : 'AI Video Story';

    const description = typeof data.description === 'string' ? data.description.trim() : 'Decomposed visual plan';

    if (!Array.isArray(data.shots) || data.shots.length === 0) {
      throw new Error('Groq plan must contain a non-empty "shots" array');
    }

    const validShots: ShotPlanItem[] = [];

    data.shots.forEach((s: any, idx: number) => {
      if (!s || typeof s !== 'object') return;
      const id = typeof s.id === 'string' && s.id.trim() ? s.id.trim() : `shot_${String(idx + 1).padStart(3, '0')}`;
      const prompt = typeof s.prompt === 'string' && s.prompt.trim() ? s.prompt.trim() : `Cinematic scene ${idx + 1}`;
      const duration = s.duration === 10 ? 10 : 5;
      const aspectRatio = s.aspectRatio === '9:16' || s.aspectRatio === '1:1' ? s.aspectRatio : '16:9';
      const notes = typeof s.notes === 'string' ? s.notes : undefined;

      validShots.push({ id, prompt, duration, aspectRatio, notes });
    });

    if (validShots.length === 0) {
      throw new Error('No valid shot objects could be extracted from Groq plan');
    }

    return {
      projectName,
      description,
      shots: validShots
    };
  }

  /**
   * Decomposes a story or concept prompt using Groq API or falls back to MockGroqProvider.
   */
  public static async decomposePrompt(
    prompt: string,
    numShots = 4
  ): Promise<{ projectName: string; description: string; shots: ShotPlanItem[] }> {
    const settings = AppDatabase.getSettings();
    const apiKey = settings.groqApiKey || process.env.GROQ_API_KEY;

    if (!apiKey || apiKey.trim() === '') {
      Logger.info('GroqProvider', 'No Groq API key configured; using built-in intelligent shot generator');
      return MockGroqProvider.decomposePrompt(prompt, numShots);
    }

    Logger.info('GroqProvider', `Decomposing prompt using Groq model ${settings.groqModel || 'llama-3.3-70b-versatile'}`);

    const systemPrompt = `You are an expert Hollywood cinematographer, story director, and AI video prompt engineer.
Your task is to take a story concept, script, or idea and decompose it into a sequence of exactly ${numShots} cohesive, highly-detailed camera shots for video generation.

CRITICAL RULES:
1. Output MUST be strictly valid JSON with no conversational text before or after.
2. Structure:
{
  "projectName": "Short Descriptive Title",
  "description": "One sentence summary",
  "shots": [
    {
      "id": "shot_001",
      "prompt": "Extremely detailed visual prompt specifying camera angle, lighting, subject action, environment details, color grade, and atmosphere",
      "duration": 5,
      "aspectRatio": "16:9",
      "notes": "Shot purpose"
    }
  ]
}
3. Each prompt should be 1-3 sentences describing pure visual elements (lighting, camera movement, photorealistic details, atmosphere). Avoid buzzwords like "photorealistic" alone—describe specific textures, reflections, optics, and volumetric lighting.`;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          model: settings.groqModel || 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Please create ${numShots} shots for this story:\n"${prompt}"` }
          ],
          temperature: 0.7,
          max_tokens: 2048,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API returned HTTP ${response.status}: ${errorText}`);
      }

      const responseJson = await response.json();
      const rawContent = responseJson.choices?.[0]?.message?.content;

      if (!rawContent) {
        throw new Error('Empty response received from Groq API');
      }

      const parsed = this.cleanAndParseJSON(rawContent);
      const validated = this.validatePlan(parsed);

      Logger.success('GroqProvider', `Successfully decomposed story into ${validated.shots.length} shots`);
      return validated;
    } catch (err: any) {
      Logger.warn('GroqProvider', `Groq call failed (${err.message}). Falling back to local intelligent template generator`, null, null, { error: String(err) });
      return MockGroqProvider.decomposePrompt(prompt, numShots);
    }
  }
}
