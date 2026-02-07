import type { Config } from "../config.js";
import type { WorkflowExecutionResource } from "./types.js";

export class LarkCIClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: Config) {
    this.baseUrl = config.apiUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
  }

  private async request<T>(method: string, path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          "X-API-Key": this.apiKey,
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      const cause =
        err instanceof TypeError && err.cause instanceof Error
          ? err.cause.message
          : err instanceof Error
            ? err.message
            : String(err);
      throw new Error(
        `Could not connect to ${this.baseUrl} (${cause}). Is the API running? Check your LARKCI_API_URL setting.`
      );
    }

    if (!response.ok) {
      let message = `HTTP ${response.status} ${response.statusText}`;
      try {
        const body = (await response.json()) as Record<string, unknown>;
        if (typeof body.detail === "string") {
          message = `${message}: ${body.detail}`;
        }
      } catch {
        // response body was not JSON, use the default message
      }
      throw new Error(message);
    }

    return (await response.json()) as T;
  }

  async invokeWorkflow(
    workflowId: string
  ): Promise<WorkflowExecutionResource> {
    return this.request<WorkflowExecutionResource>(
      "POST",
      `/workflows/${workflowId}/invoke`
    );
  }

  async getWorkflowExecution(
    workflowId: string,
    executionId: string
  ): Promise<WorkflowExecutionResource> {
    return this.request<WorkflowExecutionResource>(
      "GET",
      `/workflows/${workflowId}/executions/${executionId}`
    );
  }
}
