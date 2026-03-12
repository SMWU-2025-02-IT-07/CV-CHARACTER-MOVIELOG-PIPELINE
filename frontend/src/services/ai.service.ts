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
  "http://43.202.58.164:8000"
).replace(/\/$/, "");

const API_V1_BASE_URL = API_BASE_URL.endsWith("/api/v1")
  ? API_BASE_URL
  : `${API_BASE_URL}/api/v1`;

// ML Server URL (ComfyUI + 비디오 생성)
const ML_SERVER_URL = "http://16.184.61.191:8000";

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
  const body = {
    scenario_id: scenarioId,
    scene_id: sceneId,
    job_type: "scene_video",
    status: "pending"
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

  const body = {
    scenario_id: scenarioId,
    scene_id: null, // merge job에서는 scene_id가 없을 수 있음
    job_type: "final_video",
    status: "pending"
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
   * Screen2: 씬 미리보기 이미지 생성
   */
  generateScenePreview: async (
    scenarioId: string,
    sceneId: number,
    characterImageUrl?: string,
    options?: {
      onStatusChange?: (status: 'generating' | 'completed' | 'error') => void;
    }
  ): Promise<string> => {
    try {
      // 1) 백엔드에 미리보기 생성 요청
      options?.onStatusChange?.('generating');
      
      const generateResponse = await fetch(`${API_V1_BASE_URL}/scenarios/${scenarioId}/scenes/${sceneId}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!generateResponse.ok) {
        throw new Error(`Failed to start preview generation: ${generateResponse.statusText}`);
      }

      const generateResult = await generateResponse.json();
      const promptId = generateResult.prompt_id;

      // 2) 상태 폴링
      while (true) {
        await sleep(2000); // 2초 대기

        const statusResponse = await fetch(`${API_V1_BASE_URL}/scenarios/${scenarioId}/scenes/${sceneId}/preview/${promptId}`);
        if (!statusResponse.ok) {
          throw new Error(`Failed to check preview status: ${statusResponse.statusText}`);
        }

        const statusResult = await statusResponse.json();
        
        if (statusResult.status === 'completed') {
          options?.onStatusChange?.('completed');
          return statusResult.outputs[0] || '';
        } else if (statusResult.status === 'failed') {
          options?.onStatusChange?.('error');
          throw new Error('Preview generation failed');
        }
        
        // 여전히 processing 상태
        options?.onStatusChange?.('generating');
      }
    } catch (error) {
      options?.onStatusChange?.('error');
      throw error;
    }
  },

  /**
   * Screen3: 씬 비디오 생성 (ml-server API 연동)
   */
  generateSceneVideo: async (
    scenarioId: string,
    sceneId: number,
    imageUrl?: string,
    options?: {
      onStatusChange?: (status: SceneUiStatus) => void;
    }
  ): Promise<string> => {
    // 1) 시나리오 정보 가져오기
    const scenario = await requestJson<ApiScenarioResponse>(`/scenarios/${scenarioId}`);
    const scene = scenario.scenes.find(s => s.id === sceneId);
    if (!scene) {
      throw new Error(`Scene ${sceneId} not found`);
    }

    // 2) 미리보기 이미지 사용 (있을 경우)
    let imageBlob: Blob | null = null;
    
    if (scene.imageUrl && scene.imageUrl.startsWith('https://')) {
      // S3 미리보기 이미지 사용 - 빈 FormData로 전송
      console.log('Using preview image from S3:', scene.imageUrl);
    } else if (imageUrl && imageUrl.startsWith('data:')) {
      // base64 이미지를 blob으로 변환 (캐릭터 원본)
      const response = await fetch(imageUrl);
      imageBlob = await response.blob();
    } else {
      throw new Error('No preview image found. Please generate preview first.');
    }

    // 3) ml-server에 요청
    const formData = new FormData();
    formData.append('prompt', scene.video_prompt || scene.description);
    
    if (imageBlob) {
      formData.append('image', imageBlob, 'input.png');
    } else {
      // 빈 파일로 전송 (S3에서 다운로드하도록)
      formData.append('image', new Blob(), 'undefined');
    }
    
    formData.append('frame_count', '113');
    formData.append('seed', '10');

    options?.onStatusChange?.('generating');

    const generateResponse = await fetch(`${ML_SERVER_URL}/generate/${scenarioId}/${sceneId}`, {
      method: 'POST',
      body: formData
    });

    if (!generateResponse.ok) {
      throw new Error(`Failed to start video generation: ${generateResponse.statusText}`);
    }

    const generateResult = await generateResponse.json();
    const promptId = generateResult.prompt_id;

    // 4) 상태 폴링
    while (true) {
      await sleep(3000); // 3초 대기

      const statusResponse = await fetch(`${ML_SERVER_URL}/status/${scenarioId}/${sceneId}/${promptId}`);
      if (!statusResponse.ok) {
        throw new Error(`Failed to check status: ${statusResponse.statusText}`);
      }

      const statusResult = await statusResponse.json();
      
      if (statusResult.status === 'completed') {
        options?.onStatusChange?.('completed');
        return statusResult.outputs[0] || '';
      } else if (statusResult.status === 'failed') {
        options?.onStatusChange?.('error');
        throw new Error('Video generation failed');
      }
      
      // 여전히 processing 상태
      options?.onStatusChange?.('generating');
    }
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
