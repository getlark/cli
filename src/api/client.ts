import type { Config } from "../config.js";
import type {
  GetSecretContextResponse,
  ListSecretContextsResponse,
  ListWorkflowEventsResponse,
  ListWorkflowGroupsResponse,
  ListWorkflowRepairsResponse,
  ListWorkflowsResponse,
  WorkflowExecutionResource,
  WorkflowGenerationResource,
  WorkflowGroupResource,
  WorkflowRepairResource,
  WorkflowResource,
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

    if (body !== undefined) {
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
    params: Record<string, string | number | undefined>,
  ): string {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) qs.set(key, String(value));
    }
    const query = qs.toString();
    return query ? `${basePath}?${query}` : basePath;
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

  // ── Polling ────────────────────────────────────────────────

  async pollWorkflowExecution(
    workflowId: string,
    executionId: string,
    options: PollOptions,
  ): Promise<WorkflowExecutionResource> {
    const { timeoutMs, pollIntervalMs, onPoll } = options;
    const startTime = Date.now();

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));

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

      await sleep(pollIntervalMs);
    }
  }
}
