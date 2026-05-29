import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { Blob } from "node:buffer";
import type { Config } from "../config.js";
import type {
  CreateJobRequest,
  GetSecretContextResponse,
  JobResource,
  JobStatus,
  JobValidationReport,
  ListedWorkflowEventResource,
  ListJobsResponse,
  ListSecretContextsResponse,
  ListWorkflowEventsResponse,
  ListWorkflowGroupsResponse,
  ListWorkflowRepairsResponse,
  ListWorkflowsResponse,
  SettingsResource,
  WorkflowExecutionResource,
  WorkflowGenerationResource,
  WorkflowGroupResource,
  WorkflowRepairResource,
  WorkflowResource,
  WorkflowSummarizationResource,
} from "./types.js";

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

export interface PollOptions {
  timeoutMs: number;
  pollIntervalMs: number;
  onPoll?: (
    execution: WorkflowExecutionResource,
    elapsedMs: number,
  ) => void | Promise<void>;
}

/** The stage of the post-failure repair chain currently being awaited. */
export type RepairChainStage = "summarization" | "repair" | "re-execution";

export interface RepairChainPollOptions {
  timeoutMs: number;
  pollIntervalMs: number;
  onPoll?: (stage: RepairChainStage, elapsedMs: number) => void | Promise<void>;
}

/**
 * The verdict of waiting out the auto-repair chain that follows a failed
 * execution. `repaired` means the test self-healed (repair succeeded and the
 * re-run passed); every `failure` reason counts as a genuine failure.
 */
export type RepairChainOutcome =
  | {
      result: "success";
      reason: "repaired";
      executionId: string;
      summary: string | null;
    }
  | {
      result: "failure";
      reason:
        | "app_issue"
        | "summarization_failed"
        | "repair_failed"
        | "reexecution_failed";
      executionId: string;
      summary: string | null;
    };

export class GetLarkClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: Config) {
    this.baseUrl = config.apiUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      "X-API-Key": this.apiKey,
    };
    const init: RequestInit = { method, headers };

    if (body instanceof FormData) {
      // Let fetch set the multipart Content-Type with boundary automatically.
      init.body = body;
    } else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Could not connect to ${this.baseUrl} (${cause}). Is the API running? Check your GETLARK_API_URL setting.`,
      );
    }

    if (!response.ok) {
      let message = `HTTP ${response.status} ${response.statusText}`;
      try {
        const body = (await response.json()) as Record<string, unknown>;
        message = `${message}, body: ${JSON.stringify(body)}`;
      } catch {
        // response body was not JSON, use the default message
      }
      throw new Error(message);
    }

    const text = await response.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private buildQueryPath(
    basePath: string,
    params: Record<
      string,
      string | number | undefined | ReadonlyArray<string | number>
    >,
  ): string {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const item of value) qs.append(key, String(item));
      } else {
        qs.set(key, String(value));
      }
    }
    const query = qs.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  private buildFileFormData(
    fields: Record<string, string>,
    filePath: string,
    fileFieldName = "file",
  ): FormData {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      form.append(key, value);
    }
    const buf = readFileSync(filePath);
    // Wrap the buffer in a Blob so undici's FormData encodes it as a file part.
    // Cast through `unknown` because Node's `Blob` from `node:buffer` is
    // structurally compatible with the global `Blob` expected by FormData.
    const blob = new Blob([buf]) as unknown as globalThis.Blob;
    form.append(fileFieldName, blob, basename(filePath));
    return form;
  }

  // ── Workflows ──────────────────────────────────────────────

  async createWorkflow(options: {
    name: string;
    description: string;
    secret_contexts?: string[];
    mode?: "ai_driven" | "deterministic";
    group_id?: string;
  }): Promise<WorkflowResource> {
    return this.request<WorkflowResource>("POST", "/workflows", options);
  }

  async getWorkflow(workflowId: string): Promise<WorkflowResource> {
    return this.request<WorkflowResource>(
      "GET",
      `/workflows/${workflowId}`,
    );
  }

  async updateWorkflow(
    workflowId: string,
    options: {
      name?: string;
      description?: string;
      secret_contexts?: string[];
      schedule?: string | null;
      group_id?: string | null;
    },
  ): Promise<WorkflowResource> {
    return this.request<WorkflowResource>(
      "PUT",
      `/workflows/${workflowId}`,
      options,
    );
  }

  async archiveWorkflow(workflowId: string): Promise<WorkflowResource> {
    return this.request<WorkflowResource>(
      "POST",
      `/workflows/${workflowId}/archive`,
    );
  }

  async unarchiveWorkflow(workflowId: string): Promise<WorkflowResource> {
    return this.request<WorkflowResource>(
      "POST",
      `/workflows/${workflowId}/unarchive`,
    );
  }

  async invokeWorkflow(
    workflowId: string,
  ): Promise<WorkflowExecutionResource> {
    return this.request<WorkflowExecutionResource>(
      "POST",
      `/workflows/${workflowId}/invoke`,
      {},
    );
  }

  async listWorkflows(options?: {
    limit?: number;
    offset?: number;
    group_id?: string;
  }): Promise<ListWorkflowsResponse> {
    const path = this.buildQueryPath("/workflows", {
      limit: options?.limit,
      offset: options?.offset,
      group_id: options?.group_id,
    });
    return this.request<ListWorkflowsResponse>("GET", path);
  }

  // ── Executions ─────────────────────────────────────────────

  async getWorkflowExecution(
    workflowId: string,
    executionId: string,
  ): Promise<WorkflowExecutionResource> {
    return this.request<WorkflowExecutionResource>(
      "GET",
      `/workflows/${workflowId}/executions/${executionId}`,
    );
  }

  async getWorkflowExecutionLogs(
    workflowId: string,
    executionId: string,
  ): Promise<string[]> {
    return this.request<string[]>(
      "GET",
      `/workflows/${workflowId}/executions/${executionId}/logs`,
    );
  }

  async cancelWorkflowExecution(
    workflowId: string,
    executionId: string,
  ): Promise<WorkflowExecutionResource> {
    return this.request<WorkflowExecutionResource>(
      "POST",
      `/workflows/${workflowId}/executions/${executionId}/cancel`,
    );
  }

  // ── Generations ────────────────────────────────────────────

  async cancelWorkflowGeneration(
    workflowId: string,
    generationId: string,
  ): Promise<WorkflowGenerationResource> {
    return this.request<WorkflowGenerationResource>(
      "POST",
      `/workflows/${workflowId}/generations/${generationId}/cancel`,
    );
  }

  // ── Repairs ────────────────────────────────────────────────

  async repairWorkflow(
    workflowId: string,
  ): Promise<WorkflowRepairResource> {
    return this.request<WorkflowRepairResource>(
      "POST",
      `/workflows/${workflowId}/repair`,
    );
  }

  async listWorkflowRepairs(
    workflowId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<ListWorkflowRepairsResponse> {
    const path = this.buildQueryPath(
      `/workflows/${workflowId}/repairs`,
      { limit: options?.limit, offset: options?.offset },
    );
    return this.request<ListWorkflowRepairsResponse>("GET", path);
  }

  async getWorkflowRepair(
    workflowId: string,
    repairId: string,
  ): Promise<WorkflowRepairResource> {
    return this.request<WorkflowRepairResource>(
      "GET",
      `/workflows/${workflowId}/repairs/${repairId}`,
    );
  }

  async cancelWorkflowRepair(
    workflowId: string,
    repairId: string,
  ): Promise<WorkflowRepairResource> {
    return this.request<WorkflowRepairResource>(
      "POST",
      `/workflows/${workflowId}/repairs/${repairId}/cancel`,
    );
  }

  async getWorkflowRepairLogs(
    workflowId: string,
    repairId: string,
  ): Promise<string[]> {
    return this.request<string[]>(
      "GET",
      `/workflows/${workflowId}/repairs/${repairId}/logs`,
    );
  }

  // ── Events ─────────────────────────────────────────────────

  async listWorkflowEvents(
    workflowId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<ListWorkflowEventsResponse> {
    const path = this.buildQueryPath(
      `/workflows/${workflowId}/events`,
      { limit: options?.limit, offset: options?.offset },
    );
    return this.request<ListWorkflowEventsResponse>("GET", path);
  }

  // ── Summarizations ─────────────────────────────────────────

  async getWorkflowSummarization(
    workflowId: string,
    summarizationId: string,
  ): Promise<WorkflowSummarizationResource> {
    return this.request<WorkflowSummarizationResource>(
      "GET",
      `/workflows/${workflowId}/summarizations/${summarizationId}`,
    );
  }

  // ── Settings ───────────────────────────────────────────────

  async getSettings(): Promise<SettingsResource> {
    return this.request<SettingsResource>("GET", "/settings");
  }

  // ── Secret Contexts ────────────────────────────────────────

  async listSecretContexts(): Promise<ListSecretContextsResponse> {
    return this.request<ListSecretContextsResponse>("GET", "/secret-contexts");
  }

  async getSecretContext(
    context: string,
  ): Promise<GetSecretContextResponse> {
    return this.request<GetSecretContextResponse>(
      "GET",
      `/secret-contexts/${encodeURIComponent(context)}`,
    );
  }

  async createSecretContext(options: {
    context: string;
    value: Record<string, string>;
  }): Promise<void> {
    await this.request<unknown>("POST", "/secret-contexts", options);
  }

  async updateSecretContext(
    context: string,
    key: string,
    value: string,
  ): Promise<void> {
    await this.request<unknown>(
      "PATCH",
      `/secret-contexts/${encodeURIComponent(context)}`,
      { key, value },
    );
  }

  async deleteSecretContext(context: string): Promise<void> {
    await this.request<unknown>(
      "DELETE",
      `/secret-contexts/${encodeURIComponent(context)}`,
    );
  }

  async deleteSecretContextKey(
    context: string,
    key: string,
  ): Promise<void> {
    await this.request<unknown>(
      "DELETE",
      `/secret-contexts/${encodeURIComponent(context)}/${encodeURIComponent(key)}`,
    );
  }

  // ── Workflow Groups ────────────────────────────────────────

  async createWorkflowGroup(options: {
    name: string;
  }): Promise<WorkflowGroupResource> {
    return this.request<WorkflowGroupResource>(
      "POST",
      "/workflow-groups",
      options,
    );
  }

  async listWorkflowGroups(options?: {
    limit?: number;
    offset?: number;
  }): Promise<ListWorkflowGroupsResponse> {
    const path = this.buildQueryPath("/workflow-groups", {
      limit: options?.limit,
      offset: options?.offset,
    });
    return this.request<ListWorkflowGroupsResponse>("GET", path);
  }

  async getWorkflowGroup(
    groupId: string,
  ): Promise<WorkflowGroupResource> {
    return this.request<WorkflowGroupResource>(
      "GET",
      `/workflow-groups/${groupId}`,
    );
  }

  async updateWorkflowGroup(
    groupId: string,
    options: { name?: string },
  ): Promise<WorkflowGroupResource> {
    return this.request<WorkflowGroupResource>(
      "PUT",
      `/workflow-groups/${groupId}`,
      options,
    );
  }

  async deleteWorkflowGroup(groupId: string): Promise<void> {
    await this.request<unknown>(
      "DELETE",
      `/workflow-groups/${groupId}`,
    );
  }

  // ── Jobs ───────────────────────────────────────────────────

  async createJob(body: CreateJobRequest): Promise<JobResource> {
    return this.request<JobResource>("POST", "/jobs", body);
  }

  async listJobs(options?: {
    limit?: number;
    offset?: number;
    status?: JobStatus[];
  }): Promise<ListJobsResponse> {
    const path = this.buildQueryPath("/jobs", {
      limit: options?.limit,
      offset: options?.offset,
      status: options?.status,
    });
    return this.request<ListJobsResponse>("GET", path);
  }

  async getJob(jobId: string): Promise<JobResource> {
    return this.request<JobResource>(
      "GET",
      `/jobs/${encodeURIComponent(jobId)}`,
    );
  }

  async cancelJob(jobId: string): Promise<JobResource> {
    return this.request<JobResource>(
      "POST",
      `/jobs/${encodeURIComponent(jobId)}/cancel`,
    );
  }

  async uploadJob(options: {
    type: "workflow_import";
    name: string;
    filePath: string;
  }): Promise<JobResource> {
    const form = this.buildFileFormData(
      { type: options.type, name: options.name },
      options.filePath,
    );
    return this.request<JobResource>("POST", "/jobs/upload", form);
  }

  async validateUploadJob(options: {
    type: "workflow_import";
    filePath: string;
  }): Promise<JobValidationReport> {
    const form = this.buildFileFormData(
      { type: options.type },
      options.filePath,
    );
    return this.request<JobValidationReport>(
      "POST",
      "/jobs/upload/validate",
      form,
    );
  }

  // ── Polling ────────────────────────────────────────────────

  private sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  async pollWorkflowExecution(
    workflowId: string,
    executionId: string,
    options: PollOptions,
  ): Promise<WorkflowExecutionResource> {
    const { timeoutMs, pollIntervalMs, onPoll } = options;
    const startTime = Date.now();

    const terminalStatuses = new Set(["success", "failure", "cancelled"]);

    while (true) {
      const execution = await this.getWorkflowExecution(
        workflowId,
        executionId,
      );
      const elapsedMs = Date.now() - startTime;

      await onPoll?.(execution, elapsedMs);

      if (terminalStatuses.has(execution.status)) {
        return execution;
      }

      if (elapsedMs >= timeoutMs) {
        throw new TimeoutError(
          `Timed out after ${Math.round(timeoutMs / 1000)}s waiting for execution ${executionId} to complete (last status: ${execution.status})`,
        );
      }

      await this.sleep(pollIntervalMs);
    }
  }

  /**
   * After an execution fails, an account with auto-repair enabled will run a
   * summarization, an optional repair, and a follow-up re-execution. This
   * follows that chain via the workflow event timeline and returns a verdict:
   *
   *   summarization "app_issue"        → failure (genuine app defect)
   *   summarization not successful     → failure (inconclusive)
   *   repair not successful            → failure
   *   re-execution failure             → failure
   *   re-execution success             → success (test self-healed)
   */
  async pollWorkflowRepairChain(
    workflowId: string,
    failedExecution: WorkflowExecutionResource,
    options: RepairChainPollOptions,
  ): Promise<RepairChainOutcome> {
    const { timeoutMs, pollIntervalMs, onPoll } = options;
    const startTime = Date.now();

    const terminalStatuses = new Set(["success", "failure", "cancelled"]);
    const at = (ts: string | null) => (ts ? new Date(ts).getTime() : 0);
    // The repair chain only starts once the execution actually fails, so scope
    // the event window to the failure time (stopped_at), falling back to
    // created_at only if the execution never recorded a stop time. Using
    // created_at would widen the window to when the execution was triggered and
    // can pull in unrelated events for long-running executions.
    const failedAt = at(failedExecution.stopped_at ?? failedExecution.created_at);

    let stage: RepairChainStage = "summarization";

    while (true) {
      // Events are returned newest-first; reorder the events that belong to
      // this failure (created after the failed execution) oldest-first so we
      // can walk the chain in the order it happened.
      const { workflow_events } = await this.listWorkflowEvents(workflowId, {
        limit: 50,
      });
      const chain = workflow_events
        .filter((e) => at(e.created_at) > failedAt)
        .sort((a, b) => at(a.created_at) - at(b.created_at));

      const elapsedMs = Date.now() - startTime;
      await onPoll?.(stage, elapsedMs);

      // There may be several terminal summarization events in the window (e.g.
      // a newer chain that raced ahead, or stale ones). The oldest is not
      // necessarily ours, so consider every candidate and match on
      // workflow_execution_id rather than acting on the first one we find — and
      // verify ownership BEFORE branching on status, so a failed summarization
      // belonging to a different execution can't wrongly fail our chain.
      let summ: ListedWorkflowEventResource | undefined;
      let detail: WorkflowSummarizationResource | undefined;
      for (const candidate of chain) {
        if (
          candidate.event_type !== "summarization" ||
          !terminalStatuses.has(candidate.status)
        ) {
          continue;
        }
        const candidateDetail = await this.getWorkflowSummarization(
          workflowId,
          candidate.id,
        );
        if (candidateDetail.workflow_execution_id === failedExecution.id) {
          summ = candidate;
          detail = candidateDetail;
          break;
        }
      }
      // If we found OUR summarization, branch on its status.
      if (summ && detail) {
        if (summ.status !== "success") {
          return {
            result: "failure",
            reason: "summarization_failed",
            executionId: failedExecution.id,
            summary: null,
          };
        }
        if (detail.category === "app_issue") {
          return {
            result: "failure",
            reason: "app_issue",
            executionId: failedExecution.id,
            summary: detail.summary,
          };
        }
        // A test-side issue: an auto-repair should follow.
        stage = "repair";

        const repair = chain.find(
          (e) =>
            e.event_type === "repair" && at(e.created_at) >= at(summ.created_at),
        );
        if (repair && terminalStatuses.has(repair.status)) {
          if (repair.status !== "success") {
            return {
              result: "failure",
              reason: "repair_failed",
              executionId: failedExecution.id,
              summary: null,
            };
          }
          // The repair succeeded; the backend re-runs the test.
          stage = "re-execution";

          const reExecution = chain.find(
            (e) =>
              e.event_type === "execution" &&
              repair.stopped_at !== null &&
              at(e.created_at) >= at(repair.stopped_at),
          );
          if (reExecution && terminalStatuses.has(reExecution.status)) {
            if (reExecution.status === "success") {
              return {
                result: "success",
                reason: "repaired",
                executionId: reExecution.id,
                summary: detail.summary,
              };
            }
            // Surface the re-execution's OWN failure summary rather than the
            // summarization's repair-suggestion text, which describes the
            // original failure and is misleading for a re-execution failure.
            const reExecutionDetail = await this.getWorkflowExecution(
              workflowId,
              reExecution.id,
            );
            return {
              result: "failure",
              reason: "reexecution_failed",
              executionId: reExecution.id,
              summary: reExecutionDetail.summary,
            };
          }
        }
      }

      if (elapsedMs >= timeoutMs) {
        throw new TimeoutError(
          `Timed out after ${Math.round(timeoutMs / 1000)}s waiting for repair of execution ${failedExecution.id} (stage: ${stage})`,
        );
      }

      await this.sleep(pollIntervalMs);
    }
  }
}
