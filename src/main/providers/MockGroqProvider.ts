import { ShotPlanItem } from '../../shared/types/project';

export class MockGroqProvider {
  public static decomposePrompt(prompt: string, numShots = 4): {
    projectName: string;
    description: string;
    shots: ShotPlanItem[];
  } {
    const cleanPrompt = prompt.trim() || 'Cinematic Story Exploration';
    const words = cleanPrompt.split(/\s+/).slice(0, 5).join(' ');
    const projectName = words.charAt(0).toUpperCase() + words.slice(1);

    const shotTemplates = [
      {
        angle: 'Cinematic wide establishing shot',
        movement: 'slow drone push-in, volumetric lighting, photorealistic 8k, highly detailed atmosphere',
        duration: 5,
        aspectRatio: '16:9' as const
      },
      {
        angle: 'Medium tracking shot',
        movement: 'dynamic camera movement following the subject, shallow depth of field, 35mm lens, golden hour',
        duration: 5,
        aspectRatio: '16:9' as const
      },
      {
        angle: 'Intense close-up portrait shot',
        movement: 'subtle micro-expressions, dramatic side lighting, sharp focus on eyes, cinematic color grading',
        duration: 5,
        aspectRatio: '16:9' as const
      },
      {
        angle: 'Low-angle heroic camera movement',
        movement: 'slow motion 60fps, atmospheric haze and particles, epic scale, hyper-realistic composition',
        duration: 5,
        aspectRatio: '16:9' as const
      },
      {
        angle: 'Aerial pull-back finale shot',
        movement: 'sweeping vista reveal, cinematic clouds, ultra-high definition, majestic cinematic lighting',
        duration: 10,
        aspectRatio: '16:9' as const
      }
    ];

    const actualCount = Math.max(2, Math.min(numShots, shotTemplates.length));
    const shots: ShotPlanItem[] = [];

    for (let i = 0; i < actualCount; i++) {
      const template = shotTemplates[i % shotTemplates.length];
      const shotId = `shot_${String(i + 1).padStart(3, '0')}`;
      shots.push({
        id: shotId,
        prompt: `${template.angle} of ${cleanPrompt}. ${template.movement}.`,
        duration: template.duration,
        aspectRatio: template.aspectRatio,
        notes: `Shot ${i + 1} of ${actualCount} - ${template.angle}`
      });
    }

    return {
      projectName: `Project — ${projectName}`,
      description: `AI decomposed storyboard for: "${cleanPrompt}"`,
      shots
    };
  }
}
