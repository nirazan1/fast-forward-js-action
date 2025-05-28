import { GitHubClient } from './github_client_interface';
import { context, getOctokit } from '@actions/github';

export class GitHubClientWrapper implements GitHubClient {
  private octokit;
  private owner: string;
  private repo: string;

  constructor(githubToken: string) {
    this.octokit = getOctokit(githubToken);
    this.owner = context.repo.owner;
    this.repo = context.repo.repo;
  }

  async get_current_pull_request_number(): Promise<number> {
    // Check if the comment is on a PR
    if (!context.payload.issue?.pull_request) {
      throw new Error('No pull request in context');
    }
    return context.payload.issue.number;
  }

  async get_pull_request_source_head_async(prNumber: number): Promise<string> {
    const pr = await this.get_pull_request(prNumber);
    return pr.head.ref;
  }

  async get_pull_request_target_base_async(prNumber: number): Promise<string> {
    const pr = await this.get_pull_request(prNumber);
    return pr.base.ref;
  }

  async comment_on_pull_request_async(prNumber: number, message: string): Promise<void> {
    await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
      body: message,
    });
  }

  async list_team_members(org: string, team_slug: string): Promise<string[]> {
    const response = await this.octokit.rest.teams.listMembersInOrg({ org, team_slug });
    return response.data.map(member => member.login);
  }

  async list_pull_request_approvers(prNumber: number): Promise<string[]> {
    const response = await this.octokit.rest.pulls.listReviews({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });
    return response.data
      .filter(r => r.state === 'APPROVED')
      .map(r => r.user?.login)
      .filter((l): l is string => !!l);
  }

  async get_pull_request_labels(prNumber: number): Promise<string[]> {
    const response = await this.octokit.rest.issues.listLabelsOnIssue({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
    });
    return response.data.map(label => label.name);
  }

  async set_pull_request_status(prNumber: number, status: 'success' | 'failure'): Promise<void> {
    const pr = await this.get_pull_request(prNumber);
    await this.octokit.rest.repos.createCommitStatus({
      owner: this.owner,
      repo: this.repo,
      sha: pr.head.sha,
      state: status,
      description: `Fast-forward status: ${status}`,
      context: 'fast-forward-check',
    });
  }

  async fast_forward_target_to_source_async(prNumber: number): Promise<void> {
    const pr = await this.get_pull_request(prNumber);
    const base = pr.base.ref;
    const head = pr.head.ref;

    await this.octokit.rest.git.updateRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${base}`,
      sha: pr.head.sha,
      force: false,
    });
  }

  async compate_branch_head(branch1: string, branch2: string): Promise<boolean> {
    const compare = await this.octokit.rest.repos.compareCommits({
      owner: this.owner,
      repo: this.repo,
      base: branch1,
      head: branch2,
    });
    return compare.data.status === 'identical';
  }

  private async get_pull_request(prNumber: number) {
    const response = await this.octokit.rest.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });
    return response.data;
  }
}
