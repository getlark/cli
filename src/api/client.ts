import type { Config } from "../config.js";
import type {
  ListWorkflowExecutionsResponse,
  ListWorkflowsResponse,
  WorkflowExecutionResource,
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

export class LarkCIClient {
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
        `Could not connect to ${this.baseUrl} (${cause}). Is the API running? Check your LARKCI_API_URL setting.`,
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

    return (await response.json()) as T;
  }

  async createWorkflow(options: {
    name: string;
    description: string;
    secret_contexts?: string[];
    mode?: "ai_driven" | "deterministic";
  }): Promise<WorkflowResource> {
    return this.request<WorkflowResource>("POST", "/workflows", options);
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
  }): Promise<ListWorkflowsResponse> {
    const params = new URLSearchParams();
    if (options?.limit !== undefined)
      params.set("limit", String(options.limit));
    if (options?.offset !== undefined)
      params.set("offset", String(options.offset));
    const query = params.toString();
    const path = query ? `/workflows?${query}` : "/workflows";
    return this.request<ListWorkflowsResponse>("GET", path);
  }

  async listWorkflowExecutions(
    workflowId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<ListWorkflowExecutionsResponse> {
    const params = new URLSearchParams();
    if (options?.limit !== undefined)
      params.set("limit", String(options.limit));
    if (options?.offset !== undefined)
      params.set("offset", String(options.offset));
    const query = params.toString();
    const path = query
      ? `/workflows/${workflowId}/executions?${query}`
      : `/workflows/${workflowId}/executions`;
    return this.request<ListWorkflowExecutionsResponse>("GET", path);
  }

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
