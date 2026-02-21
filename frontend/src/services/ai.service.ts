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
}

export interface ScenarioResult {
  scenarioId: string;
  scenes: SceneOutput[];
}

/**
 * ===============================
 * API BASE URL 설정 (dev / prod 대응)
 * ===============================
 */

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_AWS_API_ENDPOINT ||
  "http://localhost:8000"
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
   * (추후 구현)
   */
  generateSceneVideo: async (): Promise<string> => {
    throw new Error("Not implemented: connect generateSceneVideo API");
  },

  mergeVideos: async (): Promise<string> => {
    throw new Error("Not implemented: connect mergeVideos API");
  },
};