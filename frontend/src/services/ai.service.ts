/// <reference types="vite/client" />
import type {
  CreateJobRequest,
  CreateJobResponse,
  GetJobResponse,
  JobStatus,
  SceneUiStatus,
} from '../types/job';

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
 * Job 유틸
 * ===============================
 */

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapJobStatusToSceneStatus(status: JobStatus): SceneUiStatus {
  switch (status) {
    case 'queued':
      return 'pending';
    case 'running':
      return 'generating';
    case 'succeeded':
      return 'completed';
    case 'failed':
    case 'canceled':
      return 'error';
    default:
      return 'error';
  }
}

//Job 생성
export async function createRenderSceneJob(
  scenarioId: string,
  sceneId: number
): Promise<CreateJobResponse> {
  const body: CreateJobRequest = {
    type: 'render_scene',
    payload: {
      scenario_id: scenarioId,
      scene_ids: [sceneId],
      options: {},
    },
  };

  const response = await fetch(`${API_V1_BASE_URL}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create render_scene job: ${response.status} ${text}`);
  }

  return response.json();
}

export async function createMergeJob(
  scenarioId: string,
  sceneIds: number[]
): Promise<CreateJobResponse> {
  if (sceneIds.length === 0) {
    throw new Error('sceneIds is empty');
  }

  const body: CreateJobRequest = {
    type: 'merge',
    payload: {
      scenario_id: scenarioId,
      scene_ids: sceneIds,
      options: {},
    },
  };

  const response = await fetch(`${API_V1_BASE_URL}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create merge job: ${response.status} ${text}`);
  }

  return response.json();
}

//Job 조회
export async function getJob(jobId: string): Promise<GetJobResponse> {
  const response = await fetch(`${API_V1_BASE_URL}/jobs/${jobId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get job: ${response.status} ${text}`);
  }

  return response.json();
}

//Polling
export async function pollJobUntilDone(
  jobId: string,
  options?: {
    intervalMs?: number;
    timeoutMs?: number;
    onStatusChange?: (job: GetJobResponse) => void;
  }
): Promise<GetJobResponse> {
  const intervalMs = options?.intervalMs ?? 2000;
  const timeoutMs = options?.timeoutMs ?? 1000 * 60 * 5; // 5분

  const start = Date.now();

  while (true) {
    const job = await getJob(jobId);
    options?.onStatusChange?.(job);

    if (
      job.status === 'succeeded' ||
      job.status === 'failed' ||
      job.status === 'canceled'
    ) {
      return job;
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error('Job polling timed out.');
    }

    await sleep(intervalMs);
  }
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
    _imageUrl?: string,
    options?: {
      onStatusChange?: (status: SceneUiStatus) => void;
    }
  ): Promise<string> => {
  // 1) job 생성
  const createdJob = await createRenderSceneJob(scenarioId, sceneId);
  options?.onStatusChange?.(mapJobStatusToSceneStatus(createdJob.status));

  // 2) polling
  const completedJob = await pollJobUntilDone(createdJob.job_id, {
    intervalMs: 2000,
    timeoutMs: 1000 * 60 * 5,
    onStatusChange: (job) => {
      options?.onStatusChange?.(mapJobStatusToSceneStatus(job.status));
    },
  });

  // 3) 최종 상태 확인
  if (completedJob.status === 'failed') {
    throw new Error(completedJob.error?.message ?? 'Scene render job failed.');
  }

  if (completedJob.status === 'canceled') {
    throw new Error('Scene render job was canceled.');
  }

  if (completedJob.status !== 'succeeded') {
    throw new Error(`Unexpected job status: ${completedJob.status}`);
  }

  // 4) result.scenes[] 에서 해당 scene 찾기
  const resultScenes = (completedJob.result as { scenes?: Array<{ id: number; video_url?: string }> } | undefined)?.scenes;
  const matchedScene = resultScenes?.find((scene) => scene.id === sceneId);

  if (!matchedScene) {
    throw new Error(`No scene result found for scene_id=${sceneId}`);
  }

  if (!matchedScene.video_url) {
    throw new Error(`Scene result has no video_url for scene_id=${sceneId}`);
  }

    return matchedScene.video_url;
  },

  mergeVideos: async (scenarioId: string, sceneIds: number[]): Promise<string> => {
    const createdJob = await createMergeJob(scenarioId, sceneIds);
    const completedJob = await pollJobUntilDone(createdJob.job_id, {
      intervalMs: 2000,
      timeoutMs: 1000 * 60 * 5,
    });

    if (completedJob.status === 'failed') {
      throw new Error(completedJob.error?.message ?? 'Merge job failed.');
    }

    if (completedJob.status === 'canceled') {
      throw new Error('Merge job was canceled.');
    }

    if (completedJob.status !== 'succeeded') {
      throw new Error(`Unexpected merge job status: ${completedJob.status}`);
    }

    const mergedUrl = (completedJob.result as { merged_url?: string } | undefined)?.merged_url;
    if (!mergedUrl) {
      throw new Error('Merge job succeeded but merged_url is missing.');
    }

    return mergedUrl;
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
