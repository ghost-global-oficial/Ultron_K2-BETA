/**
 * ULTRON OAuth UI Component
 * Connection management interface for OAuth providers.
 */

import { html, css, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { startAuthorization, handleCallback, revokeToken, getAccessToken } from './oauth-manager';
import { listConnections, deleteConnection, type StoredOAuthConnection } from './token-store';
import { getProvider, GMAIL_SCOPES, DRIVE_SCOPES, CALENDAR_SCOPES } from './providers';
import type { OAuthConfig, OAuthProviderName } from './types';

@customElement('oauth-manager-ui')
export class OAuthManagerUI extends LitElement {
  @state() connections: StoredOAuthConnection[] = [];
  @state() showAddModal = false;
  @state() selectedProvider: OAuthProviderName = 'google';
  @state() customScopes = '';
  @state() clientId = '';
  @state() clientSecret = '';
  @state() isConnecting = false;

  static styles = css`
    :host {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .container {
      padding: 20px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #4285f4;
      color: white;
    }

    .btn-primary:hover {
      background: #357ae8;
    }

    .btn-danger {
      background: #ea4335;
      color: white;
    }

    .btn-danger:hover {
      background: #d33828;
    }

    .connections-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .connection-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: white;
    }

    .connection-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .connection-name {
      font-weight: 600;
      font-size: 16px;
    }

    .connection-meta {
      font-size: 12px;
      color: #666;
    }

    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-active {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .status-expired {
      background: #fff3e0;
      color: #e65100;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal-header {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 20px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 6px;
    }

    .form-input,
    .form-select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      box-sizing: border-box;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #666;
    }

    .provider-icon {
      width: 24px;
      height: 24px;
      margin-right: 8px;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadConnections();
    
    // Listen for OAuth callback messages
    window.addEventListener('message', this.handleOAuthMessage);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('message', this.handleOAuthMessage);
  }

  private handleOAuthMessage = async (event: MessageEvent) => {
    if (event.data?.type === 'oauth-callback') {
      const { code, state } = event.data;
      console.log('[OAuth UI] Received callback:', { code, state });
      
      const result = await handleCallback(code, state);
      
      if (result.success) {
        console.log('[OAuth UI] Connection successful:', result.service);
        this.loadConnections();
        this.showAddModal = false;
        this.isConnecting = false;
      } else {
        console.error('[OAuth UI] Connection failed:', result.error);
        alert(`OAuth failed: ${result.error}`);
        this.isConnecting = false;
      }
    }
  };

  private loadConnections() {
    this.connections = listConnections();
  }

  private async handleConnect() {
    if (!this.clientId.trim()) {
      alert('Client ID is required');
      return;
    }

    this.isConnecting = true;

    const provider = getProvider(this.selectedProvider);
    const scopes = this.customScopes.trim()
      ? this.customScopes.split(',').map(s => s.trim())
      : provider.defaultScopes;

    const config: OAuthConfig = {
      provider: this.selectedProvider,
      client_id: this.clientId,
      client_secret: this.clientSecret || undefined,
      redirect_uri: 'http://localhost:3000/oauth/callback',
      scopes,
    };

    const service = `${this.selectedProvider}-${Date.now()}`;

    try {
      const authUrl = await startAuthorization(config, service);
      
      // Open popup window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        authUrl,
        'oauth-popup',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (err: any) {
      console.error('[OAuth UI] Failed to start authorization:', err);
      alert(`Failed to start OAuth: ${err.message}`);
      this.isConnecting = false;
    }
  }

  private async handleDisconnect(conn: StoredOAuthConnection) {
    if (!confirm(`Disconnect ${conn.service}?`)) return;

    await revokeToken(conn.service);
    deleteConnection(conn.id);
    this.loadConnections();
  }

  private async handleTest(conn: StoredOAuthConnection) {
    const token = await getAccessToken(conn.service);
    if (token) {
      alert(`✅ Token valid: ${token.substring(0, 20)}...`);
    } else {
      alert('❌ Token expired or invalid');
    }
  }

  private getStatusBadge(conn: StoredOAuthConnection) {
    const isExpired = conn.token.expires_at && conn.token.expires_at < Date.now();
    return isExpired
      ? html`<span class="status-badge status-expired">Expired</span>`
      : html`<span class="status-badge status-active">Active</span>`;
  }

  render() {
    return html`
      <div class="container">
        <div class="header">
          <h2>OAuth Connections</h2>
          <button class="btn btn-primary" @click=${() => (this.showAddModal = true)}>
            + Add Connection
          </button>
        </div>

        ${this.connections.length === 0
          ? html`
              <div class="empty-state">
                <p>No OAuth connections yet.</p>
                <p>Click "Add Connection" to connect a service.</p>
              </div>
            `
          : html`
              <div class="connections-list">
                ${this.connections.map(
                  conn => html`
                    <div class="connection-card">
                      <div class="connection-info">
                        <div class="connection-name">
                          ${conn.userInfo?.name || conn.service}
                          ${conn.userInfo?.email ? html`<span style="color: #666; font-weight: normal; font-size: 14px;"> (${conn.userInfo.email})</span>` : ''}
                        </div>
                        <div class="connection-meta">
                          Provider: ${conn.provider} | Created: ${new Date(conn.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div style="display: flex; gap: 8px; align-items: center;">
                        ${this.getStatusBadge(conn)}
                        <button class="btn" @click=${() => this.handleTest(conn)}>Test</button>
                        <button class="btn btn-danger" @click=${() => this.handleDisconnect(conn)}>
                          Disconnect
                        </button>
                      </div>
                    </div>
                  `
                )}
              </div>
            `}

        ${this.showAddModal
          ? html`
              <div class="modal-overlay" @click=${(e: Event) => e.target === e.currentTarget && (this.showAddModal = false)}>
                <div class="modal">
                  <div class="modal-header">Add OAuth Connection</div>

                  <div class="form-group">
                    <label class="form-label">Provider</label>
                    <select
                      class="form-select"
                      .value=${this.selectedProvider}
                      @change=${(e: Event) => (this.selectedProvider = (e.target as HTMLSelectElement).value as OAuthProviderName)}
                    >
                      <option value="google">Google</option>
                      <option value="github">GitHub</option>
                      <option value="slack">Slack</option>
                      <option value="notion">Notion</option>
                      <option value="microsoft">Microsoft</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Client ID</label>
                    <input
                      class="form-input"
                      type="text"
                      placeholder="Your OAuth client ID"
                      .value=${this.clientId}
                      @input=${(e: Event) => (this.clientId = (e.target as HTMLInputElement).value)}
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Client Secret (optional for PKCE)</label>
                    <input
                      class="form-input"
                      type="password"
                      placeholder="Your OAuth client secret"
                      .value=${this.clientSecret}
                      @input=${(e: Event) => (this.clientSecret = (e.target as HTMLInputElement).value)}
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Scopes (comma-separated, leave empty for defaults)</label>
                    <input
                      class="form-input"
                      type="text"
                      placeholder="email, profile, ..."
                      .value=${this.customScopes}
                      @input=${(e: Event) => (this.customScopes = (e.target as HTMLInputElement).value)}
                    />
                  </div>

                  <div class="form-actions">
                    <button class="btn" @click=${() => (this.showAddModal = false)} ?disabled=${this.isConnecting}>
                      Cancel
                    </button>
                    <button class="btn btn-primary" @click=${this.handleConnect} ?disabled=${this.isConnecting}>
                      ${this.isConnecting ? 'Connecting...' : 'Connect'}
                    </button>
                  </div>
                </div>
              </div>
            `
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oauth-manager-ui': OAuthManagerUI;
  }
}
