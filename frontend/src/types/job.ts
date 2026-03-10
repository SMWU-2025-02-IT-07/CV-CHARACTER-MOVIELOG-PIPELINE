// frontend/src/types/job.ts

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

export type SceneUiStatus = 'pending' | 'generating' | 'completed' | 'error';

export type JobType = 'render_scene' | 'merge' | 'render_all';

export interface CreateJobRequest {
  type: JobType;
  payload: {
    scenario_id: string;
    scene_ids: number[];
    options: Record<string, unknown>;
  };
}

export interface CreateJobResponse {
  job_id: string;
  type: JobType;
  status: JobStatus;
  payload: {
    scenario_id: string;
    scene_ids: number[];
    options: Record<string, unknown>;
  };
  progress: number;
}

export interface JobSceneResultItem {
  id: number;
  video_url: string;
}

export interface JobError {
  code: string;
  message: string;
}

export interface RenderSceneResult {
  scenes: JobSceneResultItem[];
}

export interface MergeResult {
  merged_url: string;
}

export interface RenderAllResult {
  scenes: JobSceneResultItem[];
  merged_url: string;
}

export interface GetJobResponse {
  job_id: string;
  type: JobType;
  status: JobStatus;
  payload: {
    scenario_id: string;
    scene_ids: number[];
    options: Record<string, unknown>;
  };
  result?: {
    scenes: JobSceneResultItem[];
    merged_url?: string;
  } | RenderSceneResult | MergeResult | RenderAllResult;
  error?: JobError | null;
  progress: number;
  created_at: string;
  updated_at: string;
}
