export interface DeterministicWorkflowDetailsResource {
  executable_test_artifact: string | null;
  executable_test_artifact_download_url: string | null;
}

export interface WorkflowResource {
  id: string;
  name: string;
  status:
    | "active"
    | "generating"
    | "generation_successful"
    | "generation_failed"
    | "archived";
  description: string;
  secret_contexts: string[] | null;
  mode: "ai_driven" | "deterministic";
  deterministic_details: DeterministicWorkflowDetailsResource | null;
  last_execution_id: string | null;
  last_execution_started_at: string | null;
  last_execution_stopped_at: string | null;
  last_execution_result_type: "success" | "failure" | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListWorkflowsResponse {
  workflows: WorkflowResource[];
  has_more: boolean;
}

export interface FrictionPointInterface {
  friction_point: string;
  friction_score: number;
}

export interface WorkflowExecutionStepResource {
  step: string;
  result: boolean;
  friction_points: FrictionPointInterface[] | null;
}

export interface WorkflowExecutionArtifactResource {
  artifact_type:
    | "screenshot"
    | "video"
    | "javascript"
    | "python"
    | "shellscript";
  filename: string;
  presigned_url: string;
  presigned_url_expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecutionResource {
  id: string;
  workflow_id: string;
  status: "pending" | "running" | "success" | "failure" | "cancelled";
  type: string | null;
  artifacts: WorkflowExecutionArtifactResource[];
  steps: WorkflowExecutionStepResource[] | null;
  summary: string | null;
  started_at: string | null;
  stopped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListedWorkflowExecutionResource {
  id: string;
  workflow_id: string;
  status: "pending" | "running" | "success" | "failure" | "cancelled";
  type: string | null;
  steps: WorkflowExecutionStepResource[] | null;
  summary: string | null;
  started_at: string | null;
  stopped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListWorkflowExecutionsResponse {
  workflow_executions: ListedWorkflowExecutionResource[];
  has_more: boolean;
}

export interface ApiErrorResponse {
  detail: string;
}

export interface SecretContextResource {
  context: string;
  created_at: string;
  updated_at: string;
}

export interface ListSecretContextsResponse {
  secret_contexts: SecretContextResource[];
  has_more: boolean;
}

export interface GetSecretContextResponse {
  context: string;
  keys: string[];
}
