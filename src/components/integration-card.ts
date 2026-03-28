/**
 * Integration Card Component
 * Displays integration details and connection button
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { OAuthProviderName } from '../oauth/types';
import { initiateOAuth } from '../oauth/oauth-manager';

export interface IntegrationInfo {
  id: OAuthProviderName | string;
  name: string;
  description: string;
  icon: any;
  iconColor?: string;
  connected: boolean;
  hasToggle?: boolean;
  badge?: string;
  features?: string[];
  provider?: OAuthProviderName;
}

@customElement('integration-card')
export class IntegrationCard extends LitElement {
  @property({ type: Object }) integration!: IntegrationInfo;
  @property({ type: Boolean }) isConnecting = false;

  static styles = css`
    :host {
      display: block;
    }

    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .card {
      background: #1a1a1a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      width: 90%;
      max-width: 480px;
      max-height: 80vh;
      overflow-y: auto;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .card-header {
      padding: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .icon-wrapper {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .header-info {
      flex: 1;
    }

    .integration-name {
      font-size: 20px;
      font-weight: 600;
      color: white;
      margin: 0 0 4px 0;
    }

    .integration-status {
      font-size: 13px;
      color: #888;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #888;
    }

    .status-dot.connected {
      background: #10b981;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: #888;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.05);
      color: white;
    }

    .card-body {
      padding: 24px;
    }

    .description {
      color: #aaa;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 24px;
    }

    .features {
      margin-bottom: 24px;
    }

    .features-title {
      font-size: 13px;
      font-weight: 600;
      color: white;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .features-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #aaa;
      font-size: 14px;
    }

    .feature-icon {
      width: 16px;
      height: 16px;
      color: #10b981;
    }

    .card-footer {
      padding: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      gap: 12px;
    }

    .btn {
      flex: 1;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .btn-primary {
      background: white;
      color: black;
    }

    .btn-primary:hover:not(:disabled) {
      background: #f0f0f0;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: transparent;
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .btn-disconnect {
      background: #ef4444;
      color: white;
    }

    .btn-disconnect:hover {
      background: #dc2626;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(0, 0, 0, 0.2);
      border-top-color: black;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;

  private handleConnect() {
    if (this.isConnecting || this.integration.connected) return;

    this.isConnecting = true;

    // If it's an OAuth provider, use the OAuth flow
    if (this.integration.provider) {
      initiateOAuth(this.integration.provider)
        .then(() => {
          console.log(`[Integration] OAuth flow initiated for ${this.integration.name}`);
          // The OAuth flow will handle the rest
          setTimeout(() => {
            this.isConnecting = false;
          }, 2000);
        })
        .catch((error) => {
          console.error(`[Integration] Failed to initiate OAuth:`, error);
          alert(`Erro ao conectar: ${error.message}`);
          this.isConnecting = false;
        });
    } else {
      // For non-OAuth integrations, just simulate connection
      setTimeout(() => {
        this.isConnecting = false;
        this.dispatchEvent(new CustomEvent('integration-connected', {
          detail: { integration: this.integration },
          bubbles: true,
          composed: true,
        }));
      }, 1500);
    }
  }

  private handleDisconnect() {
    this.dispatchEvent(new CustomEvent('integration-disconnected', {
      detail: { integration: this.integration },
      bubbles: true,
      composed: true,
    }));
  }

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close', {
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    const { name, description, icon, iconColor, connected, features } = this.integration;

    return html`
      <div class="overlay" @click=${(e: Event) => e.target === e.currentTarget && this.handleClose()}>
        <div class="card">
          <div class="card-header">
            <div class="icon-wrapper">
              ${icon ? html`<div class="${iconColor || 'text-white'}" style="width: 32px; height: 32px;">${icon}</div>` : ''}
            </div>
            <div class="header-info">
              <h3 class="integration-name">${name}</h3>
              <div class="integration-status">
                <span class="status-dot ${connected ? 'connected' : ''}"></span>
                <span>${connected ? 'Conectado' : 'Não conectado'}</span>
              </div>
            </div>
            <button class="close-btn" @click=${this.handleClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="card-body">
            <p class="description">${description}</p>

            ${features && features.length > 0 ? html`
              <div class="features">
                <div class="features-title">Recursos</div>
                <div class="features-list">
                  ${features.map(feature => html`
                    <div class="feature-item">
                      <svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                      <span>${feature}</span>
                    </div>
                  `)}
                </div>
              </div>
            ` : ''}
          </div>

          <div class="card-footer">
            ${connected ? html`
              <button class="btn btn-disconnect" @click=${this.handleDisconnect}>
                Desconectar
              </button>
              <button class="btn btn-secondary" @click=${this.handleClose}>
                Fechar
              </button>
            ` : html`
              <button class="btn btn-secondary" @click=${this.handleClose}>
                Cancelar
              </button>
              <button 
                class="btn btn-primary" 
                @click=${this.handleConnect}
                ?disabled=${this.isConnecting}
              >
                ${this.isConnecting ? html`
                  <div class="spinner"></div>
                  <span>Conectando...</span>
                ` : html`
                  <span>Conectar</span>
                `}
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'integration-card': IntegrationCard;
  }
}
