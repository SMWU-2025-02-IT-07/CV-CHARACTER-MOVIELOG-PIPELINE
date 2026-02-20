export interface SceneInput {
  id: number;
  description: string;
}

export interface SceneOutput {
  id: number;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  title?: string;
  duration_sec: number;
}

export interface ScenarioResult {
  scenarioId: string;
  scenes: SceneOutput[];
}

export const AIService = {
  generateScenario: async (
    name: string,
    who: string,
    where: string,
    what: string,
    how: string,
    characterImageUrl: string
  ): Promise<ScenarioResult> => {
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      scenarioId: `scn_demo_${Date.now()}`,
      scenes: [
        {
          id: 1,
          description: `${who} ${where}¿¡ °©´Ï´Ù`,
          imageUrl: '/demo/images/scene-1.png',
          title: 'Scene 1',
          duration_sec: 4,
        },
        {
          id: 2,
          description: `${who} ${what}`,
          imageUrl: '/demo/images/scene-2.png',
          title: 'Scene 2',
          duration_sec: 4,
        },
        {
          id: 3,
          description: `${who} ${how}`,
          imageUrl: '/demo/images/scene-3.png',
          title: 'Scene 3',
          duration_sec: 4,
        },
      ],
    };
  },

  regenerateScenario: async (
    scenarioId: string,
    scenes: SceneInput[],
    characterImageUrl: string
  ): Promise<ScenarioResult> => {
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      scenarioId,
      scenes: scenes.map(scene => ({
        ...scene,
        imageUrl: `/demo/images/scene-${scene.id}.png`,
        title: `Scene ${scene.id}`,
        duration_sec: 4,
      })),
    };
  },

  generateSceneVideo: async (
    sceneId: number,
    sceneDescription: string,
    characterImageUrl: string,
    scenarioId?: string
  ): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return `/demo/videos/scene-${sceneId}.mp4`;
  },

  mergeVideos: async (videoUrls: string[]): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return videoUrls[0] || '/demo/videos/scene-1.mp4';
  },
};
