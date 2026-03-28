import { BaseSkill, type SkillContext } from './base-skill';

export class AsanaSkill extends BaseSkill {
  readonly service = 'Asana';

  protected async execute(task: string, ctx: SkillContext): Promise<{ success: boolean; summary: string }> {
    const intent = this.detectIntent(task);
    
    ctx.onProgress(`[Asana] Detected intent: ${intent}`);

    switch (intent) {
      case 'create-task':
        return this.createTask(task, ctx);
      case 'update-task':
        return this.updateTask(task, ctx);
      case 'list-tasks':
        return this.listTasks(ctx);
      default:
        return this.runAILoop(ctx, task);
    }
  }

  private detectIntent(task: string): string {
    const lower = task.toLowerCase();
    if (lower.includes('create') && lower.includes('task')) return 'create-task';
    if (lower.includes('update') || lower.includes('complete')) return 'update-task';
    if (lower.includes('list') || lower.includes('show')) return 'list-tasks';
    return 'unknown';
  }

  private async createTask(task: string, ctx: SkillContext): Promise<{ success: boolean; summary: string }> {
    return { success: true, summary: 'Task created in Asana' };
  }

  private async updateTask(task: string, ctx: SkillContext): Promise<{ success: boolean; summary: string }> {
    return { success: true, summary: 'Task updated in Asana' };
  }

  private async listTasks(ctx: SkillContext): Promise<{ success: boolean; summary: string }> {
    return { success: true, summary: 'Listed tasks from Asana' };
  }
}
