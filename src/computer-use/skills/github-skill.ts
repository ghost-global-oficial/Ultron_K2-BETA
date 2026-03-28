import { BaseSkill, type SkillContext } from './base-skill';

function detectIntent(task: string): 'login' | 'issue' | 'pr' | 'repo' | 'unknown' {
  const t = task.toLowerCase();
  if (/\b(issue|bug|ticket)\b/.test(t)) return 'issue';
  if (/\b(pull request|pr|merge)\b/.test(t)) return 'pr';
  if (/\b(repo|repository|navigate|clone|fork)\b/.test(t)) return 'repo';
  if (/\b(login|open|abrir|entrar)\b/.test(t)) return 'login';
  return 'unknown';
}

export class GitHubSkill extends BaseSkill {
  readonly service = 'github';

  protected async execute(task: string, ctx: SkillContext): Promise<{ success: boolean; summary: string }> {
    const intent = detectIntent(task);

    await this._openGitHub(ctx);

    switch (intent) {
      case 'login':
        return { success: true, summary: 'GitHub opened and logged in.' };
      case 'issue':
        return this.runAILoop(ctx, `On GitHub, create a new issue: ${task}`);
      case 'pr':
        return this.runAILoop(ctx, `On GitHub, create a pull request: ${task}`);
      case 'repo':
        return this.runAILoop(ctx, `On GitHub, navigate or interact with a repository: ${task}`);
      default:
        return this.runAILoop(ctx, `On GitHub, complete this task: ${task}`);
    }
  }

  private async _openGitHub(ctx: SkillContext): Promise<void> {
    ctx.onProgress('Opening GitHub...');

    await this.pressKey(ctx, 'Meta');
    await this.wait(600);
    await this.typeIntoField(ctx, 'chrome');
    await this.pressKey(ctx, 'Return');
    await this.wait(1500);

    await this.pressKey(ctx, 'F6');
    await this.wait(300);
    await this.typeIntoField(ctx, 'https://github.com/login');
    await this.pressKey(ctx, 'Return');
    await this.wait(3000);

    await this.runAILoop(
      ctx,
      `On GitHub login page, enter username/email "${ctx.credentials.email}" and password to log in. Stop once the GitHub dashboard or home feed is visible.`,
      10
    );
  }
}
