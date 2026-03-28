/**
 * ULTRON Skill Runner
 * ─────────────────────────────────────────────────────────────────────────────
 * Constrói o SkillContext usando o bridge WebSocket e invoca a skill correta
 * com base no serviço pedido. Corre no renderer (frontend).
 */

import { bridgeClient } from '../bridge-client';
import { GmailSkill } from './skills/gmail-skill';
import { GitHubSkill } from './skills/github-skill';
import { GoogleDriveSkill } from './skills/google-drive-skill';
import type { IComputerUseSkill, SkillContext } from './skills/base-skill';

// ─── Registo de skills ────────────────────────────────────────────────────────

const SKILLS: IComputerUseSkill[] = [
  new GmailSkill(),
  new GitHubSkill(),
  new GoogleDriveSkill(),
];

// Palavras-chave para detetar qual skill usar a partir do texto da tarefa
// NOTA: Só ativa skill se a tarefa for EXPLICITAMENTE sobre o serviço (não apenas mencionar)
const SERVICE_KEYWORDS: Record<string, string[]> = {
  gmail:        ['gmail', 'e-mail', 'correio', 'inbox'],
  github:       ['github.com', 'abrir github', 'open github', 'ir ao github', 'go to github'],
  'google-drive': ['google drive', 'gdrive'],
};

export function detectService(task: string): string | null {
  const t = task.toLowerCase();
  for (const [service, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    if (keywords.some(kw => t.includes(kw))) return service;
  }
  return null;
}

export function getSkill(service: string): IComputerUseSkill | null {
  return SKILLS.find(s => s.service === service) ?? null;
}

// ─── Construir SkillContext ───────────────────────────────────────────────────

async function getCredentials(service: string): Promise<{ email: string; password: string; extra?: Record<string, string> }> {
  // Tentar obter credenciais via IPC (Electron) ou retornar vazias
  const w = window as any;
  if (typeof w.computerUse?.listServicesDisplay === 'function') {
    // Credenciais reais só estão disponíveis no main process — o renderer não tem acesso
    // O SkillContext recebe credenciais vazias; a skill usa AI vision para fazer login
    // se as credenciais estiverem guardadas no CredentialStore do main process,
    // o SessionManager injeta-as automaticamente via IPC
  }
  // Retornar placeholder — a skill usa AI vision para detetar e preencher login
  return { email: '', password: '' };
}

function buildSkillContext(
  onProgress: (msg: string) => void,
  signal?: AbortSignal
): SkillContext {
  return {
    // Captura de ecrã via IPC (Electron) ou placeholder
    capture: async () => {
      const w = window as any;
      if (typeof w.computerUse?.captureScreen === 'function') {
        const result = await w.computerUse.captureScreen();
        if (result?.success && result.image) {
          return {
            image: Buffer.from(result.image, 'base64'),
            metadata: result.metadata ?? { width: 1920, height: 1080, monitorIndex: 0 },
          };
        }
      }
      // Fallback: imagem vazia (AI não terá visão mas pode tentar)
      return {
        image: Buffer.alloc(0),
        metadata: { width: 1920, height: 1080, monitorIndex: 0 },
      };
    },

    // Execução de ações via bridge WebSocket — sempre
    execute: async (action) => {
      if (bridgeClient.isReady) {
        return bridgeClient.executeAction(action);
      }
      // Bridge não disponível — tentar reconectar e aguardar
      await bridgeClient.connect();
      if (bridgeClient.isReady) {
        return bridgeClient.executeAction(action);
      }
      // Último recurso: HTTP
      const res = await fetch('/api/computer-use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      return res.json();
    },

    credentials: { email: '', password: '' },
    onProgress,
    signal,
  };
}

// ─── API pública ──────────────────────────────────────────────────────────────

export interface SkillRunResult {
  success: boolean;
  summary: string;
  service: string;
}

/**
 * Tenta correr uma skill para a tarefa dada.
 * Retorna null se nenhuma skill for detetada para a tarefa.
 */
export async function runSkillForTask(
  task: string,
  onProgress: (msg: string) => void,
  signal?: AbortSignal
): Promise<SkillRunResult | null> {
  const service = detectService(task);
  if (!service) return null;

  const skill = getSkill(service);
  if (!skill) return null;

  // Check abort before starting
  if (signal?.aborted) return null;

  onProgress(`[Skill] Iniciando skill: ${service}`);

  const ctx = buildSkillContext(onProgress, signal);

  // Tentar obter credenciais reais via IPC
  try {
    const w = window as any;
    if (typeof w.computerUse?.listServicesDisplay === 'function') {
      const { services } = await w.computerUse.listServicesDisplay();
      const svc = services?.find((s: any) => s.service === service);
      if (svc?.hasCredentials) {
        onProgress(`[Skill] Credenciais encontradas para ${service}`);
        // Credenciais reais são injetadas pelo main process via SessionManager
        // O ctx.credentials fica vazio — a skill usa AI vision para login
      }
    }
  } catch { /* sem credenciais — skill usa AI vision */ }

  const result = await skill.run(task, ctx);
  return { ...result, service };
}
