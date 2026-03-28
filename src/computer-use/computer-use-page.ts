import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

declare global {
  interface Window {
    computerUse?: {
      listServices: () => Promise<{ success: boolean; services: ServiceInfo[] }>;
      listServicesDisplay: () => Promise<{ success: boolean; services: ServiceDisplayInfo[] }>;
      createCredential: (service: string, email: string, password: string) => Promise<{ success: boolean }>;
      updateCredential: (service: string, email: string, password: string) => Promise<{ success: boolean }>;
      deleteCredential: (service: string) => Promise<{ success: boolean }>;
      startSession: (service: string, task: string) => Promise<{ success: boolean; sessionId?: string; error?: any }>;
      confirmSession: (sessionId: string) => Promise<{ success: boolean }>;
      stopSession: (sessionId: string) => Promise<{ success: boolean }>;
      getSessions: (limit?: number) => Promise<{ success: boolean; sessions: SessionInfo[] }>;
      getStatus: () => Promise<{ success: boolean; enabled: boolean }>;
      setEnabled: (enabled: boolean) => Promise<{ success: boolean }>;
      checkDeps: () => Promise<{ success: boolean; isAvailable: boolean }>;
      captureScreen: () => Promise<{ success: boolean; image?: string; metadata?: any }>;
      onEvent: (channel: string, callback: (...args: any[]) => void) => void;
      removeListener: (channel: string, callback: (...args: any[]) => void) => void;
    };
  }
}

interface ServiceInfo {
  service: string;
  hasCredentials: boolean;
}

interface ServiceDisplayInfo {
  service: string;
  hasCredentials: boolean;
  emailMasked?: string;
}

interface SessionInfo {
  id: string;
  service: string;
  task: string;
  status: string;
  startedAt: number;
  endedAt?: number;
  errorMessage?: string;
  actions: any[];
}

@customElement('computer-use-page')
export class ComputerUsePage extends LitElement {
  protected createRenderRoot() { return this; }

  @state() private enabled: boolean = false;
  @state() private depsAvailable: boolean = true;
  @state() private services: ServiceInfo[] = [];
  @state() private servicesDisplay: ServiceDisplayInfo[] = [];
  @state() private sessions: SessionInfo[] = [];
  @state() private activeSessionId: string | null = null;
  @state() private confirmPending: { sessionId: string; description: string } | null = null;
  @state() private selectedSession: SessionInfo | null = null;
  @state() private view: 'overview' | 'credentials' | 'history' = 'overview';
  @state() private credForm: { service: string; email: string; password: string } = { service: '', email: '', password: '' };
  @state() private editingService: string | null = null;
  @state() private taskInput: string = '';
  @state() private taskService: string = '';
  @state() private errorMsg: string = '';
  @state() private successMsg: string = '';

  private _onConfirmRequired = (data: any) => {
    this.confirmPending = data;
  };
  private _onSessionUpdate = (session: SessionInfo) => {
    this.sessions = this.sessions.map(s => s.id === session.id ? session : s);
    if (session.status === 'running') this.activeSessionId = session.id;
  };
  private _onSessionComplete = (session: SessionInfo) => {
    this.sessions = this.sessions.map(s => s.id === session.id ? session : s);
    if (this.activeSessionId === session.id) this.activeSessionId = null;
    this._loadSessions();
  };
  private _onEmergencyStopped = (data: any) => {
    if (this.activeSessionId === data.sessionId) this.activeSessionId = null;
    this._loadSessions();
  };

  connectedCallback() {
    super.connectedCallback();
    this._init();
    window.computerUse?.onEvent('cu:confirm-required', this._onConfirmRequired);
    window.computerUse?.onEvent('cu:session-update', this._onSessionUpdate);
    window.computerUse?.onEvent('cu:session-complete', this._onSessionComplete);
    window.computerUse?.onEvent('cu:emergency-stopped', this._onEmergencyStopped);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.computerUse?.removeListener('cu:confirm-required', this._onConfirmRequired);
    window.computerUse?.removeListener('cu:session-update', this._onSessionUpdate);
    window.computerUse?.removeListener('cu:session-complete', this._onSessionComplete);
    window.computerUse?.removeListener('cu:emergency-stopped', this._onEmergencyStopped);
  }

  private async _init() {
    if (!window.computerUse) {
      this.depsAvailable = false;
      return;
    }
    const [statusRes, depsRes] = await Promise.all([
      window.computerUse.getStatus(),
      window.computerUse.checkDeps(),
    ]);
    this.enabled = statusRes.enabled;
    this.depsAvailable = depsRes.isAvailable;
    await this._loadServices();
    await this._loadSessions();
  }

  private async _loadServices() {
    const res = await window.computerUse?.listServices();
    if (res?.success) this.services = res.services;
    const displayRes = await window.computerUse?.listServicesDisplay();
    if (displayRes?.success) this.servicesDisplay = displayRes.services;
  }

  private async _loadSessions() {
    const res = await window.computerUse?.getSessions(20);
    if (res?.success) this.sessions = res.sessions;
  }

  private async _toggleEnabled() {
    const newVal = !this.enabled;
    await window.computerUse?.setEnabled(newVal);
    this.enabled = newVal;
  }

  private async _saveCredential() {
    const { service, email, password } = this.credForm;
    if (!service || !email || !password) { this.errorMsg = 'Preencha todos os campos.'; return; }
    const existing = this.services.find(s => s.service === service);
    const fn = existing?.hasCredentials
      ? window.computerUse?.updateCredential
      : window.computerUse?.createCredential;
    const res = await fn?.call(window.computerUse, service, email, password);
    if (res?.success) {
      this.successMsg = 'Credenciais guardadas.';
      this.credForm = { service: '', email: '', password: '' };
      this.editingService = null;
      await this._loadServices();
    } else {
      this.errorMsg = 'Erro ao guardar credenciais.';
    }
  }

  private async _deleteCredential(service: string) {
    await window.computerUse?.deleteCredential(service);
    await this._loadServices();
  }

  private async _startTask() {
    if (!this.taskService || !this.taskInput) { this.errorMsg = 'Selecione um serviço e descreva a tarefa.'; return; }
    const res = await window.computerUse?.startSession(this.taskService, this.taskInput);
    if (res?.success && res.sessionId) {
      this.activeSessionId = res.sessionId;
      this.taskInput = '';
      this.errorMsg = '';
    } else {
      this.errorMsg = res?.error?.message ?? 'Erro ao iniciar sessão.';
    }
  }

  private async _confirmSession() {
    if (!this.confirmPending) return;
    await window.computerUse?.confirmSession(this.confirmPending.sessionId);
    this.confirmPending = null;
  }

  private async _stopSession() {
    if (!this.activeSessionId) return;
    await window.computerUse?.stopSession(this.activeSessionId);
    this.activeSessionId = null;
    await this._loadSessions();
  }

  render() {
    if (!window.computerUse) {
      return html`
        <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
          <div class="text-4xl">⚠️</div>
          <h2 class="text-xl font-semibold text-white">Computer Use não disponível</h2>
          <p class="text-gray-400 max-w-md">Esta funcionalidade requer a versão Electron do ULTRON. Abra a aplicação desktop para usar o Computer Use.</p>
        </div>
      `;
    }

    if (!this.depsAvailable) {
      return html`
        <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
          <div class="text-4xl">🔧</div>
          <h2 class="text-xl font-semibold text-white">Dependências em falta</h2>
          <p class="text-gray-400 max-w-md">O módulo de automação (nut-js) não está disponível. Instale as dependências nativas e reinicie a aplicação.</p>
          <code class="bg-[#1a1a1a] px-4 py-2 rounded-lg text-sm text-gray-300">npm install @nut-tree-fork/nut-js</code>
        </div>
      `;
    }

    return html`
      <div class="flex flex-col h-full bg-[#0a0a0a] text-white overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-[#222] flex-shrink-0">
          <div>
            <h1 class="text-lg font-semibold">Computer Use</h1>
            <p class="text-xs text-gray-500 mt-0.5">Automação de serviços externos</p>
          </div>
          <div class="flex items-center gap-3">
            ${this.activeSessionId ? html`
              <button
                @click=${this._stopSession}
                class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors animate-pulse"
              >
                ⏹ Parar Emergência
              </button>
            ` : ''}
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-400">${this.enabled ? 'Ativo' : 'Inativo'}</span>
              <button
                @click=${this._toggleEnabled}
                class="relative w-10 h-6 rounded-full transition-colors ${this.enabled ? 'bg-white' : 'bg-[#333]'}"
              >
                <div class="absolute top-1 ${this.enabled ? 'right-1' : 'left-1'} w-4 h-4 rounded-full ${this.enabled ? 'bg-black' : 'bg-gray-500'} transition-all"></div>
              </button>
            </div>
          </div>
        </div>

        <!-- Nav tabs -->
        <div class="flex gap-1 px-6 pt-3 border-b border-[#222] flex-shrink-0">
          ${(['overview', 'credentials', 'history'] as const).map(tab => html`
            <button
              @click=${() => { this.view = tab; this.selectedSession = null; }}
              class="px-4 py-2 text-sm rounded-t-lg transition-colors ${this.view === tab ? 'bg-[#1a1a1a] text-white border border-b-0 border-[#333]' : 'text-gray-500 hover:text-white'}"
            >
              ${{ overview: 'Visão Geral', credentials: 'Credenciais', history: 'Histórico' }[tab]}
            </button>
          `)}
        </div>

        <!-- Messages -->
        ${this.errorMsg ? html`
          <div class="mx-6 mt-3 px-4 py-2 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-300 flex items-center justify-between">
            <span>${this.errorMsg}</span>
            <button @click=${() => this.errorMsg = ''} class="text-red-400 hover:text-white ml-4">✕</button>
          </div>
        ` : ''}
        ${this.successMsg ? html`
          <div class="mx-6 mt-3 px-4 py-2 bg-green-900/30 border border-green-700 rounded-lg text-sm text-green-300 flex items-center justify-between">
            <span>${this.successMsg}</span>
            <button @click=${() => this.successMsg = ''} class="text-green-400 hover:text-white ml-4">✕</button>
          </div>
        ` : ''}

        <!-- Confirm dialog -->
        ${this.confirmPending ? html`
          <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div class="bg-[#141414] border border-[#333] rounded-2xl w-full max-w-sm p-6 space-y-4">
              <h3 class="text-base font-semibold text-white">Confirmar Tarefa</h3>
              <p class="text-sm text-gray-400">${this.confirmPending.description}</p>
              <div class="flex gap-3 justify-end">
                <button @click=${() => this.confirmPending = null} class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancelar</button>
                <button @click=${this._confirmSession} class="px-4 py-2 text-sm bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors">Confirmar</button>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6">
          ${this.view === 'overview' ? this._renderOverview() : ''}
          ${this.view === 'credentials' ? this._renderCredentials() : ''}
          ${this.view === 'history' ? this._renderHistory() : ''}
        </div>
      </div>
    `;
  }

  private _renderOverview() {
    const SERVICES = ['gmail', 'github', 'google-drive'];
    return html`
      <div class="space-y-6 max-w-2xl">
        <div>
          <h2 class="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Iniciar Tarefa</h2>
          <div class="bg-[#141414] border border-[#222] rounded-xl p-4 space-y-3">
            <select
              .value=${this.taskService}
              @change=${(e: any) => this.taskService = e.target.value}
              class="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/50"
            >
              <option value="">Selecionar serviço...</option>
              ${SERVICES.map(s => html`<option value="${s}">${s}</option>`)}
            </select>
            <textarea
              .value=${this.taskInput}
              @input=${(e: any) => this.taskInput = e.target.value}
              placeholder="Descreva a tarefa (ex: Enviar email para [email] com assunto 'Reunião')"
              rows="3"
              class="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/50 resize-none"
            ></textarea>
            <button
              @click=${this._startTask}
              ?disabled=${!this.enabled || !!this.activeSessionId}
              class="w-full py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ${this.activeSessionId ? '⏳ Sessão em curso...' : '▶ Executar Tarefa'}
            </button>
          </div>
        </div>

        <div>
          <h2 class="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Serviços Configurados</h2>
          <div class="space-y-2">
            ${SERVICES.map(svc => {
              const info = this.services.find(s => s.service === svc);
              const display = this.servicesDisplay.find(s => s.service === svc);
              return html`
                <div class="flex items-center justify-between bg-[#141414] border border-[#222] rounded-xl px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full ${info?.hasCredentials ? 'bg-green-400' : 'bg-gray-600'}"></div>
                    <div>
                      <div class="text-sm font-medium text-white">${svc}</div>
                      <div class="text-xs text-gray-500">${display?.emailMasked ?? 'Sem credenciais'}</div>
                    </div>
                  </div>
                  <button
                    @click=${() => { this.editingService = svc; this.credForm = { service: svc, email: '', password: '' }; this.view = 'credentials'; }}
                    class="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    ${info?.hasCredentials ? 'Editar' : 'Configurar'}
                  </button>
                </div>
              `;
            })}
          </div>
        </div>
      </div>
    `;
  }

  private _renderCredentials() {
    return html`
      <div class="space-y-6 max-w-md">
        <div class="bg-[#141414] border border-[#222] rounded-xl p-5 space-y-4">
          <h2 class="text-sm font-medium text-white">${this.editingService ? `Editar — ${this.editingService}` : 'Adicionar Credenciais'}</h2>
          <div class="space-y-3">
            <div>
              <label class="text-xs text-gray-400 mb-1 block">Serviço</label>
              <select
                .value=${this.credForm.service}
                @change=${(e: any) => this.credForm = { ...this.credForm, service: e.target.value }}
                class="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/50"
              >
                <option value="">Selecionar...</option>
                <option value="gmail">gmail</option>
                <option value="github">github</option>
                <option value="google-drive">google-drive</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-gray-400 mb-1 block">Email / Username</label>
              <input
                type="email"
                .value=${this.credForm.email}
                @input=${(e: any) => this.credForm = { ...this.credForm, email: e.target.value }}
                placeholder="[email]"
                class="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/50"
              >
            </div>
            <div>
              <label class="text-xs text-gray-400 mb-1 block">Password</label>
              <input
                type="password"
                .value=${this.credForm.password}
                @input=${(e: any) => this.credForm = { ...this.credForm, password: e.target.value }}
                placeholder="••••••••"
                class="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/50"
              >
            </div>
          </div>
          <div class="flex gap-3">
            <button @click=${this._saveCredential} class="flex-1 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">Guardar</button>
            <button @click=${() => { this.credForm = { service: '', email: '', password: '' }; this.editingService = null; }} class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Limpar</button>
          </div>
        </div>

        <div>
          <h2 class="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Credenciais Guardadas</h2>
          <div class="space-y-2">
            ${this.services.filter(s => s.hasCredentials).map(s => {
              const display = this.servicesDisplay.find(d => d.service === s.service);
              return html`
              <div class="flex items-center justify-between bg-[#141414] border border-[#222] rounded-xl px-4 py-3">
                <div>
                  <div class="text-sm font-medium text-white">${s.service}</div>
                  <div class="text-xs text-gray-500">${display?.emailMasked ?? '***'}</div>
                </div>
                <div class="flex gap-2">
                  <button @click=${() => { this.editingService = s.service; this.credForm = { service: s.service, email: '', password: '' }; }} class="text-xs text-gray-400 hover:text-white transition-colors">Editar</button>
                  <button @click=${() => this._deleteCredential(s.service)} class="text-xs text-red-400 hover:text-red-300 transition-colors">Remover</button>
                </div>
              </div>
            `;})}
            ${this.services.filter(s => s.hasCredentials).length === 0 ? html`
              <p class="text-sm text-gray-600 text-center py-4">Nenhuma credencial configurada.</p>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  private _renderHistory() {
    if (this.selectedSession) {
      const s = this.selectedSession;
      return html`
        <div class="max-w-2xl space-y-4">
          <button @click=${() => this.selectedSession = null} class="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1">← Voltar</button>
          <div class="bg-[#141414] border border-[#222] rounded-xl p-5 space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-white">${s.service} — ${s.task}</h2>
              <span class="text-xs px-2 py-0.5 rounded-full ${s.status === 'completed' ? 'bg-green-900/40 text-green-400' : s.status === 'failed' ? 'bg-red-900/40 text-red-400' : s.status === 'stopped' ? 'bg-yellow-900/40 text-yellow-400' : 'bg-blue-900/40 text-blue-400'}">${s.status}</span>
            </div>
            <div class="text-xs text-gray-500 space-y-1">
              <div>Início: ${new Date(s.startedAt).toLocaleString()}</div>
              ${s.endedAt ? html`<div>Fim: ${new Date(s.endedAt).toLocaleString()}</div>` : ''}
              ${s.errorMessage ? html`<div class="text-red-400">Erro: ${s.errorMessage}</div>` : ''}
            </div>
            <div class="border-t border-[#222] pt-3">
              <h3 class="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Actions (${s.actions.length})</h3>
              <div class="space-y-1 max-h-64 overflow-y-auto">
                ${s.actions.length === 0 ? html`<p class="text-xs text-gray-600">Nenhuma action registada.</p>` : ''}
                ${s.actions.map((a: any) => html`
                  <div class="flex items-center gap-2 text-xs py-1 border-b border-[#1a1a1a]">
                    <span class="${a.success ? 'text-green-400' : 'text-red-400'}">${a.success ? '✓' : '✗'}</span>
                    <span class="text-gray-300">${a.type}</span>
                    <span class="text-gray-600">${a.durationMs}ms</span>
                  </div>
                `)}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return html`
      <div class="max-w-2xl space-y-2">
        <h2 class="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Últimas 20 Sessões</h2>
        ${this.sessions.length === 0 ? html`<p class="text-sm text-gray-600 text-center py-8">Nenhuma sessão registada.</p>` : ''}
        ${this.sessions.map(s => html`
          <button
            @click=${() => this.selectedSession = s}
            class="w-full flex items-center justify-between bg-[#141414] border border-[#222] rounded-xl px-4 py-3 hover:border-[#333] transition-colors text-left"
          >
            <div class="flex items-center gap-3">
              <span class="text-xs px-2 py-0.5 rounded-full ${s.status === 'completed' ? 'bg-green-900/40 text-green-400' : s.status === 'failed' ? 'bg-red-900/40 text-red-400' : s.status === 'stopped' ? 'bg-yellow-900/40 text-yellow-400' : 'bg-blue-900/40 text-blue-400'}">${s.status}</span>
              <div>
                <div class="text-sm text-white">${s.service}</div>
                <div class="text-xs text-gray-500 truncate max-w-xs">${s.task}</div>
              </div>
            </div>
            <div class="text-xs text-gray-600 flex-shrink-0">${new Date(s.startedAt).toLocaleDateString()}</div>
          </button>
        `)}
      </div>
    `;
  }
}
