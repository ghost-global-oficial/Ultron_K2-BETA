import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide';

export interface SkillAction {
  id: string;
  service: string;
  action: string;
  status: 'pending' | 'success' | 'error';
  summary: string;
  details?: string;
  timestamp: number;
  icon?: string;
}

@customElement('skill-action-card')
export class SkillActionCard extends LitElement {
  @property({ type: Object }) action!: SkillAction;
  @state() private expanded = false;

  static styles = css`
    :host {
      display: block;
      margin: 8px 0;
    }

    .card {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.2s ease;
    }

    .card:hover {
      border-color: rgba(99, 102, 241, 0.5);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
    }

    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      cursor: pointer;
      user-select: none;
    }

    .icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: rgba(255, 255, 255, 0.1);
    }

    .icon img {
      width: 20px;
      height: 20px;
      object-fit: contain;
    }

    .content {
      flex: 1;
      min-width: 0;
    }

    .title {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 4px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .service-name {
      color: rgba(99, 102, 241, 1);
    }

    .summary {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status-icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
    }

    .status-icon.success {
      color: #10b981;
    }

    .status-icon.error {
      color: #ef4444;
    }

    .status-icon.pending {
      color: #f59e0b;
      animation: pulse 2s ease-in-out infinite;
    }

    .expand-icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      color: rgba(255, 255, 255, 0.5);
      transition: transform 0.2s ease;
    }

    .expand-icon.expanded {
      transform: rotate(180deg);
    }

    .details {
      padding: 0 16px 16px 60px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.6;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      margin-top: 8px;
      padding-top: 12px;
    }

    .timestamp {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 8px;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
  `;

  private getServiceIcon(service: string): string {
    const iconMap: Record<string, string> = {
      'Gmail': '/Gmail_icon_(2020).svg.png',
      'GitHub': '/github-icon.webp',
      'Google Drive': '/Google_Drive_icon_(2020).svg.png',
      'Google Calendar': '/Google_Calendar_icon_(2020).svg.png',
      'Notion': '/Notion-logo.svg.png',
      'Stripe': '/stripe_icon.png',
      'Linear': '/linear-app8372.logowik.com.webp',
      'Slack': '/Slack_icon_2019.svg.png',
      'Asana': '/Asana.webp',
      'Vercel': '/vercel-icon.webp',
      'Supabase': '/supabase.png',
    };
    return iconMap[service] || '/Icon.jpeg';
  }

  private getStatusIcon() {
    switch (this.action.status) {
      case 'success':
        return html`<div class="status-icon success">${this.renderIcon(CheckCircle)}</div>`;
      case 'error':
        return html`<div class="status-icon error">${this.renderIcon(XCircle)}</div>`;
      case 'pending':
        return html`<div class="status-icon pending">${this.renderIcon(Clock)}</div>`;
    }
  }

  private renderIcon(icon: any) {
    const svg = icon.toSvg({ width: 20, height: 20, strokeWidth: 2 });
    return html`${unsafeHTML(svg)}`;
  }

  private toggleExpand() {
    this.expanded = !this.expanded;
  }

  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'agora mesmo';
    if (diff < 3600000) return `há ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `há ${Math.floor(diff / 3600000)}h`;
    
    return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  }

  render() {
    const iconSrc = this.action.icon || this.getServiceIcon(this.action.service);
    const hasDetails = !!this.action.details;

    return html`
      <div class="card">
        <div class="header" @click=${hasDetails ? this.toggleExpand : null}>
          <div class="icon">
            <img src=${iconSrc} alt=${this.action.service} />
          </div>
          <div class="content">
            <p class="title">
              <span class="service-name">${this.action.service}</span>
              <span>•</span>
              <span>${this.action.action}</span>
            </p>
            <p class="summary">${this.action.summary}</p>
          </div>
          ${this.getStatusIcon()}
          ${hasDetails ? html`
            <div class="expand-icon ${this.expanded ? 'expanded' : ''}">
              ${this.renderIcon(ChevronDown)}
            </div>
          ` : ''}
        </div>
        ${this.expanded && hasDetails ? html`
          <div class="details">
            ${this.action.details}
            <div class="timestamp">${this.formatTimestamp(this.action.timestamp)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }
}

// Helper to render unsafe HTML (for Lucide icons)
function unsafeHTML(html: string) {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content;
}

declare global {
  interface HTMLElementTagNameMap {
    'skill-action-card': SkillActionCard;
  }
}
