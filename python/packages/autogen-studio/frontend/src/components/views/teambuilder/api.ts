import { Team, Graph, Group, TestCase, TestExecutionResult, Component, ComponentConfig } from "../../types/datamodel";
import { BaseAPI } from "../../utils/baseapi";
import { getServerUrl } from "../../utils/utils";

interface ValidationError {
  field: string;
  error: string;
  suggestion?: string;
}

export interface ValidationResponse {
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ComponentTestResult {
  status: boolean;
  message: string;
  data?: any;
  logs: string[];
}

export class TeamAPI extends BaseAPI {
  async listTeams(userId: string): Promise<Team[]> {
    const response = await fetch(
      `${this.getBaseUrl()}/teams/?user_id=${userId}`,
      {
        headers: this.getHeaders(),
      }
    );
    const data = await response.json();
    if (!data.status) throw new Error(data.message || "Failed to fetch teams");
    return data.data;
  }

  async getTeam(teamId: number, userId: string): Promise<Team> {
    const response = await fetch(
      `${this.getBaseUrl()}/teams/${teamId}?user_id=${userId}`,
      {
        headers: this.getHeaders(),
      }
    );
    const data = await response.json();
    if (!data.status) throw new Error(data.message || "Failed to fetch team");
    return data.data;
  }

  async createTeam(teamData: Partial<Team>, userId: string): Promise<Team> {
    const team = {
      ...teamData,
      user_id: userId,
    };

    const response = await fetch(`${this.getBaseUrl()}/teams/`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(team),
    });
    const data = await response.json();
    if (!data.status) throw new Error(data.message || "Failed to create team");
    return data.data;
  }

  async deleteTeam(teamId: number, userId: string): Promise<void> {
    const response = await fetch(
      `${this.getBaseUrl()}/teams/${teamId}?user_id=${userId}`,
      {
        method: "DELETE",
        headers: this.getHeaders(),
      }
    );
    const data = await response.json();
    if (!data.status) throw new Error(data.message || "Failed to delete team");
  }
}

// move validationapi to its own class

export class ValidationAPI extends BaseAPI {
  async validateComponent(
    component: Component<ComponentConfig>
  ): Promise<ValidationResponse> {
    const response = await fetch(`${this.getBaseUrl()}/validate/`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        component: component,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to validate component");
    }

    return data;
  }

  async testComponent(
    component: Component<ComponentConfig>,
    timeout: number = 60
  ): Promise<ComponentTestResult> {
    const response = await fetch(`${this.getBaseUrl()}/validate/test`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        component: component,
        timeout: timeout,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to test component");
    }

    return data;
  }
}

export const validationAPI = new ValidationAPI();

export const teamAPI = new TeamAPI();

export class GraphAPI extends BaseAPI {
  async listGraphs(userId: string): Promise<Graph[]> {
    const response = await fetch(
      `${this.getBaseUrl()}/graphs/?user_id=${userId}`,
      {
        headers: this.getHeaders(),
      }
    );
    const data = await response.json();
    if (!data.status) throw new Error(data.message || "Failed to fetch graphs");
    return data.data;
  }

  async getGraph(graphId: number, userId: string): Promise<Graph> {
    const response = await fetch(
      `${this.getBaseUrl()}/graphs/${graphId}?user_id=${userId}`,
      {
        headers: this.getHeaders(),
      }
    );
    const data = await response.json();
    if (!data.status) throw new Error(data.message || "Failed to fetch graph");
    return data.data;
  }

  async createGraph(graphData: Partial<Graph>, userId: string): Promise<Graph> {
    const graph = {
      ...graphData,
      user_id: userId,
    };

    const response = await fetch(`${this.getBaseUrl()}/graphs/`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(graph),
    });
    const data = await response.json();
    if (!data.status) throw new Error(data.message || "Failed to create graph");
    return data.data;
  }

  async deleteGraph(graphId: number, userId: string): Promise<void> {
    const response = await fetch(
      `${this.getBaseUrl()}/graphs/${graphId}?user_id=${userId}`,
      {
        method: "DELETE",
        headers: this.getHeaders(),
      }
    );
    const data = await response.json();
    if (!data.status) throw new Error(data.message || "Failed to delete graph");
  }
}

export const graphAPI = new GraphAPI();

export class GroupAPI extends BaseAPI {
  async listGroups(
    userId: string,
    nodeType?: string,
    search?: string
  ): Promise<Group[]> {
    const params = new URLSearchParams({ user_id: userId });
    if (nodeType) params.append("node_type", nodeType);
    if (search) params.append("search", search);

    const response = await fetch(
      `${this.getBaseUrl()}/groups/?${params.toString()}`,
      {
        headers: this.getHeaders(),
      }
    );
    const data = await response.json();
    if (!data.status) throw new Error(data.message || "Failed to fetch groups");
    return data.data;
  }

  async getGroup(groupId: number, userId: string): Promise<Group> {
    const response = await fetch(
      `${this.getBaseUrl()}/groups/${groupId}?user_id=${userId}`,
      {
        headers: this.getHeaders(),
      }
    );
    const data = await response.json();
    if (!data.status) throw new Error(data.message || "Failed to fetch group");
    return data.data;
  }

  async createGroup(groupData: Partial<Group>, userId: string): Promise<Group> {
    const group = {
      ...groupData,
      user_id: userId,
    };

    const response = await fetch(`${this.getBaseUrl()}/groups/`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(group),
    });
    const data = await response.json();
    if (!data.status) throw new Error(data.message || "Failed to create group");
    return data.data;
  }

  async updateGroup(
    groupId: number,
    groupData: Partial<Group>,
    userId: string
  ): Promise<Group> {
    const response = await fetch(`${this.getBaseUrl()}/groups/${groupId}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(groupData),
    });
    const data = await response.json();
    if (!data.status) throw new Error(data.message || "Failed to update group");
    return data.data;
  }

  async deleteGroup(groupId: number, userId: string): Promise<void> {
    const response = await fetch(
      `${this.getBaseUrl()}/groups/${groupId}?user_id=${userId}`,
      {
        method: "DELETE",
        headers: this.getHeaders(),
      }
    );
    const data = await response.json();
    if (!data.status) throw new Error(data.message || "Failed to delete group");
  }
}

export class TestCaseAPI extends BaseAPI {
  async listTestCases(
    userId: string,
    groupId?: number,
    graphId?: number
  ): Promise<TestCase[]> {
    const params = new URLSearchParams({ user_id: userId });
    if (groupId) params.append("group_id", groupId.toString());
    if (graphId) params.append("graph_id", graphId.toString());

    const response = await fetch(
      `${this.getBaseUrl()}/test-cases/?${params.toString()}`,
      {
        headers: this.getHeaders(),
      }
    );
    const data = await response.json();
    if (!data.status) throw new Error(data.message || "Failed to fetch test cases");
    return data.data;
  }

  async getTestCase(testCaseId: number, userId: string): Promise<TestCase> {
    const response = await fetch(
      `${this.getBaseUrl()}/test-cases/${testCaseId}?user_id=${userId}`,
      {
        headers: this.getHeaders(),
      }
    );
    const data = await response.json();
    if (!data.status) throw new Error(data.message || "Failed to fetch test case");
    return data.data;
  }

  async createTestCase(testCaseData: Partial<TestCase>, userId: string): Promise<TestCase> {
    const testCase = {
      ...testCaseData,
      user_id: userId,
    };

    const response = await fetch(`${this.getBaseUrl()}/test-cases/`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(testCase),
    });
    const data = await response.json();
    if (!data.status) throw new Error(data.message || "Failed to create test case");
    return data.data;
  }

  async updateTestCase(
    testCaseId: number,
    testCaseData: Partial<TestCase>
  ): Promise<TestCase> {
    const response = await fetch(`${this.getBaseUrl()}/test-cases/${testCaseId}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(testCaseData),
    });
    const data = await response.json();
    if (!data.status) throw new Error(data.message || "Failed to update test case");
    return data.data;
  }

  async deleteTestCase(testCaseId: number, userId: string): Promise<void> {
    const response = await fetch(
      `${this.getBaseUrl()}/test-cases/${testCaseId}?user_id=${userId}`,
      {
        method: "DELETE",
        headers: this.getHeaders(),
      }
    );
    const data = await response.json();
    if (!data.status) throw new Error(data.message || "Failed to delete test case");
  }

  async executeTestCase(
    testCaseId: number,
    timeout?: number,
    judgeOverrides?: Record<string, any>
  ): Promise<TestExecutionResult> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/test-cases/${testCaseId}/execute`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({ timeout, judge_overrides: judgeOverrides }),
        }
      );

      // Handle HTTP error responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        
        // Create a specific error type based on status code
        const error = new Error(errorMessage) as any;
        error.status = response.status;
        error.statusText = response.statusText;
        
        // Add more context for specific error types
        switch (response.status) {
          case 400:
            error.type = "VALIDATION_ERROR";
            error.userMessage = "Test case configuration is invalid. Please check required fields.";
            break;
          case 404:
            error.type = "NOT_FOUND_ERROR";
            error.userMessage = "Test case not found. It may have been deleted.";
            break;
          case 408:
            error.type = "TIMEOUT_ERROR";
            error.userMessage = "Test case execution timed out. Consider increasing the timeout or simplifying the test.";
            break;
          case 500:
            error.type = "EXECUTION_ERROR";
            error.userMessage = "Test case execution failed. Check the logs for details.";
            break;
          default:
            error.type = "UNKNOWN_ERROR";
            error.userMessage = "An unexpected error occurred during test case execution.";
        }
        
        throw error;
      }

      const data = await response.json();
      
      // Handle API-level errors (when response is 200 but status is false)
      if (!data.status) {
        const error = new Error(data.message || "Failed to execute test case") as any;
        error.type = "API_ERROR";
        error.userMessage = "Test case execution failed due to an API error.";
        throw error;
      }
      
      return data.data;
      
    } catch (error: unknown) {
      // Handle network errors, JSON parsing errors, etc.
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError = new Error("Network error: Unable to connect to the server") as any;
        networkError.type = "NETWORK_ERROR";
        networkError.userMessage = "Cannot connect to the server. Please check your internet connection.";
        throw networkError;
      }
      
      // Re-throw errors that we've already processed
      if (error && typeof error === 'object' && 'type' in error) {
        throw error;
      }
      
      // Handle any other unexpected errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      const unexpectedError = new Error(`Unexpected error: ${errorMessage}`) as any;
      unexpectedError.type = "UNEXPECTED_ERROR";
      unexpectedError.userMessage = "An unexpected error occurred. Please try again.";
      unexpectedError.originalError = error;
      throw unexpectedError;
    }
  }
}

export const groupAPI = new GroupAPI();
export const testCaseAPI = new TestCaseAPI();
