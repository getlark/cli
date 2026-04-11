export interface DeterministicWorkflowDetailsResource {
  executable_test_artifact: string | null;
  executable_test_artifact_download_url: string | null;
}

export interface WorkflowResource {
  id: string;
  name: string;
  status:
    | "active"
    | "pending_generation"
    | "generating"
    | "generation_successful"
    | "generation_failed"
    | "archived"
    | "needs_repair"
    | "repairing"
    | "repair_successful"
    | "repair_failed";
  description: string;
  secret_contexts: string[] | null;
  mode: "ai_driven" | "deterministic";
  deterministic_details: DeterministicWorkflowDetailsResource | null;
  last_execution_id: string | null;
  last_execution_started_at: string | null;
  last_execution_stopped_at: string | null;
  last_execution_result_type: "success" | "failure" | "cancelled" | null;
  last_generation_id: string | null;
  last_generation_started_at: string | null;
  last_generation_stopped_at: string | null;
  last_generation_result_type: "success" | "failure" | "cancelled" | null;
  last_repair_id: string | null;
  last_repair_started_at: string | null;
  last_repair_stopped_at: string | null;
  last_repair_result_type: "success" | "failure" | "cancelled" | null;
  schedule: string | null;
  group_id: string | null;
  next_execution_at: string | null;
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

export interface WorkflowArtifactResource {
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
  artifacts: WorkflowArtifactResource[];
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

export interface WorkflowGenerationResource {
  id: string;
  workflow_id: string;
  status: "pending" | "running" | "success" | "failure" | "cancelled";
  started_at: string | null;
  stopped_at: string | null;
  secret_contexts: string[] | null;
  artifacts: WorkflowArtifactResource[];
  created_at: string;
  updated_at: string;
}

export interface WorkflowRepairResource {
  id: string;
  workflow_id: string;
  status: "pending" | "running" | "success" | "failure" | "cancelled";
  started_at: string | null;
  stopped_at: string | null;
  summary: string | null;
  secret_contexts: string[] | null;
  artifacts: WorkflowArtifactResource[];
  created_at: string;
  updated_at: string;
}

export interface ListedWorkflowRepairResource {
  id: string;
  workflow_id: string;
  status: "pending" | "running" | "success" | "failure" | "cancelled";
  started_at: string | null;
  stopped_at: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListWorkflowRepairsResponse {
  workflow_repairs: ListedWorkflowRepairResource[];
  has_more: boolean;
}

export interface ListedWorkflowEventResource {
  id: string;
  workflow_id: string;
  event_type: "generation" | "execution" | "repair";
  status: "pending" | "running" | "success" | "failure" | "cancelled";
  started_at: string | null;
  stopped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListWorkflowEventsResponse {
  workflow_events: ListedWorkflowEventResource[];
  has_more: boolean;
}

export interface WorkflowGroupResource {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ListWorkflowGroupsResponse {
  workflow_groups: WorkflowGroupResource[];
  has_more: boolean;
}
