import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHubClientWrapper } from './github_client_wrapper';
import { FastForwardAction } from './fast_forward_action';

async function run(): Promise<void> {
  try {
    const github_token = core.getInput('GITHUB_TOKEN');
    const octokit = github.getOctokit(github_token);
    const context = github.context;
    const client = new GitHubClientWrapper(github_token);
    const fastForward = new FastForwardAction(client);

    const success_message = core.getInput('success_message') || "Fast-forward Succeeded!";
    const failure_message = core.getInput('failure_message') || "Fast-forward Failed!";
    const failure_message_same_stage_and_prod = core.getInput('failure_message_same_stage_and_prod') || failure_message;
    const failure_message_diff_stage_and_prod = core.getInput('failure_message_diff_stage_and_prod') || failure_message;

    const comment_messages = {
      success_message,
      failure_message,
      failure_message_same_stage_and_prod,
      failure_message_diff_stage_and_prod,
      failure_message_needs_approval: "Fast-forward blocked: PR to '***target_base***' must be approved by at least one 'release-committee' member."
    };

    const update_status = core.getInput('update_status') === 'true';
    const prod_branch = core.getInput('production_branch') || 'master';
    const stage_branch = core.getInput('staging_branch') || 'staging';

    const { issue, repository } = context.payload;
    if (!issue?.pull_request) {
      core.info('Not a pull request comment. Skipping...');
      return;
    }

    const { owner, repo } = context.repo;
    const pr_number = issue.number;

    const pull = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pr_number
    });

    const base_branch = pull.data.base.ref;
    const needs_release_approval = ['master', 'main', 'develop'].includes(base_branch);

    if (needs_release_approval) {
      const approvers = await client.list_pull_request_approvers(pr_number);
      const teamMembers = await client.list_team_members(owner, 'release-committee');

      const isApprovedByTeam = approvers.some(a => teamMembers.includes(a));
      core.info(`Base branch is '${base_branch}', which requires release-committee approval.`);
      core.info(`Approved by release-committee member? ${isApprovedByTeam}`);

      if (!isApprovedByTeam) {
        core.setFailed(`Fast-forward blocked: PR to '${base_branch}' must be approved by at least one 'release-committee' member.`);
        await fastForward.async_comment_on_pr(comment_messages, false, prod_branch, stage_branch, 'missing_approval');
        return;
      }
    } else {
      core.info(`Base branch is '${base_branch}', no special approval required.`);
    }

    const ff_status = await fastForward.async_merge_fast_forward(update_status);
    await fastForward.async_comment_on_pr(comment_messages, ff_status, prod_branch, stage_branch);
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : JSON.stringify(error));
  }
}

run();
