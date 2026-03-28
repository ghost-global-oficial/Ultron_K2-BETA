import type { Action, ActionResult } from '../input-controller';
import type { CaptureResult } from '../screen-capture';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface SkillContext {
  capture: () => Promise<CaptureResult>;
  execute: (action: Action) => Promise<ActionResult>;
  credentials: { email: string; password: string; extra?: Record<string, string> };
  onProgress: (message: string) => void;
  signal?: AbortSignal;
}

export interface IComputerUseSkill {
  readonly service: string;
  run(task: string, ctx: SkillContext): Promise<{ success: boolean; summary: string }>;
}

// ─── AI config read from localStorage (renderer context) ─────────────────────

export interface AIConfig {
  provider: 'gemini' | 'openai';
  model: string;
  apiKey: string;
  baseUrl?: string;
}

function getAIConfig(): AIConfig {
  try {
    const provider = (localStorage.getItem('aiProvider') as 'gemini' | 'openai') || 'gemini';
    if (provider === 'gemini') {
      return {
        provider: 'gemini',
        model: localStorage.getItem('geminiModel') || 'gemini-2.0-flash',
        apiKey: localStorage.getItem('geminiApiKey') || '',
      };
    }
    return {
      provider: 'openai',
      model: localStorage.getItem('openaiModel') || 'gpt-4o',
      apiKey: localStorage.getItem('openaiApiKey') || '',
      baseUrl: localStorage.getItem('openaiBaseUrl') || 'https://api.openai.com/v1',
    };
  } catch {
    return { provider: 'gemini', model: 'gemini-2.0-flash', apiKey: '' };
  }
}

// ─── AI Vision helper ─────────────────────────────────────────────────────────

export interface VisionResult {
  action: Action | null;   // null = task complete
  reasoning: string;
  done: boolean;
}

/**
 * Sends a screenshot + task description to the configured AI and asks it
 * what the next UI action should be.
 */
export async function askAIForNextAction(
  screenshot: Buffer,
  task: string,
  history: string[],
  service: string
): Promise<VisionResult> {
  const cfg = getAIConfig();
  if (!cfg.apiKey) {
    return { action: null, done: true, reasoning: 'No AI API key configured.' };
  }

  const historyText = history.length
    ? `\nActions taken so far:\n${history.map((h, i) => `${i + 1}. ${h}`).join('\n')}`
    : '';

  const systemPrompt = `You are a computer automation agent controlling a desktop via mouse and keyboard.
You receive a screenshot (base64 PNG) and must decide the SINGLE next action to complete the task.

CRITICAL: Avoid loops! If you see the same UI state as before, DO NOT repeat the same action.
If an action didn't work (UI didn't change), try a different approach or mark the task as done with an explanation.

Respond ONLY with valid JSON in this exact format:
{
  "done": false,
  "reasoning": "brief explanation of what you see and why you're taking this action",
  "action": { "type": "click", "x": 123, "y": 456, "button": "left" }
}

OR if the task is complete OR you're stuck in a loop:
{
  "done": true,
  "reasoning": "task completed because... OR cannot proceed because...",
  "action": null
}

Action types available:
- { "type": "move", "x": number, "y": number }
- { "type": "click", "x": number, "y": number, "button": "left"|"right", "double": boolean }
- { "type": "type", "text": string }
- { "type": "key", "key": string }
- { "type": "scroll", "direction": "up"|"down", "amount": number }

Valid key names for "key" action:
- Letters: "a" to "z" (lowercase)
- Numbers: "0" to "9"
- Special: "Enter", "Tab", "Space", "Backspace", "Delete", "Escape"
- Arrows: "Up", "Down", "Left", "Right"
- Modifiers: "Shift", "Control", "Alt", "Command"
- Function: "F1" to "F12"
- Navigation: "Home", "End", "PageUp", "PageDown"

Examples:
- Press Enter: { "type": "key", "key": "Enter" }
- Press Tab: { "type": "key", "key": "Tab" }
- Press Escape to close menu: { "type": "key", "key": "Escape" }
- Type text: { "type": "type", "text": "hello@example.com" }

Rules:
- Look at the screenshot carefully before deciding
- Compare with previous actions in history - if you already tried something and it didn't work, try something else
- If you see the Windows Start Menu is open and you don't need it, press Escape to close it
- If you accidentally opened a menu, press Escape to close it before proceeding
- If you're clicking the same spot repeatedly with no effect, STOP and mark done with explanation
- For click actions, always include x and y coordinates based on what you see
- Use "type" for entering text, use "key" for special keys like Enter, Tab, Escape, etc.
- If a login form is visible and credentials are needed, use type actions
- If the task is already done (success state visible), set done: true
- If you cannot proceed or are stuck, set done: true with explanation
- Service context: ${service}`;

  const userContent = `Task: ${task}${historyText}\n\nWhat is the next action?`;

  try {
    let responseText = '';

    if (cfg.provider === 'gemini') {
      const b64 = screenshot.toString('base64');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${cfg.apiKey}`;
      const body = {
        contents: [{
          role: 'user',
          parts: [
            { text: systemPrompt + '\n\n' + userContent },
            { inline_data: { mime_type: 'image/png', data: b64 } }
          ]
        }]
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    } else {
      const b64 = screenshot.toString('base64');
      const url = `${cfg.baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
      const body = {
        model: cfg.model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userContent },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 512,
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      responseText = data?.choices?.[0]?.message?.content ?? '';
    }

    // Extract JSON from response (may be wrapped in markdown code block)
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) || responseText.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
    const parsed = JSON.parse(jsonStr.trim());

    return {
      done: !!parsed.done,
      reasoning: parsed.reasoning ?? '',
      action: parsed.action ?? null,
    };
  } catch (err: any) {
    return { action: null, done: true, reasoning: `AI error: ${err?.message ?? String(err)}` };
  }
}

// ─── BaseSkill ────────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1_000;
const MAX_AI_STEPS = 20;

export abstract class BaseSkill implements IComputerUseSkill {
  abstract readonly service: string;

  async run(task: string, ctx: SkillContext): Promise<{ success: boolean; summary: string }> {
    let lastError = '';
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      // Check abort signal before each attempt
      if (ctx.signal?.aborted) {
        return { success: false, summary: 'Skill aborted by user.' };
      }
      try {
        ctx.onProgress(`[${this.service}] Attempt ${attempt}/${MAX_RETRIES}: ${task}`);
        const result = await this.execute(task, ctx);
        return result;
      } catch (err: any) {
        if (ctx.signal?.aborted) {
          return { success: false, summary: 'Skill aborted by user.' };
        }
        lastError = err?.message ?? String(err);
        ctx.onProgress(`[${this.service}] Attempt ${attempt} failed: ${lastError}`);
        if (attempt < MAX_RETRIES) {
          try { await ctx.capture(); } catch {}
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }
    return {
      success: false,
      summary: `Failed after ${MAX_RETRIES} attempts. Last error: ${lastError}`,
    };
  }

  protected abstract execute(task: string, ctx: SkillContext): Promise<{ success: boolean; summary: string }>;

  /**
   * AI-driven vision loop: captures screen, asks AI for next action, executes it.
   * Repeats until AI says done or MAX_AI_STEPS is reached.
   */
  protected async runAILoop(
    ctx: SkillContext,
    task: string,
    maxSteps: number = MAX_AI_STEPS
  ): Promise<{ success: boolean; summary: string }> {
    const history: string[] = [];
    const actionHistory: string[] = [];
    let repeatedActionCount = 0;
    let lastActionSignature = '';
    let lastScreenshotHash = '';
    let unchangedScreenCount = 0;

    for (let step = 0; step < maxSteps; step++) {
      // Check abort signal at the start of every step
      if (ctx.signal?.aborted) {
        return { success: false, summary: 'AI loop aborted by user.' };
      }

      ctx.onProgress(`[${this.service}] AI step ${step + 1}/${maxSteps}...`);

      const capture = await ctx.capture();
      
      // Create a simple hash of the screenshot to detect if UI changed
      const screenshotHash = this.simpleHash(capture.image);
      
      // Check if screen hasn't changed after an action
      if (step > 0 && screenshotHash === lastScreenshotHash) {
        unchangedScreenCount++;
        if (unchangedScreenCount >= 2) {
          ctx.onProgress(`[${this.service}] ⚠️ UI not responding: screen unchanged after ${unchangedScreenCount} actions. Stopping.`);
          return { 
            success: false, 
            summary: `UI not responding: screen remained the same after multiple actions. The application may be frozen or the action had no effect.` 
          };
        }
      } else {
        unchangedScreenCount = 0;
      }
      lastScreenshotHash = screenshotHash;

      const vision = await askAIForNextAction(capture.image, task, history, this.service);

      ctx.onProgress(`[${this.service}] AI: ${vision.reasoning}`);

      if (vision.done || !vision.action) {
        return { success: true, summary: vision.reasoning || 'Task completed.' };
      }

      const action = vision.action;

      // Create a signature for this action to detect loops
      const actionSignature = `${action.type}:${JSON.stringify(action)}`;
      
      // Detect if we're repeating the same action
      if (actionSignature === lastActionSignature) {
        repeatedActionCount++;
        if (repeatedActionCount >= 2) {
          ctx.onProgress(`[${this.service}] ⚠️ Loop detected: same action repeated ${repeatedActionCount + 1} times. Stopping.`);
          return { 
            success: false, 
            summary: `Loop detected: AI kept repeating the same action (${action.type}). Task may require manual intervention.` 
          };
        }
      } else {
        repeatedActionCount = 0;
      }
      lastActionSignature = actionSignature;

      // Check for oscillating patterns (A -> B -> A -> B)
      if (actionHistory.length >= 4) {
        const last4 = actionHistory.slice(-4);
        if (last4[0] === last4[2] && last4[1] === last4[3]) {
          ctx.onProgress(`[${this.service}] ⚠️ Oscillation detected: AI is toggling between two actions. Stopping.`);
          return { 
            success: false, 
            summary: `Oscillation detected: AI is stuck toggling between two actions. Task may require manual intervention.` 
          };
        }
      }

      actionHistory.push(actionSignature);

      // For click actions that include coordinates, move first then click
      if (action.type === 'click' && (action as any).x !== undefined) {
        await ctx.execute({ type: 'move', x: (action as any).x, y: (action as any).y });
        await this.wait(100);
        await ctx.execute({ type: 'click', button: action.button ?? 'left', double: (action as any).double });
      } else {
        await ctx.execute(action);
      }

      history.push(`${action.type}: ${JSON.stringify(action)}`);
      
      // Wait longer for UI to react, especially after key presses
      const waitTime = action.type === 'key' ? 1200 : 800;
      await this.wait(waitTime);
    }

    return { success: false, summary: `Reached max steps (${maxSteps}) without completing task.` };
  }

  /**
   * Simple hash function for screenshot comparison
   */
  private simpleHash(buffer: Buffer): string {
    let hash = 0;
    // Sample every 1000th byte for performance
    for (let i = 0; i < buffer.length; i += 1000) {
      hash = ((hash << 5) - hash) + buffer[i];
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  protected async typeIntoField(ctx: SkillContext, text: string): Promise<void> {
    await ctx.execute({ type: 'type', text });
  }

  protected async pressKey(ctx: SkillContext, key: string): Promise<void> {
    await ctx.execute({ type: 'key', key });
  }

  protected async clickAt(ctx: SkillContext, x: number, y: number): Promise<void> {
    await ctx.execute({ type: 'move', x, y });
    await ctx.execute({ type: 'click', button: 'left' });
  }

  protected wait(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
