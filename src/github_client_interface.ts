export interface GitHubClient {
  get_current_pull_request_number(): Promise<number>;
  get_pull_request_source_head_async(pr_number: number): Promise<string>;
  get_pull_request_target_base_async(pr_number: number): Promise<string>;
  comment_on_pull_request_async(pr_number: number, message: string): Promise<void>;
  list_team_members(org: string, team_slug: string): Promise<string[]>;
  list_pull_request_approvers(pr_number: number): Promise<string[]>;
  get_pull_request_labels(pr_number: number): Promise<string[]>;
  set_pull_request_status(pr_number: number, status: "success" | "failure"): Promise<void>;
  fast_forward_target_to_source_async(pr_number: number): Promise<void>;
  compate_branch_head(branch1: string, branch2: string): Promise<boolean>;
}