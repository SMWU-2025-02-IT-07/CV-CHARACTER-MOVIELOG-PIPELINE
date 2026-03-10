/// <reference types="vite/client" />

export interface SceneInput {
  id: number;
  description: string;
}

interface ApiScene {
  id: number;
  title: string;
  description: string;
  duration: number;
  image_url?: string | null;
  image_prompt?: string | null;

}

interface ApiScenarioResponse {
  scenario_id: string;
  scenes: ApiScene[];
}

export interface SceneOutput {
  id: number;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  title?: string;
  duration: number;
  imagePrompt?: string;
}

export interface ScenarioResult {
  scenarioId: string;
  scenes: SceneOutput[];
}

export interface LibraryScenarioSummary {
  scenario_id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  status: string;
  thumbnail_url?: string;
  final_video_url?: string;
}

export interface LibrarySceneItem {
  id: number;
  title?: string;
  description: string;
  duration: number;
  image_url?: string;
  video_url?: string;
  status?: string;
}

export interface LibraryScenarioDetail {
  scenario_id: string;
  title: string;
  brief: string;
  created_at: string;
  updated_at?: string;
  status: string;
  thumbnail_url?: string;
  final_video_url?: string;
  scenes: LibrarySceneItem[];
}

/**
 * ===============================
 * API BASE URL 설정 (dev / prod 대응)
 * ===============================
 */

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_AWS_API_ENDPOINT ||
  "http://52.78.181.92:8000"
).replace(/\/$/, "");

const API_V1_BASE_URL = API_BASE_URL.endsWith("/api/v1")
  ? API_BASE_URL
  : `${API_BASE_URL}/api/v1`;

/**
 * ===============================
 * 공통 fetch 함수 (에러 강화 버전)
 * ===============================
 */

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_V1_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();

  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const message =
      payload?.error?.message ||
      payload?.detail ||
      payload?.message ||
      text ||
      `HTTP ${res.status}`;

    throw new Error(`API Error: ${message}`);
  }

  return payload as T;
}

/**
 * ===============================
 * 응답 매핑
 * ===============================
 */

function mapApiScene(scene: ApiScene): SceneOutput {
  return {
    id: scene.id,
    title: scene.title ?? `Scene ${scene.id}`,
    description: scene.description,
    duration: scene.duration,
    imageUrl: scene.image_url ?? undefined,
    imagePrompt: scene.image_prompt ?? undefined,
  };
}

/**
 * ===============================
 * AI Service
 * ===============================
 */

export const AIService = {
  /**
   * Screen1: 시나리오 생성
   */
  generateScenario: async (
    name: string,
    who: string,
    where: string,
    what: string,
    how: string,
    characterImageUrl: string
  ): Promise<ScenarioResult> => {
    const payload = {
      character: {
        name,
        image_url: characterImageUrl,
      },
      brief: {
        who,
        where,
        what,
        how,
      },
      options: {
        scene_count: 3,
        lang: "ko",
      },
    };

    const result = await requestJson<ApiScenarioResponse>("/scenarios", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return {
      scenarioId: result.scenario_id,
      scenes: result.scenes.map(mapApiScene),
    };
  },

  /**
   * Screen2: 시나리오 재생성
   */
  regenerateScenario: async (
    scenarioId: string,
    scenes: SceneInput[],
    characterImageUrl: string
  ): Promise<ScenarioResult> => {
    const payload = {
      scenes: scenes.map((s) => ({
        id: s.id,
        description: s.description,
      })),
      character_image_url: characterImageUrl,
      options: {
        scene_count: 3,
        lang: "ko",
      },
    };

    const result = await requestJson<ApiScenarioResponse>(
      `/scenarios/${encodeURIComponent(scenarioId)}/regenerate`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    return {
      scenarioId: result.scenario_id,
      scenes: result.scenes.map(mapApiScene),
    };
  },

  /**
   * Screen3: 씬 비디오 생성 (백엔드 API 연동)
   */
  generateSceneVideo: async (
    scenarioId: string,
    sceneId: number,
    imageUrl: string,
    frameCount: number = 113,
    seed: number = 10
  ): Promise<string> => {
    // 이미지를 blob으로 가져오기
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    
    // FormData 생성
    const formData = new FormData();
    formData.append('image', imageBlob, 'scene_image.jpg');
    formData.append('frame_count', frameCount.toString());
    formData.append('seed', seed.toString());
    
    // 백엔드 API를 통해 ComfyUI에 비디오 생성 요청
    const response = await fetch(`${API_V1_BASE_URL}/comfyui/generate/${scenarioId}/${sceneId}`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Video generation failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    const promptId = result.prompt_id;
    
    // 상태 폴링으로 완료 대기
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10초 대기
      
      const statusResponse = await fetch(`${API_V1_BASE_URL}/comfyui/status/${scenarioId}/${sceneId}/${promptId}`);
      const statusResult = await statusResponse.json();
      
      if (statusResult.status === 'completed') {
        return statusResult.video_url; // S3 URL 반환
      }
      
      if (statusResult.status === 'failed') {
        throw new Error('Video generation failed');
      }
    }
  },

  mergeVideos: async (videoUrls: string[]): Promise<string> => {
    // 임시로 첫 번째 비디오 URL 반환 (실제 병합 로직은 추후 구현)
    return videoUrls[0] || '';
  },
  
  getScenarioList: async (): Promise<LibraryScenarioSummary[]> => {
    const res = await fetch(`${API_V1_BASE_URL}/scenarios`);
    if (!res.ok) {
      throw new Error("시나리오 목록 조회에 실패했습니다.");
    }
    return res.json();
  },

  getScenarioDetail: async (scenarioId: string): Promise<LibraryScenarioDetail> => {
    const res = await fetch(`${API_V1_BASE_URL}/scenarios/${scenarioId}`);
    if (!res.ok) {
      throw new Error("시나리오 상세 조회에 실패했습니다.");
    }
    return res.json();
  },


};