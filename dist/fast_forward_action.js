"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FastForwardAction = void 0;
class FastForwardAction {
    constructor(client) {
        this.client = client;
    }
    async async_merge_fast_forward(set_status) {
        const pr_number = await this.client.get_current_pull_request_number();
        try {
            await this.client.fast_forward_target_to_source_async(pr_number);
            if (set_status) {
                await this.client.set_pull_request_status(pr_number, "success");
            }
            return true;
        }
        catch (error) {
            console.error(error);
            if (set_status) {
                await this.client.set_pull_request_status(pr_number, "failure");
            }
            return false;
        }
    }
    async async_comment_on_pr(comment_message, ff_status, prod_branch, stage_branch, custom_reason) {
        const pr_number = await this.client.get_current_pull_request_number();
        const source_head = await this.client.get_pull_request_source_head_async(pr_number);
        const target_base = await this.client.get_pull_request_target_base_async(pr_number);
        let message = '';
        if (custom_reason === 'missing_approval' && comment_message.failure_message_needs_approval) {
            message = comment_message.failure_message_needs_approval;
        }
        else if (ff_status) {
            message = comment_message.success_message;
        }
        else {
            const same = await this.client.compate_branch_head(prod_branch, stage_branch);
            message = same
                ? comment_message.failure_message_same_stage_and_prod
                : comment_message.failure_message_diff_stage_and_prod;
        }
        const final = this.insert_branch_names(message, source_head, target_base, prod_branch, stage_branch);
        await this.client.comment_on_pull_request_async(pr_number, final);
    }
    insert_branch_names(msg, source, target, prod, stage) {
        return msg
            .replace(/source_head/g, source)
            .replace(/target_base/g, target)
            .replace(/prod_branch/g, prod)
            .replace(/stage_branch/g, stage);
    }
}
exports.FastForwardAction = FastForwardAction;
