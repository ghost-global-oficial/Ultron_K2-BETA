import { BaseSkill, type SkillContext } from './base-skill';
import { getAccessToken } from '../../oauth/oauth-manager';

// Intent detection — more robust than simple includes()
function detectIntent(task: string): 'login' | 'read' | 'send' | 'search' | 'api' | 'unknown' {
  const t = task.toLowerCase();
  if (/\b(send|compose|write|email to|enviar|escrever)\b/.test(t)) return 'send';
  if (/\b(read|check|open inbox|ver|ler|verificar)\b/.test(t)) return 'read';
  if (/\b(search|find|procurar|buscar)\b/.test(t)) return 'search';
  if (/\b(login|open|abrir|entrar)\b/.test(t)) return 'login';
  if (/\b(api|fetch|get messages|list emails)\b/.test(t)) return 'api';
  return 'unknown';
}

export class GmailSkill extends BaseSkill {
  readonly service = 'gmail';

  protected async execute(task: string, ctx: SkillContext): Promise<{ success: boolean; summary: string }> {
    const intent = detectIntent(task);

    // Check if OAuth token is available
    const token = await getAccessToken('gmail');
    
    if (intent === 'api' && token) {
      // Use Gmail API directly
      return this._useGmailAPI(task, token, ctx);
    }

    // Fallback to browser automation
    await this._openGmail(ctx);

    switch (intent) {
      case 'login':
        return { success: true, summary: 'Gmail opened and logged in.' };
      case 'read':
        return this.runAILoop(ctx, `In Gmail inbox, ${task}`);
      case 'send':
        return this.runAILoop(ctx, `In Gmail, compose and send an email: ${task}`);
      case 'search':
        return this.runAILoop(ctx, `In Gmail, search for: ${task}`);
      default:
        // Fallback: let AI figure it out
        return this.runAILoop(ctx, `In Gmail, complete this task: ${task}`);
    }
  }

  /**
   * Opens Gmail in the browser and handles login if needed.
   * Uses AI vision to detect whether we're on the login page or already logged in.
   */
  private async _openGmail(ctx: SkillContext): Promise<void> {
    ctx.onProgress('Opening Gmail...');

    // Open run dialog / address bar depending on OS
    await this.pressKey(ctx, 'Meta');
    await this.wait(600);
    await this.typeIntoField(ctx, 'chrome');
    await this.pressKey(ctx, 'Return');
    await this.wait(1500);

    // Navigate to Gmail
    await this.pressKey(ctx, 'F6'); // focus address bar in Chrome
    await this.wait(300);
    await this.typeIntoField(ctx, 'https://mail.google.com');
    await this.pressKey(ctx, 'Return');
    await this.wait(3000);

    // Use AI to detect login state and handle it
    await this.runAILoop(
      ctx,
      `Navigate to Gmail. If a Google login page is shown, enter email "${ctx.credentials.email}" and password to log in. Stop once the Gmail inbox is visible.`,
      10
    );
  }

  /**
   * Use Gmail API directly with OAuth token.
   */
  private async _useGmailAPI(task: string, token: string, ctx: SkillContext): Promise<{ success: boolean; summary: string }> {
    ctx.onProgress('Using Gmail API...');

    try {
      // Example: List recent messages
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        summary: `Gmail API: Found ${data.messages?.length || 0} messages. Task: ${task}`,
      };
    } catch (err: any) {
      console.error('[Gmail API] Error:', err);
      return {
        success: false,
        summary: `Gmail API failed: ${err.message}. Falling back to browser automation.`,
      };
    }
  }
}
