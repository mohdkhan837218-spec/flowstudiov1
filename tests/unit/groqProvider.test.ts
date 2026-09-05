import { describe, it, expect } from 'vitest';
import { GroqProvider } from '../../src/main/providers/GroqProvider';
import { MockGroqProvider } from '../../src/main/providers/MockGroqProvider';

describe('GroqProvider & JSON Schema Validation', () => {
  it('should clean and parse markdown-wrapped JSON', () => {
    const rawMarkdown = `\`\`\`json
{
  "projectName": "Neo Tokyo Hunt",
  "description": "Detective in rain",
  "shots": [
    {
      "id": "shot_001",
      "prompt": "Cinematic 8k wide shot of rainy streets",
      "duration": 5,
      "aspectRatio": "16:9"
    }
  ]
}
\`\`\``;

    const parsed = GroqProvider.cleanAndParseJSON(rawMarkdown);
    expect(parsed.projectName).toBe('Neo Tokyo Hunt');
    expect(parsed.shots).toHaveLength(1);
  });

  it('should auto-repair trailing commas in JSON output', () => {
    const brokenJson = `{
      "projectName": "Space Odyssey",
      "description": "Journey to Mars",
      "shots": [
        {
          "id": "shot_001",
          "prompt": "Rocket launch pad",
          "duration": 5,
          "aspectRatio": "16:9",
        },
      ],
    }`;

    const parsed = GroqProvider.cleanAndParseJSON(brokenJson);
    expect(parsed.projectName).toBe('Space Odyssey');
  });

  it('should validate and normalize shot structures', () => {
    const raw = {
      project: 'Cyberpunk Run',
      description: 'Action scene',
      shots: [
        {
          id: 'shot_custom',
          prompt: 'Fast bike pursuit',
          duration: 10,
          aspectRatio: '9:16'
        }
      ]
    };

    const validated = GroqProvider.validatePlan(raw);
    expect(validated.projectName).toBe('Cyberpunk Run');
    expect(validated.shots[0].duration).toBe(10);
    expect(validated.shots[0].aspectRatio).toBe('9:16');
  });

  it('should reject plans missing valid shots', () => {
    expect(() => GroqProvider.validatePlan({ projectName: 'Empty' })).toThrow(/must contain a non-empty "shots"/);
  });

  it('should produce structured shot plans via MockGroqProvider', () => {
    const plan = MockGroqProvider.decomposePrompt('Fantasy dragon over castle', 3);
    expect(plan.projectName).toContain('Fantasy');
    expect(plan.shots).toHaveLength(3);
    expect(plan.shots[0].duration).toBeGreaterThanOrEqual(5);
  });
});
