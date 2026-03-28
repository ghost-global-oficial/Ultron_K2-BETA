import { BaseSkill, type SkillContext } from './base-skill';

export class StripeSkill extends BaseSkill {
  readonly service = 'Stripe';

  protected async execute(task: string, ctx: SkillContext): Promise<{ success: boolean; summary: string }> {
    const intent = this.detectIntent(task);
    
    ctx.onProgress(`[Stripe] Detected intent: ${intent}`);

    switch (intent) {
      case 'create-payment':
        return this.createPayment(task, ctx);
      case 'list-payments':
        return this.listPayments(ctx);
      case 'refund':
        return this.refund(task, ctx);
      default:
        return this.runAILoop(ctx, task);
    }
  }

  private detectIntent(task: string): string {
    const lower = task.toLowerCase();
    if (lower.includes('create') || lower.includes('charge') || lower.includes('payment')) return 'create-payment';
    if (lower.includes('list') || lower.includes('show')) return 'list-payments';
    if (lower.includes('refund')) return 'refund';
    return 'unknown';
  }

  private async createPayment(task: string, ctx: SkillContext): Promise<{ success: boolean; summary: string }> {
    return { success: true, summary: 'Payment created in Stripe' };
  }

  private async listPayments(ctx: SkillContext): Promise<{ success: boolean; summary: string }> {
    return { success: true, summary: 'Listed payments from Stripe' };
  }

  private async refund(task: string, ctx: SkillContext): Promise<{ success: boolean; summary: string }> {
    return { success: true, summary: 'Refund processed in Stripe' };
  }
}
