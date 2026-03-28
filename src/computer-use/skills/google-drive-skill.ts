import { BaseSkill, type SkillContext } from './base-skill';

function detectIntent(task: string): 'login' | 'upload' | 'download' | 'organize' | 'search' | 'unknown' {
  const t = task.toLowerCase();
  if (/\b(upload|enviar|carregar)\b/.test(t)) return 'upload';
  if (/\b(download|baixar|descarregar)\b/.test(t)) return 'download';
  if (/\b(move|organiz|mover|pasta|folder)\b/.test(t)) return 'organize';
  if (/\b(search|find|procurar|buscar)\b/.test(t)) return 'search';
  if (/\b(login|open|abrir|entrar)\b/.test(t)) return 'login';
  return 'unknown';
}

export class GoogleDriveSkill extends BaseSkill {
  readonly service = 'google-drive';

  protected async execute(task: string, ctx: SkillContext): Promise<{ success: boolean; summary: string }> {
    const intent = detectIntent(task);

    await this._openDrive(ctx);

    switch (intent) {
      case 'login':
        return { success: true, summary: 'Google Drive opened and logged in.' };
      case 'upload':
        return this.runAILoop(ctx, `In Google Drive, upload a file: ${task}`);
      case 'download':
        return this.runAILoop(ctx, `In Google Drive, download a file: ${task}`);
      case 'organize':
        return this.runAILoop(ctx, `In Google Drive, organize files or folders: ${task}`);
      case 'search':
        return this.runAILoop(ctx, `In Google Drive, search for a file: ${task}`);
      default:
        return this.runAILoop(ctx, `In Google Drive, complete this task: ${task}`);
    }
  }

  private async _openDrive(ctx: SkillContext): Promise<void> {
    ctx.onProgress('Opening Google Drive...');

    await this.pressKey(ctx, 'Meta');
    await this.wait(600);
    await this.typeIntoField(ctx, 'chrome');
    await this.pressKey(ctx, 'Return');
    await this.wait(1500);

    await this.pressKey(ctx, 'F6');
    await this.wait(300);
    await this.typeIntoField(ctx, 'https://drive.google.com');
    await this.pressKey(ctx, 'Return');
    await this.wait(3000);

    await this.runAILoop(
      ctx,
      `Navigate to Google Drive. If a Google login page is shown, enter email "${ctx.credentials.email}" and password to log in. Stop once Google Drive is fully loaded and visible.`,
      10
    );
  }
}
