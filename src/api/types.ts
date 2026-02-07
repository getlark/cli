export interface WorkflowExecutionStepResource {
  step: string;
  result: boolean;
}

export interface WorkflowExecutionArtifactResource {
  artifact_type: "screenshot" | "video";
  filename: string;
  presigned_url: string;
  presigned_url_expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecutionResource {
  id: string;
  workflow_id: string;
  status: "pending" | "running" | "success" | "failure";
  artifacts: WorkflowExecutionArtifactResource[];
  steps: WorkflowExecutionStepResource[] | null;
  summary: string | null;
  started_at: string | null;
  stopped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiErrorResponse {
  detail: string;
}
