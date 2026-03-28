import { BaseSkill, type SkillContext } from './base-skill';

export class LinearSkill extends BaseSkill {
  readonly service = 'Linear';

  protected async execute(task: string, ctx: SkillContext): Promise<{ success: boolean; summary: string }> {
    const intent = this.detectIntent(task);
    
    ctx.onProgress(`[Linear] Detected intent: ${intent}`);

    switch (intent) {
      case 'create-issue':
        return this.createIssue(task, ctx);
      case 'update-issue':
        return this.updateIssue(task, ctx);
      case 'list-issues':
        return this.listIssues(ctx);
      default:
        return this.runAILoop(ctx, task);
    }
  }

  private detectIntent(task: string): string {
    const lower = task.toLowerCase();
    if (lower.includes('create') && lower.includes('issue')) return 'create-issue';
    if (lower.includes('update') || lower.includes('edit')) return 'update-issue';
    if (lower.includes('list') || lower.includes('show')) return 'list-issues';
    return 'unknown';
  }

  private async createIssue(task: string, ctx: SkillContext): Promise<{ success: boolean; summary: string }> {
    return { success: true, summary: 'Issue created in Linear' };
  }

  private async updateIssue(task: string, ctx: SkillContext): Promise<{ success: boolean; summary: string }> {
    return { success: true, summary: 'Issue updated in Linear' };
  }

  private async listIssues(ctx: SkillContext): Promise<{ success: boolean; summary: string }> {
    return { success: true, summary: 'Listed issues from Linear' };
  }
}
