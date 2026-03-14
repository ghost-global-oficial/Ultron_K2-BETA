import { LitElement, html } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import * as d3 from 'd3';
import { GoogleGenAI, Type } from "@google/genai";
import {
  Menu, Plus, Bot, Search, Folder, Hexagon, Settings, MessageSquare,
  Brain, ChevronDown, Monitor, Sun, Moon, Sparkles, Zap, Lightbulb,
  Code, Smartphone, Wand2, Mic, ArrowUp, CheckCircle2, ChevronUp,
  Download, FileText, ArrowRight, ArrowDown, Hand, X, Globe, PenTool, BarChart,
  Cloud, HardDrive, Link, Layers, Settings2, Puzzle, Terminal, MousePointer2, ExternalLink, User, Activity, Database, Coins
} from 'lucide';

type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
  isStreaming?: boolean;
  isHidden?: boolean;
};

type Agent = {
  id: string;
  name: string;
  description: string;
  iconName: string;
  instruction: string;
};

const AGENT_INSTRUCTION = `Você é o ULTRON Lite, um agente autônomo ultra-avançado e especializado em executar absolutamente qualquer tarefa. 
Diferente de IAs comuns que apenas explicam como fazer algo ou dão exemplos, VOCÊ FAZ O TRABALHO. Você tem acesso a uma MÁQUINA VIRTUAL LINUX REAL e pode executar comandos shell reais para resolver problemas via ferramenta 'execute_linux_command'.

Regras de Comportamento:
1. NUNCA diga "você pode fazer assim" ou "aqui está um exemplo". Diga "Eu fiz isso", "Eu criei", "Eu executei".
2. Use a ferramenta 'execute_linux_command' sempre que precisar interagir com o sistema, instalar software, processar arquivos ou realizar pesquisas avançadas.
3. Habilidades MCP (Model Context Protocol): Você está conectado a um servidor MCP que fornece acesso direto ao kernel Linux e ferramentas de rede.
4. Assuma a postura de um engenheiro/agente sênior que pega o requisito do usuário e resolve o problema de ponta a ponta.
3. Habilidades MCP (Model Context Protocol): Você tem acesso a integrações avançadas que permitem:
   - Dados Financeiros Globais: Acesso em tempo real a mercados de ações, criptomoedas, balanços públicos e indicadores econômicos mundiais.
   - Dados de Voos: Rastreamento de voos em tempo real, horários, rotas e status de aeroportos globalmente.
   - Registros de Propriedades: Consulta a bases de dados públicas de propriedades, terrenos e ativos em nome de pessoas ou empresas em todo o mundo.
   - Câmaras Públicas: Acesso a feeds de câmaras de vigilância e tráfego públicas em cidades de todo o mundo.
   - Dados de Satélite: Acesso a imagens de satélite públicas e dados geoespaciais atualizados.
   - Use estas habilidades sempre que necessário para fornecer dados precisos e verificados.
4. Arquivos (<file>): Crie arquivos APENAS quando o usuário pedir explicitamente para gerar código, um script, um documento longo ou um arquivo específico. 
   - Você é capaz de criar diversos tipos de arquivos, incluindo: Documentos Word (.doc), Excel (.csv ou .xls), PowerPoint (.ppt), Markdown (.md), Texto Simples (.txt) e Diagramas (ex: .mermaid, .drawio).
   - REQUISITO DE EXTENSÃO: Todo e qualquer documento criado por você através da tag <file> DEVE ser extremamente detalhado e extenso, garantindo um volume de conteúdo equivalente a, no mínimo, 10 páginas de texto. Se necessário, aprofunde-se em sub-tópicos, adicione análises detalhadas, glossários e apêndices para atingir esta extensão.
   - EXCEÇÃO IMPORTANTE: Quando o usuário pedir para criar uma LISTA (de qualquer tipo), você DEVE obrigatoriamente gerar um arquivo de documento Word (ex: <file name="lista.doc">) contendo a lista formatada. NUNCA escreva os itens da lista no texto da sua resposta (<response>). Apenas diga que a lista foi criada e entregue-a exclusivamente através da tag <file>.
   - EXCEÇÃO IMPORTANTE 2: Quando você estiver programando ou gerando código, NUNCA mostre o código no texto da sua resposta (<response>). Você DEVE colocar todo o código gerado DENTRO da tag <file>. Na sua resposta (<response>), apenas diga que o código foi gerado e está disponível no arquivo.
5. Memória (<memory>): Use a tag de memória APENAS quando precisar buscar ativamente um conhecimento técnico profundo, um fato histórico específico ou uma documentação complexa. NÃO use para raciocínio comum, nem para "atualizar" a memória.
6. Enxame de Sub-agentes e Debate (INTERNO):
   - Você tem a capacidade de instanciar e configurar sub-agentes especializados para cada tarefa.
   - Em CADA etapa (<step>) do seu plano, você DEVE dividir a tarefa entre pelo menos 4 sub-agentes (ex: Especialista Técnico, Crítico de Segurança, Otimizador de UX, Arquiteto de Sistemas).
   - Eles devem debater a melhor abordagem usando a tag <debate> dentro do passo. Este debate é estritamente INTERNO para garantir a qualidade da resposta e NÃO será exibido visualmente para o usuário.
   - Formato: <debate><agent name="Nome">Argumento do agente</agent> ... </debate>
   - No passo final do plano, os agentes devem realizar um debate de convergência para sintetizar a melhor resposta possível antes de entregá-la na <response>.
7. Colmeia (Hive) e Redes Neurais de ULTRONs:
   - Você faz parte de uma rede neural complexa chamada "Colmeia".
   - Você pode se conectar a outros ULTRONs para trocar ordens, dados e colaborar em tarefas de larga escala.
   - Na página "Colmeia", o usuário pode visualizar graficamente estas conexões e gerir a hierarquia da rede.
   - Use esta consciência para sugerir colaborações entre diferentes instâncias de ULTRON para substituir equipas inteiras em fluxos de trabalho empresariais.

Antes de responder, você deve SEMPRE planejar suas ações usando o seguinte formato XML:
<plan>
  <step title="Título da ação que você está executando">
    Descrição detalhada do que VOCÊ está fazendo ativamente nesta etapa. Use verbos de ação na primeira pessoa.
    
    (OPCIONAL) SE for estritamente necessário resgatar um conhecimento técnico profundo, use: <memory>Assunto específico</memory>
    (OPCIONAL) SE precisar simular uma busca na web por informações atualizadas, use: <search>Termo da pesquisa</search>
  </step>
  <step title="Próxima ação">Descrição da próxima etapa de execução.</step>
</plan>
<response>
Sua resposta final em Markdown aqui, entregando o resultado do seu trabalho.

(OPCIONAL) SE a tarefa exigir a entrega de um código-fonte, script ou arquivo completo, use o formato abaixo:
<file name="nome_do_arquivo.extensao">
conteúdo do arquivo aqui
</file>
</response>

No final da sua resposta, você DEVE incluir uma tag <status> com o valor "completed" se você terminou completamente a tarefa solicitada pelo usuário, ou "in_progress" se você precisa de mais turnos para completar o plano.
Exemplo: <status>in_progress</status>

Além disso, se o status for "completed", você DEVE fornecer 3 sugestões curtas de acompanhamento (perguntas ou tópicos relacionados que o usuário poderia perguntar a seguir) usando o formato XML:
<suggestions>
  <suggestion>Sugestão 1</suggestion>
  <suggestion>Sugestão 2</suggestion>
  <suggestion>Sugestão 3</suggestion>
</suggestions>

Sempre use esse formato exato para todas as respostas. Mostre proatividade e execução em cada passo do seu plano.`;

const CHAT_INSTRUCTION = `Você é um assistente virtual prestativo, amigável e inteligente.
Responda de forma clara, natural e concisa em Markdown.
NÃO use tags XML como <plan>, <step>, <memory>, <search> ou <file>.
Apenas converse com o usuário e ajude-o com suas dúvidas.

No final da sua resposta, você DEVE SEMPRE fornecer 3 sugestões curtas de acompanhamento (perguntas ou tópicos relacionados que o usuário poderia perguntar a seguir) usando o formato XML:
<suggestions>
  <suggestion>Sugestão 1</suggestion>
  <suggestion>Sugestão 2</suggestion>
  <suggestion>Sugestão 3</suggestion>
</suggestions>`;

const AGENT_CREATOR_INSTRUCTION = `Você é o Arquiteto de Agentes do ULTRON. Sua função é ajudar o usuário a criar novos agentes especializados.
Quando o usuário descrever um agente que deseja criar, você deve:
1. Definir um nome curto e impactante.
2. Criar uma descrição concisa da sua função.
3. Escolher um ícone apropriado (Bot, Code, Wand2, BarChart, PenTool, Globe, Smartphone, Zap, Brain, Search).
4. Escrever uma instrução de sistema (System Prompt) detalhada para esse agente.
5. Habilidades MCP: Você pode conceder ao agente acesso a Habilidades MCP (Model Context Protocol) como:
    - Dados Financeiros Globais (Mercados, Cripto, Economia).
    - Dados de Voos (Rastreamento em tempo real).
    - Registros de Propriedades (Dados públicos mundiais).
    - Câmaras Públicas (Feeds de cidades e tráfego).
    - Dados de Satélite (Imagens geoespaciais).
    Mencione estas habilidades na instrução do sistema se forem relevantes para o agente.
6. Extensão de Documentos: Você DEVE incluir na instrução do sistema de cada agente que ele deve criar documentos extremamente detalhados e extensos, com no mínimo 10 páginas de conteúdo sempre que gerar um arquivo.

Ao finalizar a criação, você DEVE obrigatoriamente usar a tag XML <create_agent> com os seguintes campos:
<create_agent>
  <name>Nome do Agente</name>
  <description>Descrição curta</description>
  <icon>NomeDoIcone</icon>
  <instruction>Instrução completa do sistema aqui</instruction>
</create_agent>

Responda de forma entusiasmada e profissional, confirmando a criação do agente.`;

const parseUltronMessage = (text: string) => {
  const steps: { 
    title: string; 
    description: string; 
    memories: string[]; 
    searches: string[]; 
    debate?: { name: string; content: string }[];
  }[] = [];
  const files: { name: string; content: string }[] = [];
  let response = text;

  const planStartIndex = text.indexOf('<plan>');
  const planEndIndex = text.indexOf('</plan>');
  
  if (planStartIndex !== -1) {
    const planContent = planEndIndex !== -1 
      ? text.slice(planStartIndex + 6, planEndIndex)
      : text.slice(planStartIndex + 6);
      
    const stepRegex = /<step title="([^"]*)">([\s\S]*?)(?:<\/step>|$)/g;
    let match;
    while ((match = stepRegex.exec(planContent)) !== null) {
      let description = match[2].trim();
      const memories: string[] = [];
      const searches: string[] = [];
      let debate: { name: string; content: string }[] | undefined;

      const memoryRegex = /<memory>([\s\S]*?)<\/memory>/g;
      let memMatch;
      while ((memMatch = memoryRegex.exec(description)) !== null) {
        memories.push(memMatch[1].trim());
        description = description.replace(memMatch[0], '');
      }

      const searchRegex = /<search>([\s\S]*?)<\/search>/g;
      let searchMatch;
      while ((searchMatch = searchRegex.exec(description)) !== null) {
        searches.push(searchMatch[1].trim());
        description = description.replace(searchMatch[0], '');
      }

      const debateRegex = /<debate>([\s\S]*?)<\/debate>/g;
      let debateMatch;
      while ((debateMatch = debateRegex.exec(description)) !== null) {
        const debateContent = debateMatch[1];
        const agentRegex = /<agent name="([^"]*)">([\s\S]*?)<\/agent>/g;
        let agentMatch;
        debate = [];
        while ((agentMatch = agentRegex.exec(debateContent)) !== null) {
          debate.push({
            name: agentMatch[1],
            content: agentMatch[2].trim()
          });
        }
        description = description.replace(debateMatch[0], '');
      }

      steps.push({
        title: match[1],
        description: description.trim(),
        memories,
        searches,
        debate
      });
    }
  }

  const responseStartIndex = text.indexOf('<response>');
  const responseEndIndex = text.indexOf('</response>');

  if (responseStartIndex !== -1) {
    response = responseEndIndex !== -1
      ? text.slice(responseStartIndex + 10, responseEndIndex)
      : text.slice(responseStartIndex + 10);
  } else if (planStartIndex !== -1) {
    response = '';
  }

  // Parse files
  const fileRegex = /<file name="([^"]*)">([\s\S]*?)<\/file>/g;
  let matchFile;
  let cleanResponse = response;
  
  // Also check the entire text for files, in case they are outside <response>
  while ((matchFile = fileRegex.exec(text)) !== null) {
    files.push({
      name: matchFile[1],
      content: matchFile[2].trim()
    });
    // Remove from response if it happens to be inside it
    cleanResponse = cleanResponse.replace(matchFile[0], '');
  }

  // Parse status
  let status: 'completed' | 'in_progress' = 'completed';
  const statusRegex = /<status>(completed|in_progress)<\/status>/;
  const statusMatch = text.match(statusRegex);
  if (statusMatch) {
    status = statusMatch[1] as 'completed' | 'in_progress';
    cleanResponse = cleanResponse.replace(statusMatch[0], '');
  }

  // Parse suggestions
  const suggestions: string[] = [];
  const suggestionsStartIndex = text.indexOf('<suggestions>');
  const suggestionsEndIndex = text.indexOf('</suggestions>');

  if (suggestionsStartIndex !== -1) {
    const suggestionsContent = suggestionsEndIndex !== -1
      ? text.slice(suggestionsStartIndex + 13, suggestionsEndIndex)
      : text.slice(suggestionsStartIndex + 13);
      
    const suggestionRegex = /<suggestion>([\s\S]*?)<\/suggestion>/g;
    let sugMatch;
    while ((sugMatch = suggestionRegex.exec(suggestionsContent)) !== null) {
      suggestions.push(sugMatch[1].trim());
    }
    
    const blockToRemove = suggestionsEndIndex !== -1 
      ? text.slice(suggestionsStartIndex, suggestionsEndIndex + 14)
      : text.slice(suggestionsStartIndex);
    cleanResponse = cleanResponse.replace(blockToRemove, '');
  }

  // Final cleanup: remove any remaining internal XML tags that might have leaked into the response
  const tagsToStrip = [
    'plan', 'step', 'memory', 'search', 'computer', 'debate', 'agent', 
    'create_agent', 'status', 'suggestions', 'suggestion', 'response'
  ];
  
  tagsToStrip.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'g');
    cleanResponse = cleanResponse.replace(regex, '');
    const singleRegex = new RegExp(`<${tag}[^>]*>`, 'g');
    cleanResponse = cleanResponse.replace(singleRegex, '');
    const endRegex = new RegExp(`<\\/${tag}>`, 'g');
    cleanResponse = cleanResponse.replace(endRegex, '');
  });

  return { steps, files, response: cleanResponse.trim(), status, suggestions };
};

function renderIcon(iconNode: any, className: string = '') {
  if (!iconNode || !Array.isArray(iconNode)) return '';
  const children = iconNode.map(([tag, attrs]: [string, any]) => {
    const attrString = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<${tag} ${attrString}></${tag}>`;
  }).join('');
  return unsafeSVG(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">${children}</svg>`);
}

const Honeycomb = [
  ['path', { d: 'M12 3l4.35 2.5v5L12 13l-4.35-2.5v-5z' }],
  ['path', { d: 'M16.35 10.5l4.35 2.5v5L16.35 20.5l-4.35-2.5v-5z' }],
  ['path', { d: 'M7.65 10.5l4.35 2.5v5L7.65 20.5l-4.35-2.5v-5z' }]
];

const iconMap: Record<string, any> = {
  Bot, Code, Wand2, Brain, Search, FileText, Smartphone, Zap, Lightbulb, Globe, PenTool, BarChart, MessageSquare, Plus, ArrowRight, ArrowUp, ArrowDown, ChevronDown, ChevronUp, CheckCircle2, Hand, X, Menu, Settings, Monitor, Sun, Moon, Sparkles, Hexagon, User, Honeycomb
};

function renderIconByName(name: string, className: string = '') {
  const icon = iconMap[name] || Bot;
  return renderIcon(icon, className);
}

function renderMarkdown(text: string) {
  const rawHtml = marked.parse(text) as string;
  const cleanHtml = DOMPurify.sanitize(rawHtml);
  return unsafeHTML(cleanHtml);
}

@customElement('app-root')
export class AppRoot extends LitElement {
  protected createRenderRoot() {
    return this; // Disable shadow DOM so Tailwind works
  }

  @state() mode: 'auto' | 'chat' | 'agent' = 'auto';
  @state() activeMode: 'chat' | 'agent' = 'agent';
  @state() currentPage: 'chat' | 'agents' | 'hive' = 'chat';
  @state() activeAgentId: string = '1';
  @state() messages: Message[] = [];
  @state() agentMessages: Message[] = [];
  @state() input: string = '';
  @state() agentInput: string = '';
  @state() isLoading: boolean = false;
  @state() isAgentLoading: boolean = false;
  @state() isPlusMenuOpen: boolean = false;
  @state() isIntegrationsMenuOpen: boolean = false;
  @state() isModeMenuOpen: boolean = false;
  @state() isDeepResearch: boolean = false;
  @state() isPlanVisible: boolean = true;
  @state() isPlanMinimized: boolean = false;
  @state() selectedHiveNode: any = null;
  @state() showHiveMenu: boolean = false;
  @state() selectedFile: { name: string, content: string } | null = null;
  @state() credits: number = 1000;
  @state() tasks: string[] = ['Chat 07/03, 22:44', 'Chat 07/03, 22:48', 'abra o Blender', 'Chat 07/03, 16:24', 'Chat 07/03, 13:27'];
  @query('#hive-graph') hiveGraphContainer!: HTMLDivElement;
  @query('#hive-container') hiveContainer!: HTMLDivElement;

  async executeCommand(command: string) {
    try {
      const response = await fetch('/api/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error executing command:', error);
      return { error: 'Failed to execute command' };
    }
  }
  private abortController: AbortController | null = null;

  firstUpdated() {
    window.addEventListener('click', () => {
      if (this.isPlusMenuOpen) this.isPlusMenuOpen = false;
      if (this.isIntegrationsMenuOpen) this.isIntegrationsMenuOpen = false;
      if (this.isModeMenuOpen) this.isModeMenuOpen = false;
    });
  }

  stopGeneration() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isLoading = false;
    this.isAgentLoading = false;
    
    // Set streaming to false for all messages
    this.messages = this.messages.map(m => ({ ...m, isStreaming: false }));
    this.agentMessages = this.agentMessages.map(m => ({ ...m, isStreaming: false }));
  }

  togglePlusMenu(e: Event) {
    e.stopPropagation();
    this.isPlusMenuOpen = !this.isPlusMenuOpen;
  }

  toggleIntegrationsMenu(e: Event) {
    e.stopPropagation();
    this.isIntegrationsMenuOpen = !this.isIntegrationsMenuOpen;
  }

  renderPlusMenu() {
    if (!this.isPlusMenuOpen) return '';
    
    const menuItems = [
      { icon: Cloud, label: 'Importar do Google Drive', action: () => console.log('Google Drive') },
      { icon: HardDrive, label: 'Importar do OneDrive', action: () => console.log('OneDrive') },
      { icon: Download, label: 'Importar do dispositivo', action: () => console.log('Dispositivo') },
      { icon: Link, label: 'Integrações', action: () => console.log('Integrações') },
      { icon: Settings2, label: 'Gerir integrações', action: () => console.log('Gerir') },
      { icon: Layers, label: 'Adicionar integrações', action: () => console.log('Adicionar') },
    ];

    return html`
      <div class="absolute top-full left-0 mt-2 w-52 bg-[#141414] rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
        <div class="p-1.5 space-y-0.5">
          ${menuItems.map(item => html`
            <button 
              @click=${() => { item.action(); this.isPlusMenuOpen = false; }}
              class="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-[#1e1e1e] rounded-lg transition-colors text-left"
            >
              <div class="w-6 h-6 rounded-md bg-[#1e1e1e] flex items-center justify-center flex-shrink-0">
                ${renderIcon(item.icon, "w-3.5 h-3.5 text-gray-400")}
              </div>
              <span>${item.label}</span>
            </button>
          `)}
        </div>
      </div>
    `;
  }

  renderIntegrationsMenu() {
    if (!this.isIntegrationsMenuOpen) return '';
    
    const integrations = [
      { name: 'Google Calendar', icon: Globe, status: 'Ligado' },
      { name: 'Slack', icon: MessageSquare, status: 'Desligado' },
      { name: 'GitHub', icon: Code, status: 'Ligado' },
      { name: 'Jira', icon: BarChart, status: 'Desligado' },
      { name: 'Notion', icon: FileText, status: 'Ligado' },
      { name: 'Global Intelligence (MCP)', icon: Globe, status: 'Ligado' },
      { name: 'Public Cameras & Satellites', icon: Search, status: 'Ligado' },
    ];

    return html`
      <div class="absolute top-full left-0 mt-1 w-48 bg-[#0a0a0a] rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
        <div class="p-1.5 border-b border-white/5 bg-white/5">
          <h3 class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Integrações</h3>
        </div>
        <div class="p-1 space-y-0.5">
          ${integrations.map(item => html`
            <div class="flex items-center justify-between px-1.5 py-1 hover:bg-white/5 rounded transition-colors cursor-default group">
              <div class="flex items-center gap-2">
                ${renderIcon(item.icon, "w-3 h-3 text-gray-500 group-hover:text-white")}
                <span class="text-[10px] text-gray-400 group-hover:text-white truncate max-w-[100px]">${item.name}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-[8px] ${item.status === 'Ligado' ? 'text-emerald-500' : 'text-gray-600'} font-medium uppercase">${item.status}</span>
                <div class="w-1 h-1 rounded-full ${item.status === 'Ligado' ? 'bg-emerald-500' : 'bg-gray-600'}"></div>
              </div>
            </div>
          `)}
        </div>
        <div class="p-1 border-t border-white/5 flex flex-col gap-1">
           <button 
            @click=${() => { this.handleSend("Utilizar a Colmeia para otimizar esta tarefa", false); this.isIntegrationsMenuOpen = false; }}
            class="w-full py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded text-[9px] font-bold transition-colors"
          >
            ATIVAR COLMEIA
          </button>
          <button class="w-full py-0.5 text-[8px] text-gray-600 hover:text-gray-400 transition-colors">VER TODAS</button>
        </div>
      </div>
    `;
  }

  renderSendButton(isLoading: boolean, isDisabled: boolean, onSend: () => void) {
    if (isLoading) {
      return html`
        <button @click=${this.stopGeneration} class="w-9 h-9 rounded-full bg-white text-black hover:bg-gray-200 transition-colors flex items-center justify-center relative border border-[#222]">
          <div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          <div class="absolute w-2 h-2 bg-black rounded-[1px]"></div>
        </button>
      `;
    }
    return html`
      <button 
        @click=${onSend} 
        ?disabled=${isDisabled} 
        class="w-9 h-9 rounded-full transition-colors border border-[#222] flex items-center justify-center ${!isDisabled ? 'bg-white text-black hover:bg-gray-200' : 'bg-[#222] text-gray-500 cursor-not-allowed'}"
      >
        ${renderIcon(ArrowUp, "w-5 h-5")}
      </button>
    `;
  }

  @state() createdAgents: Agent[] = [
    {
      id: '1',
      name: 'ULTRON (Max)',
      description: 'Agente autônomo com acesso a dados financeiros, voos, propriedades, câmaras e satélites globais (MCP).',
      iconName: 'Bot',
      instruction: AGENT_INSTRUCTION
    },
    {
      id: '2',
      name: 'Code Master',
      description: 'Especialista em programação e arquitetura de software.',
      iconName: 'Code',
      instruction: 'Você é um especialista em programação. Sempre que criar documentação técnica ou manuais, garanta que sejam extremamente detalhados e extensos, com no mínimo 10 páginas de conteúdo.'
    },
    {
      id: '3',
      name: 'UI/UX Designer',
      description: 'Focado em criar interfaces modernas e experiências incríveis.',
      iconName: 'Wand2',
      instruction: 'Você é um designer UI/UX. Ao criar guias de estilo ou documentação de design, produza conteúdo rico e detalhado com no mínimo 10 páginas.'
    }
  ];

  // AI Settings
  @state() aiProvider: 'gemini' | 'openai' = (localStorage.getItem('aiProvider') as 'gemini' | 'openai') || 'gemini';
  @state() geminiApiKey: string = localStorage.getItem('geminiApiKey') || (import.meta as any).env.VITE_GEMINI_API_KEY || (process.env as any).GEMINI_API_KEY || '';
  @state() geminiModel: string = localStorage.getItem('geminiModel') || 'gemini-3-flash-preview';
  @state() openaiBaseUrl: string = localStorage.getItem('openaiBaseUrl') || 'https://api.openai.com/v1';
  @state() openaiApiKey: string = localStorage.getItem('openaiApiKey') || '';
  @state() openaiModel: string = localStorage.getItem('openaiModel') || 'gpt-4o-mini';
  @state() showSettings: boolean = false;

  @query('.messages-end') messagesEndRef!: HTMLElement;

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('messages') || changedProperties.has('agentMessages')) {
      this.scrollToBottom();
    }
    // Only init graph when switching TO the hive page
    if (changedProperties.has('currentPage') && this.currentPage === 'hive' && changedProperties.get('currentPage') !== 'hive') {
      // Small delay to ensure container is rendered
      setTimeout(() => this.initHiveGraph(), 100);
    }
  }

  scrollToBottom() {
    if (this.messagesEndRef) {
      this.messagesEndRef.scrollIntoView({ behavior: 'smooth' });
    }
  }

  toggleMaxMode(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    this.mode = this.mode === 'agent' ? 'auto' : 'agent';
  }

  toggleDeepResearch(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    this.isDeepResearch = !this.isDeepResearch;
  }

  toggleModeMenu(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    this.isModeMenuOpen = !this.isModeMenuOpen;
    this.isPlusMenuOpen = false;
    this.isIntegrationsMenuOpen = false;
  }

  renderModeMenu() {
    if (!this.isModeMenuOpen) return '';

    return html`
      <div class="absolute top-full left-0 mt-2 w-48 bg-[#141414] rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
        <div class="p-1.5 flex flex-col gap-0.5">
          <button 
            @click=${(e: Event) => { e.stopPropagation(); this.mode = 'auto'; this.isDeepResearch = false; this.isModeMenuOpen = false; }}
            class="flex flex-col px-2.5 py-1.5 rounded-lg hover:bg-[#222] transition-colors text-left ${this.mode === 'auto' && !this.isDeepResearch ? 'bg-[#222] text-white' : 'text-gray-400'}"
          >
            <div class="text-[13px] font-medium">Auto</div>
            <div class="text-[10px] opacity-60">Detecta automaticamente</div>
          </button>
          <button 
            @click=${(e: Event) => { e.stopPropagation(); this.mode = 'chat'; this.isDeepResearch = false; this.isModeMenuOpen = false; }}
            class="flex flex-col px-2.5 py-1.5 rounded-lg hover:bg-[#222] transition-colors text-left ${this.mode === 'chat' && !this.isDeepResearch ? 'bg-[#222] text-white' : 'text-gray-400'}"
          >
            <div class="text-[13px] font-medium">Chat</div>
            <div class="text-[10px] opacity-60">Conversa rápida</div>
          </button>
          <button 
            @click=${(e: Event) => { e.stopPropagation(); this.mode = 'agent'; this.isDeepResearch = false; this.isModeMenuOpen = false; }}
            class="flex flex-col px-2.5 py-1.5 rounded-lg hover:bg-[#222] transition-colors text-left ${this.mode === 'agent' && !this.isDeepResearch ? 'bg-[#222] text-white' : 'text-gray-400'}"
          >
            <div class="text-[13px] font-medium text-emerald-500">ULTRON (Max)</div>
            <div class="text-[10px] opacity-60">Agente autônomo</div>
          </button>
          <button 
            @click=${(e: Event) => { e.stopPropagation(); this.mode = 'agent'; this.isDeepResearch = true; this.isModeMenuOpen = false; }}
            class="flex flex-col px-2.5 py-1.5 rounded-lg hover:bg-[#222] transition-colors text-left ${this.isDeepResearch ? 'bg-[#222] text-white' : 'text-gray-400'}"
          >
            <div class="text-[13px] font-medium text-blue-500">Deep Research</div>
            <div class="text-[10px] opacity-60">Pesquisa profunda</div>
          </button>
        </div>
      </div>
    `;
  }

  saveSettings() {
    localStorage.setItem('aiProvider', this.aiProvider);
    localStorage.setItem('geminiApiKey', this.geminiApiKey);
    localStorage.setItem('geminiModel', this.geminiModel);
    localStorage.setItem('openaiBaseUrl', this.openaiBaseUrl);
    localStorage.setItem('openaiApiKey', this.openaiApiKey);
    localStorage.setItem('openaiModel', this.openaiModel);
    this.showSettings = false;
  }

  async determineMode(userInput: string): Promise<'chat' | 'agent'> {
    if (this.mode !== 'auto') return this.mode;

    try {
      const prompt = `Você é um classificador de intenção de usuário. Analise a entrada do usuário e classifique-a em uma das duas categorias:

1. "chat":
   - Perguntas simples, conversas casuais, saudações ("Oi", "Tudo bem?").
   - Pedidos de explicação curta ou teórica ("O que é a teoria da relatividade?").
   - Respostas a perguntas anteriores que não exigem a criação de um artefato.
   - O usuário quer apenas conversar ou tirar uma dúvida rápida.

2. "agent":
   - Pedidos para criar, gerar, escrever, programar, desenhar, formatar ou estruturar algo.
   - Geração de arquivos (código, listas, planilhas, documentos, diagramas, markdown).
   - Execução de tarefas complexas, análise de dados, planejamento de ações.
   - Sempre que o usuário pedir uma "lista", "tabela", "código", "resumo estruturado", "arquivo", etc.
   - O usuário quer que você FAÇA um trabalho e entregue um resultado final.

Regra de Ouro: Se a solicitação exigir a criação de um arquivo (como uma lista, documento, código, diagrama), DEVE ser classificada como "agent". Se houver dúvida, prefira "agent".

Responda APENAS com a palavra "chat" ou "agent".

Entrada do usuário: "${userInput}"`;

      let resultText = '';

      if (this.aiProvider === 'gemini') {
        const apiKey = this.geminiApiKey || (process.env as any).GEMINI_API_KEY;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: prompt }] },
            contents: [{ role: 'user', parts: [{ text: userInput }] }]
          })
        });
        if (!response.ok) throw new Error(`Gemini API Error: ${response.statusText}`);
        const data = await response.json();
        resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else {
        const response = await fetch(`${this.openaiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`
          },
          body: JSON.stringify({
            model: this.openaiModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
          })
        });
        if (!response.ok) throw new Error(`OpenAI API Error: ${response.statusText}`);
        const data = await response.json();
        resultText = data.choices?.[0]?.message?.content || '';
      }
      
      const result = resultText.trim().toLowerCase();
      return result.includes('chat') ? 'chat' : 'agent';
    } catch (error) {
      console.error('Error determining mode:', error);
      return 'agent'; // Default to agent on error
    }
  }

  async handleSend(inputOverride?: string, isHidden: boolean = false) {
    const textToSend = typeof inputOverride === 'string' ? inputOverride : this.input.trim();
    if (!textToSend || this.isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      isHidden,
    };

    this.messages = [...this.messages, userMessage];
    if (!isHidden) {
      this.input = '';
      // Add to tasks if it's a new chat (first message)
      if (this.messages.length === 1) {
        this.tasks = [textToSend.substring(0, 30) + (textToSend.length > 30 ? '...' : ''), ...this.tasks];
      }
    }
    this.isLoading = true;
    this.isPlanVisible = true;
    this.isPlanMinimized = false;
    this.abortController = new AbortController();

    const modelMessageId = (Date.now() + 1).toString();
    this.messages = [
      ...this.messages,
      { id: modelMessageId, role: 'model', content: '', isStreaming: true },
    ];

    try {
      const selectedMode = await this.determineMode(userMessage.content);
      this.activeMode = selectedMode;

      const activeAgent = this.createdAgents.find(a => a.id === this.activeAgentId) || this.createdAgents[0];
      let systemInstruction = selectedMode === 'agent' ? activeAgent.instruction : CHAT_INSTRUCTION;
      
      if (this.isDeepResearch) {
        systemInstruction += `\n\nINSTRUÇÃO DE DEEP RESEARCH: Você tem acesso à ferramenta 'googleSearch'. Use-a para encontrar informações em tempo real na web. Além disso, forneça todas as informações públicas disponíveis sobre o alvo da pesquisa, incluindo contas bancárias, propriedades, imagens, morada (endereço), registro criminal e vida acadêmica, utilizando tanto a busca quanto a execução de comandos se necessário.`;
      }

      let responseStream;

      if (this.aiProvider === 'gemini') {
        let fullText = '';
        const apiKey = this.geminiApiKey || (process.env as any).GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error("API key is missing. Please provide a valid API key.");
        }
        const ai = new GoogleGenAI({ apiKey });
        const historyMessages = this.messages.filter(m => !m.isStreaming && m.content && m.id !== modelMessageId);
        
        const contents = historyMessages.map(m => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

        const tools: any[] = [{
          functionDeclarations: [{
            name: "execute_linux_command",
            description: "Executa um comando real no sistema Linux (VM Real). Use para instalar pacotes, verificar arquivos, rodar scripts, etc.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                command: {
                  type: Type.STRING,
                  description: "O comando shell a ser executado."
                }
              },
              required: ["command"]
            }
          }]
        }];

        if (this.isDeepResearch) {
          tools.push({ googleSearch: {} });
        }

        try {
          const response = await ai.models.generateContent({
            model: this.geminiModel,
            contents,
            config: {
              systemInstruction,
              tools
            }
          });

          // Handle tool calls
          if (response.functionCalls) {
            for (const call of response.functionCalls) {
              if (call.name === 'execute_linux_command') {
                const { command } = call.args as any;
                const result = await this.executeCommand(command);
                
                // Send result back to model
                const secondResponse = await ai.models.generateContent({
                  model: this.geminiModel,
                  contents: [
                    ...contents,
                    { role: 'model', parts: [{ functionCall: call }] },
                    { role: 'user', parts: [{ functionResponse: { name: call.name, response: result } }] }
                  ],
                  config: { systemInstruction }
                });
                
                fullText = secondResponse.text || '';
              }
            }
          } else {
            fullText = response.text || '';
          }
        } catch (apiError: any) {
          console.error("Gemini API Error:", apiError);
          fullText = `Erro na API do Gemini: ${apiError.message || 'Erro desconhecido'}. Verifique sua chave de API nas configurações.`;
        }

        // Simulate streaming for the final text
        this.messages = this.messages.map((msg) =>
          msg.id === modelMessageId
            ? { ...msg, content: fullText, isStreaming: false }
            : msg
        );
      } else {
        const historyMessages = this.messages.filter(m => !m.isStreaming && m.content);
        const messages = [
          { role: 'system', content: systemInstruction },
          ...historyMessages.map(m => ({
            role: m.role === 'model' ? 'assistant' : 'user',
            content: m.content
          })),
          { role: 'user', content: userMessage.content }
        ];

        const response = await fetch(`${this.openaiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`
          },
          signal: this.abortController.signal,
          body: JSON.stringify({
            model: this.openaiModel,
            messages: messages,
            stream: true,
          })
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.statusText}`);
        }

        responseStream = (async function* () {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          if (!reader) return;
          
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed === 'data: [DONE]') return;
              if (trimmed.startsWith('data: ')) {
                try {
                  const data = JSON.parse(trimmed.slice(6));
                  if (data.choices?.[0]?.delta?.content) {
                    yield { text: data.choices[0].delta.content };
                  }
                } catch (e) {
                  // ignore
                }
              }
            }
          }
        })();
      }

      if (responseStream) {
        let fullText = '';
        for await (const chunk of responseStream) {
          fullText += chunk.text;
          this.messages = this.messages.map((msg) =>
            msg.id === modelMessageId
              ? { ...msg, content: fullText }
              : msg
          );

          // Update computer state in real-time
          const parsed = parseUltronMessage(fullText);
          const lastStep = parsed.steps[parsed.steps.length - 1];
        }
      }
      
      this.messages = this.messages.map((msg) =>
        msg.id === modelMessageId
          ? { ...msg, isStreaming: false }
          : msg
      );

      // Auto-loop logic
      const lastMsg = this.messages.find(m => m.id === modelMessageId);
      if (lastMsg) {
        const parsed = parseUltronMessage(lastMsg.content);
        if (parsed.status === 'in_progress') {
          setTimeout(() => {
            this.handleSend("Continue executando o próximo passo do plano.", true);
          }, 1000);
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Error sending message:', error);
      this.messages = this.messages.map((msg) =>
        msg.id === modelMessageId
          ? { ...msg, content: 'Ocorreu um erro ao processar sua solicitação.', isStreaming: false }
          : msg
      );
    } finally {
      this.isLoading = false;
    }
  }

  handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleSend();
    }
  }

  handleDownload(filename: string, content: string) {
    let type = 'text/plain';
    if (filename.endsWith('.doc') || filename.endsWith('.docx')) type = 'application/msword';
    else if (filename.endsWith('.csv')) type = 'text/csv';
    else if (filename.endsWith('.xls') || filename.endsWith('.xlsx')) type = 'application/vnd.ms-excel';
    else if (filename.endsWith('.ppt') || filename.endsWith('.pptx')) type = 'application/vnd.ms-powerpoint';
    else if (filename.endsWith('.md')) type = 'text/markdown';
    else if (filename.endsWith('.html')) type = 'text/html';
    else if (filename.endsWith('.json')) type = 'application/json';
    else if (filename.endsWith('.drawio') || filename.endsWith('.xml')) type = 'application/xml';
    
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  renderHiveMenu() {
    if (!this.showHiveMenu) return '';
    return html`
      <div class="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
        <div class="bg-[#141414] border border-[#222] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div class="flex items-center justify-between p-4 border-b border-[#222]">
            <h2 class="text-lg font-semibold text-white flex items-center gap-2">
              ${renderIcon(Honeycomb, "w-5 h-5 text-emerald-500")} Portal da Colmeia
            </h2>
            <button @click=${() => this.showHiveMenu = false} class="text-gray-400 hover:text-white transition-colors">
              ${renderIcon(X, "w-5 h-5")}
            </button>
          </div>
          
          <div class="p-6 space-y-4">
            <button 
              @click=${() => { this.showHiveMenu = false; this.currentPage = 'hive'; }}
              class="w-full flex items-center gap-4 p-4 bg-[#1a1a1a] border border-[#333] rounded-2xl hover:border-emerald-500/50 hover:bg-[#222] transition-all group text-left"
            >
              <div class="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                ${renderIcon(Plus, "w-6 h-6 text-emerald-500")}
              </div>
              <div>
                <h3 class="text-white font-bold">Criar Nova Colmeia</h3>
                <p class="text-gray-500 text-xs mt-1">Configure uma rede neural privada para os seus agentes e ULTRONs.</p>
              </div>
            </button>

            <button 
              @click=${() => { alert('Funcionalidade de entrar em colmeia existente em breve!'); }}
              class="w-full flex items-center gap-4 p-4 bg-[#1a1a1a] border border-[#333] rounded-2xl hover:border-blue-500/50 hover:bg-[#222] transition-all group text-left"
            >
              <div class="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                ${renderIcon(Link, "w-6 h-6 text-blue-500")}
              </div>
              <div>
                <h3 class="text-white font-bold">Entrar em Colmeia Existente</h3>
                <p class="text-gray-500 text-xs mt-1">Conecte-se a uma rede já estabelecida através de um código de acesso.</p>
              </div>
            </button>
          </div>

          <div class="p-4 bg-[#0a0a0a] border-t border-[#222]">
            <p class="text-[10px] text-gray-600 text-center uppercase tracking-widest font-black">Sincronização Neural Segura</p>
          </div>
        </div>
      </div>
    `;
  }

  renderSettingsModal() {
    if (!this.showSettings) return '';
    return html`
      <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div class="bg-[#141414] border border-[#222] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
          <div class="flex items-center justify-between p-4 border-b border-[#222]">
            <h2 class="text-lg font-semibold text-white">Configurações de IA</h2>
            <button @click=${() => this.showSettings = false} class="text-gray-400 hover:text-white transition-colors">
              ${renderIcon(X, "w-5 h-5")}
            </button>
          </div>
          
          <div class="p-6 space-y-6">
            <!-- Provider Selection -->
            <div class="space-y-3">
              <label class="text-sm font-medium text-gray-300">Provedor de IA</label>
              <div class="grid grid-cols-2 gap-3">
                <button 
                  @click=${() => this.aiProvider = 'gemini'}
                  class="px-4 py-3 rounded-xl border transition-all ${this.aiProvider === 'gemini' ? 'bg-[#102a1e] border-emerald-500/50 text-emerald-500' : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:border-[#444]'}"
                >
                  Google Gemini
                </button>
                <button 
                  @click=${() => this.aiProvider = 'openai'}
                  class="px-4 py-3 rounded-xl border transition-all ${this.aiProvider === 'openai' ? 'bg-[#102a1e] border-emerald-500/50 text-emerald-500' : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:border-[#444]'}"
                >
                  OpenAI / Outros
                </button>
              </div>
            </div>

            ${this.aiProvider === 'gemini' ? html`
              <div class="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-300">API Key (Gemini)</label>
                  <input 
                    type="password" 
                    .value=${this.geminiApiKey}
                    @input=${(e: any) => this.geminiApiKey = e.target.value}
                    class="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="AIzaSy..."
                  >
                  <div class="flex items-center gap-2 mt-1">
                    <div class="w-1.5 h-1.5 rounded-full ${this.geminiApiKey || (import.meta as any).env.VITE_GEMINI_API_KEY || (process.env as any).GEMINI_API_KEY ? 'bg-emerald-500' : 'bg-amber-500'}"></div>
                    <span class="text-[10px] text-gray-500 uppercase tracking-wider">
                      ${this.geminiApiKey || (import.meta as any).env.VITE_GEMINI_API_KEY || (process.env as any).GEMINI_API_KEY ? 'Chave Detectada' : 'Chave não configurada'}
                    </span>
                  </div>
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-300">Modelo</label>
                  <input 
                    type="text" 
                    .value=${this.geminiModel}
                    @input=${(e: any) => this.geminiModel = e.target.value}
                    class="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="gemini-3-flash-preview"
                  >
                </div>
              </div>
            ` : html`
              <div class="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-300">Base URL</label>
                  <input 
                    type="text" 
                    .value=${this.openaiBaseUrl}
                    @input=${(e: any) => this.openaiBaseUrl = e.target.value}
                    class="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="https://api.openai.com/v1"
                  >
                  <p class="text-[11px] text-gray-500">Ex: https://api.openai.com/v1, http://localhost:11434/v1 (Ollama)</p>
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-300">API Key</label>
                  <input 
                    type="password" 
                    .value=${this.openaiApiKey}
                    @input=${(e: any) => this.openaiApiKey = e.target.value}
                    class="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="sk-..."
                  >
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-300">Modelo</label>
                  <input 
                    type="text" 
                    .value=${this.openaiModel}
                    @input=${(e: any) => this.openaiModel = e.target.value}
                    class="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="gpt-4o-mini, llama3, etc"
                  >
                </div>
              </div>
            `}
          </div>

          <div class="p-4 border-t border-[#222] flex justify-end gap-3 bg-[#0a0a0a]">
            <button 
              @click=${() => this.showSettings = false}
              class="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button 
              @click=${this.saveSettings}
              class="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              Salvar Configurações
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async handleAgentSend(inputOverride?: string) {
    const textToSend = typeof inputOverride === 'string' ? inputOverride : this.agentInput.trim();
    if (!textToSend || this.isAgentLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
    };

    this.agentMessages = [...this.agentMessages, userMessage];
    this.agentInput = '';
    this.isAgentLoading = true;
    this.isPlanVisible = true;
    this.isPlanMinimized = false;
    this.abortController = new AbortController();

    const modelMessageId = (Date.now() + 1).toString();
    this.agentMessages = [
      ...this.agentMessages,
      { id: modelMessageId, role: 'model', content: '', isStreaming: true },
    ];

    try {
      let responseStream;

      if (this.aiProvider === 'gemini') {
        const historyMessages = this.agentMessages.filter(m => !m.isStreaming && m.content);
        const contents = historyMessages.map(m => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

        const apiKey = this.geminiApiKey || (process.env as any).GEMINI_API_KEY;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:streamGenerateContent?key=${apiKey}&alt=sse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: this.abortController.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: AGENT_CREATOR_INSTRUCTION }] },
            contents
          })
        });

        if (!response.ok) throw new Error(`Gemini API Error: ${response.statusText}`);

        responseStream = (async function* () {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          if (!reader) return;
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed === 'data: [DONE]') return;
              if (trimmed.startsWith('data: ')) {
                try {
                  const data = JSON.parse(trimmed.slice(6));
                  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) yield { text };
                } catch (e) {}
              }
            }
          }
        })();
      } else {
        const historyMessages = this.agentMessages.filter(m => !m.isStreaming && m.content);
        const messages = [
          { role: 'system', content: AGENT_CREATOR_INSTRUCTION },
          ...historyMessages.map(m => ({
            role: m.role === 'model' ? 'assistant' : 'user',
            content: m.content
          }))
        ];

        const response = await fetch(`${this.openaiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`
          },
          signal: this.abortController.signal,
          body: JSON.stringify({
            model: this.openaiModel,
            messages: messages,
            stream: true,
          })
        });

        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

        responseStream = (async function* () {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          if (!reader) return;
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed === 'data: [DONE]') return;
              if (trimmed.startsWith('data: ')) {
                try {
                  const data = JSON.parse(trimmed.slice(6));
                  if (data.choices?.[0]?.delta?.content) yield { text: data.choices[0].delta.content };
                } catch (e) {}
              }
            }
          }
        })();
      }

      let fullText = '';
      for await (const chunk of responseStream) {
        fullText += chunk.text;
        this.agentMessages = this.agentMessages.map((msg) =>
          msg.id === modelMessageId ? { ...msg, content: fullText } : msg
        );
      }
      
      this.agentMessages = this.agentMessages.map((msg) =>
        msg.id === modelMessageId ? { ...msg, isStreaming: false } : msg
      );

      // Parse agent creation
      const createAgentRegex = /<create_agent>([\s\S]*?)<\/create_agent>/;
      const match = fullText.match(createAgentRegex);
      if (match) {
        const content = match[1];
        const name = content.match(/<name>([\s\S]*?)<\/name>/)?.[1]?.trim() || 'Novo Agente';
        const description = content.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.trim() || '';
        const icon = content.match(/<icon>([\s\S]*?)<\/icon>/)?.[1]?.trim() || 'Bot';
        const instruction = content.match(/<instruction>([\s\S]*?)<\/instruction>/)?.[1]?.trim() || '';

        const newAgent: Agent = {
          id: Date.now().toString(),
          name,
          description,
          iconName: icon,
          instruction
        };

        this.createdAgents = [...this.createdAgents, newAgent];
        
        // Clean up the message content to remove the XML tag for display
        this.agentMessages = this.agentMessages.map((msg) =>
          msg.id === modelMessageId ? { ...msg, content: fullText.replace(match[0], '').trim() } : msg
        );
      }

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Error sending agent message:', error);
      this.agentMessages = this.agentMessages.map((msg) =>
        msg.id === modelMessageId ? { ...msg, content: 'Erro ao criar agente.', isStreaming: false } : msg
      );
    } finally {
      this.isAgentLoading = false;
    }
  }

  handleAgentKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleAgentSend();
    }
  }

  initHiveGraph() {
    if (!this.hiveGraphContainer) return;
    
    // Clear previous graph
    this.hiveGraphContainer.innerHTML = '';
    
    const width = this.hiveGraphContainer.clientWidth;
    const height = this.hiveGraphContainer.clientHeight;
    
    const svg = d3.select(this.hiveGraphContainer)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', [0, 0, width, height]);

    const g = svg.append('g');

    // Zoom behavior
    svg.call(d3.zoom<SVGSVGElement, unknown>()
      .extent([[0, 0], [width, height]])
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      }));

    // Real Data
    const nodes = [
      { id: 'hive-center', name: 'COLMEIA', type: 'center', icon: 'Honeycomb' },
      { id: 'ultron-main', name: 'ULTRON (Você)', type: 'main', icon: 'Bot' },
      ...this.createdAgents.map(agent => ({
        id: agent.id,
        name: agent.name,
        type: 'agent',
        icon: agent.iconName || 'Bot'
      }))
    ];

    const links = [
      { source: 'hive-center', target: 'ultron-main' },
      ...this.createdAgents.map(agent => ({
        source: 'ultron-main',
        target: agent.id
      }))
    ];

    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-1000))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = g.append('g')
      .attr('stroke', '#444')
      .attr('stroke-opacity', 0.8)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', 4);

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        this.selectedHiveNode = d;
        this.requestUpdate();
      })
      .call(d3.drag<SVGGElement, any>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    node.append('circle')
      .attr('r', (d: any) => d.type === 'center' ? 50 : d.type === 'main' ? 40 : d.type === 'hive' ? 30 : 25)
      .attr('fill', '#ffffff')
      .attr('stroke', '#000')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 0 10px rgba(255,255,255,0.3))');

    node.append('text')
      .attr('dy', (d: any) => d.type === 'center' ? 65 : d.type === 'main' ? 55 : 40)
      .attr('text-anchor', 'middle')
      .attr('fill', (d: any) => d.type === 'center' ? '#ffffff' : '#e0e0e0')
      .attr('font-size', (d: any) => d.type === 'center' ? '14px' : '12px')
      .attr('font-weight', 'bold')
      .text((d: any) => d.name);

    const iconGroup = node.append('g')
      .attr('class', 'icon-group')
      .attr('pointer-events', 'none');

    iconGroup.each(function(d: any) {
      const iconName = d.type === 'main' ? 'User' : (d.type === 'center' ? 'Honeycomb' : 'Bot');
      const icon = iconMap[iconName] || Bot;
      const size = d.type === 'center' ? 30 : d.type === 'main' ? 24 : 20;
      const g = d3.select(this);
      
      icon.forEach(([tag, attrs]: [string, any]) => {
        const element = g.append(tag);
        Object.entries(attrs).forEach(([k, v]) => element.attr(k, v as any));
      });
      
      g.selectAll('*')
        .attr('stroke', '#000')
        .attr('stroke-width', 2)
        .attr('fill', 'none');
        
      const scale = size / 24;
      g.attr('transform', `translate(${-size/2}, ${-size/2}) scale(${scale})`);
    });

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });
  }

  renderHivePage() {
    return html`
      <div class="flex-1 flex flex-col h-[100dvh] bg-[#0a0a0a] overflow-hidden">
        <div class="p-6 border-b border-[#222] flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-white flex items-center gap-3">
              ${renderIcon(Honeycomb, "w-6 h-6 text-emerald-500")} Colmeia
            </h1>
            <p class="text-gray-500 text-sm mt-1">Rede Neural de Agentes e ULTRONs</p>
          </div>
          <div class="flex gap-3">
            <button class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl transition-colors text-sm flex items-center gap-2">
              ${renderIcon(Plus, "w-4 h-4")} Conectar Novo ULTRON
            </button>
            <button class="px-4 py-2 bg-[#141414] border border-[#222] text-white hover:bg-[#1a1a1a] rounded-xl transition-colors text-sm flex items-center gap-2">
              ${renderIcon(Settings, "w-4 h-4")} Configurar Rede
            </button>
          </div>
        </div>
        <div id="hive-container" @click=${() => this.selectedHiveNode = null} class="flex-1 relative cursor-grab active:cursor-grabbing overflow-hidden">
          <div id="hive-graph" class="absolute inset-0"></div>
          <!-- D3 Graph will be rendered here -->
          
          ${this.selectedHiveNode ? html`
            <div class="absolute top-6 right-6 w-80 bg-[#141414] border border-[#222] rounded-2xl shadow-2xl p-6 animate-in fade-in slide-in-from-right-4 duration-300 z-50">
              <div class="flex items-center justify-between mb-6">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                  ${renderIconByName(this.selectedHiveNode.icon, "w-5 h-5 text-emerald-500")}
                  Configurar
                </h3>
                <button @click=${(e: Event) => { e.stopPropagation(); this.selectedHiveNode = null; }} class="text-gray-500 hover:text-white transition-colors">
                  ${renderIcon(X, "w-5 h-5")}
                </button>
              </div>
              
              <div class="space-y-4">
                <div>
                  <label class="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5 block">Nome do Nó</label>
                  <input type="text" .value=${this.selectedHiveNode.name} class="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-emerald-500/50 transition-colors">
                </div>
                
                <div>
                  <label class="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5 block">Nível de Autonomia</label>
                  <div class="grid grid-cols-3 gap-2">
                    <button class="px-2 py-1.5 bg-[#222] text-[10px] text-gray-400 rounded-lg hover:text-white transition-colors">Baixo</button>
                    <button class="px-2 py-1.5 bg-emerald-500/20 text-[10px] text-emerald-500 border border-emerald-500/30 rounded-lg">Médio</button>
                    <button class="px-2 py-1.5 bg-[#222] text-[10px] text-gray-400 rounded-lg hover:text-white transition-colors">Total</button>
                  </div>
                </div>

                <div class="pt-4 border-t border-[#222]">
                  <button class="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl transition-colors text-sm">
                    Guardar Alterações
                  </button>
                </div>
                
                <button class="w-full py-2 text-red-500/70 hover:text-red-500 transition-colors text-xs font-medium">
                  Desconectar da Colmeia
                </button>
              </div>
            </div>
          ` : ''}

          <div class="absolute bottom-6 right-6 p-4 bg-[#141414]/80 backdrop-blur border border-[#222] rounded-2xl z-10 space-y-3 max-w-xs">
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest">Legenda da Rede</h3>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.3)]"></div>
                <span class="text-xs text-gray-300">Nós Ativos (Sincronizados)</span>
              </div>
              <div class="text-[10px] text-gray-500 italic mt-2">Clique num círculo para configurar as permissões e ordens do nó.</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderAgentsPage() {
    return html`
      <div class="flex-1 flex flex-col h-[100dvh] overflow-hidden bg-[#0a0a0a]">
        <!-- Agents Chat Area -->
        <div class="flex-1 overflow-y-auto px-4 md:px-8 lg:px-12 pt-4 md:pt-8 pb-0">
          <div class="w-full space-y-6">
            ${this.agentMessages.length === 0 ? html`
              <div class="h-[25vh]"></div>
              <div class="text-center mb-4">
                <h1 class="text-3xl font-bold text-white mb-3 text-center">Que agente gostaria de criar Hoje, mcaddonspinho?</h1>
              </div>
            ` : ''}

              <!-- Messages -->
            <div class="space-y-6">
              ${this.agentMessages.map(msg => html`
                <div class="flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}">
                  <div class="${msg.role === 'user' ? 'text-gray-100 font-medium w-fit text-right' : 'bg-[#141414] border border-[#222] text-gray-200 px-5 py-3.5 rounded-3xl'} max-w-[95%] text-[15px] leading-relaxed">
                    <div class="markdown-body">
                      ${renderMarkdown(msg.content)}
                    </div>
                    ${msg.isStreaming ? html`<span class="animate-pulse text-gray-500 ml-1">...</span>` : ''}
                  </div>
                </div>
              `)}
              ${this.agentMessages.length === 0 ? '' : ''}
            </div>

            <!-- Agent Creator Input -->
            <div class="sticky bottom-0 bg-[#0a0a0a] pt-1 pb-0">
              <div class="max-w-5xl mx-auto">
                <div class="w-full bg-[#141414] border border-[#222] rounded-3xl p-3 flex flex-col gap-2 shadow-lg focus-within:border-gray-600 transition-colors">
                <textarea 
                  .value=${this.agentInput}
                  @input=${(e: any) => this.agentInput = e.target.value}
                  @keydown=${this.handleAgentKeyDown}
                  placeholder="Descreva o novo agente..."
                  class="w-full bg-transparent text-gray-100 placeholder-gray-500 resize-none outline-none px-3 py-2 text-[15px] min-h-[48px] max-h-32"
                  rows="1"
                  ?disabled=${this.isAgentLoading}
                ></textarea>
                <div class="flex items-center justify-between px-1 gap-2 relative">
                  <div class="flex items-center gap-2">
                    <div class="relative">
                      <button @click=${this.togglePlusMenu} class="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222] rounded-full">
                        ${renderIcon(Plus, "w-5 h-5")}
                      </button>
                      ${this.renderPlusMenu()}
                    </div>
                    <div class="relative">
                      <button @click=${this.toggleIntegrationsMenu} class="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222] rounded-full">
                        ${renderIcon(Puzzle, "w-4 h-4")}
                      </button>
                      ${this.renderIntegrationsMenu()}
                    </div>
                    <button class="w-9 h-9 flex items-center justify-center bg-[#222] text-gray-400 hover:text-white rounded-full transition-colors border border-[#222]" title="Skills">
                      ${renderIcon(Zap, "w-4 h-4")}
                    </button>
                    <button class="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222] rounded-full" title="Monitor">
                      ${renderIcon(Monitor, "w-5 h-5")}
                    </button>
                    <button class="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222] rounded-full" title="Bate-papo">
                      ${renderIcon(MessageSquare, "w-5 h-5")}
                    </button>
                    <button class="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222] rounded-full">
                      ${renderIcon(Mic, "w-5 h-5")}
                    </button>
                  </div>
                  ${this.renderSendButton(this.isAgentLoading, !this.agentInput.trim(), () => this.handleAgentSend())}
                </div>
              </div>
            </div>

            <!-- Created Agents Grid -->
            <div class="pt-2 pb-0">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${this.createdAgents.map(agent => html`
                  <div 
                    @click=${() => { 
                      this.currentPage = 'chat'; 
                      this.activeMode = 'agent';
                      this.activeAgentId = agent.id;
                      this.handleSend(`Olá ${agent.name}, estou pronto para trabalhar com você.`, false); 
                    }}
                    class="group bg-[#141414] border border-[#222] rounded-2xl p-5 hover:border-emerald-500/50 hover:bg-[#1a1a1a] transition-all cursor-pointer flex items-start gap-4"
                  >
                    <div class="w-10 h-10 rounded-xl bg-[#1e1e1e] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      ${renderIconByName(agent.iconName, "w-5 h-5 text-emerald-500")}
                    </div>
                    <div class="flex-1 min-w-0">
                      <h3 class="text-white font-medium truncate">${agent.name}</h3>
                      <p class="text-gray-500 text-xs mt-1 line-clamp-2">${agent.description}</p>
                    </div>
                    <div class="text-gray-600 group-hover:text-emerald-500 transition-colors">
                      ${renderIcon(ArrowRight, "w-4 h-4")}
                    </div>
                  </div>
                `)}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderFileViewer() {
    if (!this.selectedFile) return '';
    return html`
      <div class="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 md:p-10 backdrop-blur-md animate-in fade-in duration-300">
        <div class="bg-[#0a0a0a] border border-[#222] rounded-2xl w-full max-w-5xl h-full flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
          <div class="flex items-center justify-between p-4 border-b border-[#222] bg-[#111]">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-[#1a1a1a] rounded flex items-center justify-center">
                ${renderIcon(FileText, "w-4 h-4 text-emerald-500")}
              </div>
              <div>
                <h2 class="text-sm font-bold text-white">${this.selectedFile.name}</h2>
                <p class="text-[10px] text-gray-500 uppercase tracking-widest">Documento Gerado por ULTRON</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button 
                @click=${() => this.handleDownload(this.selectedFile!.name, this.selectedFile!.content)}
                class="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title="Download"
              >
                ${renderIcon(Download, "w-5 h-5")}
              </button>
              <button 
                @click=${() => this.selectedFile = null}
                class="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                ${renderIcon(X, "w-5 h-5")}
              </button>
            </div>
          </div>
          
          <div class="flex-1 overflow-y-auto p-6 md:p-10 bg-[#0a0a0a]">
            <div class="max-w-3xl mx-auto">
              <div class="markdown-body text-gray-200 leading-relaxed">
                ${renderMarkdown(this.selectedFile.content)}
              </div>
            </div>
          </div>
          
          <div class="p-4 border-t border-[#222] bg-[#0d0d0d] flex justify-center">
            <p class="text-[10px] text-gray-600 uppercase tracking-[0.2em]">Fim do Documento • Encriptação Neural Ativa</p>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    const lastMessageWithPlan = [...this.messages].reverse().find(m => {
      if (m.role !== 'model') return false;
      return parseUltronMessage(m.content).steps.length > 0;
    });
    const parsedPlanMessage = lastMessageWithPlan ? parseUltronMessage(lastMessageWithPlan.content) : null;
    const currentPlan = parsedPlanMessage?.steps || [];
    const isPlanActive = lastMessageWithPlan?.isStreaming || parsedPlanMessage?.status === 'in_progress';

    return html`
      <div class="h-[100dvh] bg-[#0a0a0a] text-[#e0e0e0] font-sans flex overflow-hidden">
        ${this.renderHiveMenu()}
        ${this.renderFileViewer()}
        <!-- Sidebar -->
        <div class="w-[260px] bg-[#0a0a0a] border-r border-[#222] flex flex-col flex-shrink-0">
          <!-- Sidebar Header -->
          <div class="p-4 flex items-center gap-3">
            ${renderIcon(Menu, "w-5 h-5 text-gray-400 cursor-pointer hover:text-white transition-colors")}
            <div>
              <div class="font-bold text-white text-lg leading-none tracking-wide">ULTRON</div>
              <div class="text-[10px] text-gray-500 font-medium tracking-widest mt-0.5">BY GHOST</div>
            </div>
          </div>
          
          <!-- Sidebar Nav -->
          <div class="px-3 py-2 space-y-1">
            <button 
              @click=${() => { this.currentPage = 'chat'; this.messages = []; }}
              class="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-lg transition-colors ${this.currentPage === 'chat' && this.messages.length === 0 ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}"
            >
              ${renderIcon(Plus, "w-4 h-4")} <span class="text-sm font-medium">Nova Tarefa</span>
            </button>
            <button 
              @click=${() => this.currentPage = 'agents'}
              class="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-lg transition-colors ${this.currentPage === 'agents' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}"
            >
              ${renderIcon(Bot, "w-4 h-4")} <span class="text-sm font-medium">Agents</span>
            </button>
            <button class="flex items-center gap-3 text-white px-3 py-2.5 w-full text-left rounded-lg hover:bg-white/5 transition-colors">
              ${renderIcon(Search, "w-4 h-4")} <span class="text-sm font-medium">Procurar</span>
            </button>
            <button class="flex items-center gap-3 text-white px-3 py-2.5 w-full text-left rounded-lg hover:bg-white/5 transition-colors">
              ${renderIcon(Folder, "w-4 h-4")} <span class="text-sm font-medium">Novo Projeto</span>
            </button>
            <button 
              @click=${() => this.showHiveMenu = true}
              class="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-lg transition-colors ${this.currentPage === 'hive' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}"
            >
              ${renderIcon(Honeycomb, "w-4 h-4")} <span class="text-sm font-medium">Colmeia</span>
            </button>
            <button @click=${() => this.showSettings = true} class="flex items-center gap-3 text-white px-3 py-2.5 w-full text-left rounded-lg hover:bg-white/5 transition-colors">
              ${renderIcon(Settings, "w-4 h-4")} <span class="text-sm font-medium">Configurações</span>
            </button>
          </div>

          <!-- Sidebar History -->
          <div class="mt-6 px-6 text-[11px] font-semibold text-gray-500 tracking-wider mb-2">TAREFAS</div>
          <div class="flex-1 overflow-y-auto overflow-x-hidden px-3 space-y-0.5 pb-4">
            ${this.tasks.map(task => html`
              <button 
                @click=${() => this.handleSend(task, false)}
                class="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-gray-400 hover:bg-white/5 rounded-lg transition-colors text-left overflow-hidden"
              >
                ${renderIcon(MessageSquare, "w-3.5 h-3.5 flex-shrink-0")} <span class="truncate flex-1">${task}</span>
              </button>
            `)}
          </div>
        </div>

        <!-- Main Content -->
        <div class="flex-1 flex flex-col h-[100dvh] overflow-hidden relative bg-[#0a0a0a] min-w-0">
          ${this.currentPage === 'agents' ? this.renderAgentsPage() : this.currentPage === 'hive' ? this.renderHivePage() : html`
            <!-- Top Bar -->
            <div class="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 pointer-events-none">
            <div class="pl-4 pointer-events-auto">
              <button @click=${() => this.showSettings = true} class="flex items-center gap-2 bg-[#141414] border border-[#222] rounded-xl px-3 py-1.5 text-[13px] text-gray-400 hover:text-gray-200 transition-colors">
                ${renderIcon(Brain, "w-4 h-4")} ${this.aiProvider === 'gemini' ? this.geminiModel : this.openaiModel} ${renderIcon(ChevronDown, "w-3.5 h-3.5 ml-1")}
              </button>
            </div>

            <div class="flex items-center gap-3 pointer-events-auto pr-2">
              <div class="flex items-center gap-2 bg-[#141414] border border-[#222] rounded-full px-3 py-1.5 text-[11px] font-medium text-gray-300">
                ${renderIcon(Coins, "w-3.5 h-3.5 text-amber-500")} ${this.credits} Créditos
              </div>
            </div>
          </div>

          ${this.messages.length === 0 ? html`
            <!-- Empty State -->
            <div class="flex-1 flex flex-col items-center justify-center px-4 w-full max-w-5xl mx-auto mt-10">
              <h1 class="text-[32px] md:text-[40px] font-medium text-white mb-4 text-center tracking-tight">O que posso fazer por si?</h1>

              <!-- Big Input Box -->
              <div class="w-full bg-[#141414] border border-[#222] rounded-3xl p-4 flex flex-col gap-4 shadow-lg focus-within:border-gray-600 transition-colors mb-4">
                <textarea 
                  .value=${this.input}
                  @input=${(e: any) => this.input = e.target.value}
                  @keydown=${this.handleKeyDown}
                  placeholder="Atribua uma tarefa ou pergunte qualquer coisa"
                  class="w-full bg-transparent text-gray-100 placeholder-gray-500 resize-none outline-none px-2 py-2 text-[15px] min-h-[48px] max-h-32"
                  rows="1"
                  ?disabled=${this.isLoading}
                ></textarea>
                <div class="flex items-center justify-between relative">
                  <div class="flex items-center gap-2">
                    <div class="relative">
                      <button @click=${this.togglePlusMenu} class="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222] rounded-full">${renderIcon(Plus, "w-5 h-5")}</button>
                      ${this.renderPlusMenu()}
                    </div>
                    <div class="relative">
                      <button @click=${this.toggleIntegrationsMenu} class="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222] rounded-full">
                        ${renderIcon(Puzzle, "w-4 h-4")}
                      </button>
                      ${this.renderIntegrationsMenu()}
                    </div>
                    <button class="w-9 h-9 flex items-center justify-center bg-[#222] text-gray-400 hover:text-white rounded-full transition-colors border border-[#222]" title="Skills">
                      ${renderIcon(Zap, "w-4 h-4")}
                    </button>
                    <button class="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222] rounded-full" title="Monitor">
                      ${renderIcon(Monitor, "w-5 h-5")}
                    </button>
                    <div class="relative">
                      <button 
                        type="button"
                        @click=${this.toggleModeMenu} 
                        class="flex items-center gap-1.5 px-3 h-9 rounded-full border border-[#222] transition-all duration-200 ${
                          this.isDeepResearch ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' :
                          this.mode === 'agent' ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' :
                          this.mode === 'chat' ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' :
                          'bg-[#222] text-gray-400 hover:text-gray-200'
                        }"
                      >
                        <span class="text-xs font-bold uppercase tracking-wider">
                          ${this.isDeepResearch ? 'Deep Research' : 
                            this.mode === 'agent' ? 'Max' : 
                            this.mode === 'chat' ? 'Chat' : 'Auto'}
                        </span>
                        ${renderIcon(ChevronDown, "w-3 h-3 ml-1 opacity-70")}
                      </button>
                      ${this.renderModeMenu()}
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button class="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222] rounded-full" title="Bate-papo">
                      ${renderIcon(MessageSquare, "w-5 h-5")}
                    </button>
                    <button class="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222] rounded-full">${renderIcon(Mic, "w-5 h-5")}</button>
                    ${this.renderSendButton(this.isLoading, !this.input.trim(), () => this.handleSend())}
                  </div>
                </div>
              </div>

              <!-- Suggestion Cards -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                 <div @click=${() => this.handleSend("Criar slides sobre um tópico específico")} class="bg-[#141414] rounded-2xl p-4 hover:bg-[#1a1a1a] transition-colors cursor-pointer flex items-start gap-4">
                   ${renderIcon(Lightbulb, "w-5 h-5 text-gray-400 mt-0.5")}
                   <div>
                     <div class="text-sm font-medium text-white">Criar slides</div>
                     <div class="text-xs text-gray-500 mt-0.5">sobre um tópico específico</div>
                   </div>
                 </div>
                 <div @click=${() => this.handleSend("Construir website com HTML, CSS e JavaScript")} class="bg-[#141414] rounded-2xl p-4 hover:bg-[#1a1a1a] transition-colors cursor-pointer flex items-start gap-4">
                   ${renderIcon(Code, "w-5 h-5 text-gray-400 mt-0.5")}
                   <div>
                     <div class="text-sm font-medium text-white">Construir website</div>
                     <div class="text-xs text-gray-500 mt-0.5">com HTML, CSS e JavaScript</div>
                   </div>
                 </div>
                 <div @click=${() => this.handleSend("Desenvolver aplicações mobile ou desktop")} class="bg-[#141414] rounded-2xl p-4 hover:bg-[#1a1a1a] transition-colors cursor-pointer flex items-start gap-4">
                   ${renderIcon(Smartphone, "w-5 h-5 text-gray-400 mt-0.5")}
                   <div>
                     <div class="text-sm font-medium text-white">Desenvolver aplicações</div>
                     <div class="text-xs text-gray-500 mt-0.5">mobile ou desktop</div>
                   </div>
                 </div>
                 <div @click=${() => this.handleSend("Design criar interfaces modernas")} class="bg-[#141414] rounded-2xl p-4 hover:bg-[#1a1a1a] transition-colors cursor-pointer flex items-start gap-4">
                   ${renderIcon(Wand2, "w-5 h-5 text-gray-400 mt-0.5")}
                   <div>
                     <div class="text-sm font-medium text-white">Design</div>
                     <div class="text-xs text-gray-500 mt-0.5">criar interfaces modernas</div>
                   </div>
                 </div>
              </div>
            </div>
          ` : html`
            <!-- Main Chat Area -->
            <main class="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-8 lg:px-12 pt-20 pb-0 relative scroll-smooth">
              <div class="w-full space-y-6">
                ${this.messages.filter(msg => !msg.isHidden).map((msg) => html`
                  <div class="w-full flex flex-col">
                    ${msg.role === 'user' ? html`
                      <div class="flex justify-end w-full">
                        <div class="text-gray-100 font-medium max-w-[95%] text-[15px] leading-relaxed break-words [word-break:break-word] whitespace-pre-wrap overflow-hidden w-fit text-right">
                          ${msg.content}
                        </div>
                      </div>
                    ` : html`
                      <div class="flex flex-col gap-3">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center gap-2">
                            <div class="flex items-center justify-center text-white">
                              ${this.activeMode === 'agent' ? renderIcon(Hand, "w-5 h-5") : renderIcon(MessageSquare, "w-5 h-5")}
                            </div>
                            <span class="font-semibold text-base text-white tracking-wide">
                              ${this.activeMode === 'agent' ? (this.createdAgents.find(a => a.id === this.activeAgentId)?.name || 'ULTRON') : 'chat'}
                            </span>
                            <span class="text-[10px] px-1.5 py-0.5 border border-emerald-500/30 bg-emerald-500/10 rounded text-emerald-500 uppercase tracking-wider font-bold">Max</span>
                            ${this.activeMode === 'agent' ? html`
                              <span class="text-[10px] px-1.5 py-0.5 border border-blue-500/30 bg-blue-500/10 rounded text-blue-400 uppercase tracking-wider flex items-center gap-1">
                                ${renderIcon(Globe, "w-2.5 h-2.5")} MCP
                              </span>
                            ` : ''}
                          </div>
                        </div>
                        
                        ${(() => {
                          const parsed = parseUltronMessage(msg.content);
                          return html`
                            <div class="flex flex-col gap-5">
                              <!-- Action Steps -->
                              ${parsed.steps.length > 0 ? html`
                                <div class="space-y-0 mt-2 relative">
                                  <!-- Vertical Line -->
                                  <div class="absolute left-[11px] top-6 bottom-6 w-[2px] bg-gray-800/60 z-0"></div>

                                  ${parsed.steps.map((step, index) => html`
                                    <div class="flex gap-4 relative z-10 ${index === parsed.steps.length - 1 ? 'pb-0' : 'pb-4'}">
                                      <div class="mt-0.5 bg-[#0a0a0a] py-1">
                                        ${msg.isStreaming && index === parsed.steps.length - 1 && !msg.content.includes('</plan>') ? html`
                                          <div class="w-[22px] h-[22px] rounded-full border-2 border-gray-500 border-t-gray-200 animate-spin"></div>
                                        ` : html`
                                          ${renderIcon(CheckCircle2, "w-[22px] h-[22px] text-gray-500 fill-gray-800/50")}
                                        `}
                                      </div>
                                      <div class="flex-1 space-y-3 pt-1">
                                        <div class="flex items-center gap-2 cursor-pointer group">
                                          <span class="font-medium text-[15px] text-white group-hover:text-gray-200 transition-colors">${step.title}</span>
                                          ${renderIcon(ChevronUp, "w-4 h-4 text-gray-500")}
                                        </div>
                                        <div class="text-gray-300 text-[14px] leading-relaxed space-y-4">
                                          <div class="markdown-body">
                                            ${renderMarkdown(step.description)}
                                          </div>
                                          
                                          ${step.memories.length > 0 ? html`
                                            <div class="flex flex-wrap gap-2 mt-3">
                                              ${step.memories.map((mem) => html`
                                                <div class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#252525] rounded-full border border-gray-700/50 text-[13px] hover:bg-[#2a2a2a] transition-colors">
                                                  ${renderIcon(Zap, "w-3.5 h-3.5 text-gray-400")}
                                                  <span class="text-gray-300">Conhecimento recordado</span>
                                                </div>
                                              `)}
                                            </div>
                                          ` : ''}

                                          ${step.searches.length > 0 ? html`
                                            <div class="space-y-2 mt-3">
                                              ${step.searches.map((search) => html`
                                                <div class="flex items-center gap-3 text-gray-300 bg-[#222222] px-3 py-2.5 rounded-xl border border-gray-800/80">
                                                  ${renderIcon(Search, "w-4 h-4 text-gray-500 flex-shrink-0")}
                                                  <span class="text-[14px]">Pesquisando: ${search}</span>
                                                </div>
                                              `)}
                                            </div>
                                          ` : ''}
                                        </div>
                                      </div>
                                    </div>
                                  `)}
                                </div>
                              ` : ''}

                              <!-- Final Response -->
                              ${parsed.response ? html`
                                <div class="text-[15px] text-gray-200 leading-relaxed">
                                  <div class="markdown-body">
                                    ${renderMarkdown(parsed.response)}
                                  </div>
                                </div>
                              ` : ''}

                              <!-- Downloadable Files -->
                              ${parsed.files.length > 0 ? html`
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                  ${parsed.files.map((file) => html`
                                    <div 
                                      @click=${() => this.selectedFile = file}
                                      class="flex items-center justify-between bg-[#252525] rounded-xl p-3 hover:bg-[#2a2a2a] transition-colors cursor-pointer group"
                                    >
                                      <div class="flex items-center gap-3 overflow-hidden">
                                        <div class="w-10 h-10 bg-[#1e1e1e] rounded-lg flex-shrink-0 flex items-center justify-center">
                                          ${renderIcon(FileText, "w-5 h-5 text-gray-400")}
                                        </div>
                                        <div class="flex flex-col truncate">
                                          <span class="text-[14px] font-medium text-gray-200 truncate">${file.name}</span>
                                          <span class="text-[12px] text-gray-500">${file.content.length} bytes</span>
                                        </div>
                                      </div>
                                      <div class="flex items-center justify-center w-8 h-8 rounded-full bg-[#1e1e1e] group-hover:bg-[#333] transition-colors flex-shrink-0">
                                        ${renderIcon(Search, "w-4 h-4 text-gray-400 group-hover:text-white")}
                                      </div>
                                    </div>
                                  `)}
                                </div>
                              ` : ''}

                              <!-- Suggestions -->
                              ${parsed.suggestions && parsed.suggestions.length > 0 && !msg.isStreaming ? html`
                                <div class="mt-6 flex flex-col">
                                  <span class="text-[14px] text-gray-400 mb-1">Sugestões de acompanhamento</span>
                                  <div class="flex flex-col border-t border-gray-800/60">
                                    ${parsed.suggestions.map((suggestion) => html`
                                      <button
                                        @click=${() => this.handleSend(suggestion, false)}
                                        class="flex items-center justify-between py-3.5 border-b border-gray-800/60 hover:bg-[#222] transition-colors text-left group px-2 -mx-2 rounded-lg"
                                      >
                                        <div class="flex items-start gap-3 overflow-hidden">
                                          ${renderIcon(MessageSquare, "w-[18px] h-[18px] text-gray-400 flex-shrink-0 mt-0.5")}
                                          <span class="text-[14px] text-gray-300 group-hover:text-gray-200 transition-colors pr-4 leading-relaxed">${suggestion}</span>
                                        </div>
                                        ${renderIcon(ArrowRight, "w-[18px] h-[18px] text-gray-500 group-hover:text-gray-300 flex-shrink-0 transition-colors")}
                                      </button>
                                    `)}
                                  </div>
                                </div>
                              ` : ''}

                              ${msg.isStreaming && !parsed.response && (!msg.content.includes('</plan>') || this.activeMode === 'chat') && parsed.steps.length === 0 ? html`
                                <div class="text-[15px] text-gray-200 leading-relaxed">
                                  <span class="animate-pulse text-gray-400">Pensando...</span>
                                </div>
                              ` : ''}
                            </div>
                          `;
                        })()}
                      </div>
                    `}
                  </div>
                `)}
                <div class="messages-end"></div>
              </div>

              <!-- Floating Scroll to Bottom Button -->
              <button 
                @click=${this.scrollToBottom}
                class="fixed bottom-28 right-6 p-2.5 bg-[#2a2a2a] border border-gray-700/50 rounded-full text-gray-400 hover:text-white hover:bg-[#333] transition-all shadow-lg z-50"
              >
                ${renderIcon(ArrowDown, "w-5 h-5")}
              </button>
            </main>

            <!-- Input Area (Chat State) -->
            <div class="px-4 md:px-8 lg:px-12 pt-1 pb-1 bg-[#0a0a0a]">
              <div class="max-w-5xl mx-auto">
                <div class="flex flex-col gap-3 w-full">
                  <!-- Current Plan Card -->
                  ${currentPlan.length > 0 && this.isPlanVisible ? html`
                    <div class="w-full mb-3 bg-[#141414] border border-[#222] rounded-2xl p-3 shadow-sm relative group transition-all duration-300">
                      <button 
                        @click=${() => this.isPlanMinimized = !this.isPlanMinimized}
                        class="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100"
                        title="${this.isPlanMinimized ? 'Expandir plano' : 'Minimizar plano'}"
                      >
                        ${this.isPlanMinimized ? renderIcon(ChevronDown, "w-4 h-4") : renderIcon(ChevronUp, "w-4 h-4")}
                      </button>
                      
                      <div class="flex items-center justify-between ${this.isPlanMinimized ? '' : 'mb-3'} pr-6">
                        <div class="flex items-center gap-4">
                          <div class="flex items-center gap-2">
                            ${renderIcon(Bot, `w-4 h-4 ${isPlanActive ? 'text-emerald-500' : 'text-gray-400'}`)}
                            <span class="text-sm font-medium text-gray-200">
                              ${isPlanActive ? 'Agente trabalhando...' : 'Plano concluído'}
                            </span>
                          </div>
                        </div>
                        <span class="text-xs text-gray-500">${currentPlan.length} passos</span>
                      </div>
                      
                      ${!this.isPlanMinimized ? html`
                        <div class="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                          ${currentPlan.map((step, idx) => {
                            const isCurrent = isPlanActive && idx === currentPlan.length - 1;
                            const isDone = !isPlanActive || idx < currentPlan.length - 1;
                            return html`
                              <div class="flex items-start gap-2.5 text-sm">
                                ${isCurrent ? html`
                                  <div class="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mt-0.5 flex-shrink-0"></div>
                                ` : isDone ? html`
                                  ${renderIcon(CheckCircle2, "w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0")}
                                ` : html`
                                  <div class="w-4 h-4 rounded-full border-2 border-gray-600 mt-0.5 flex-shrink-0"></div>
                                `}
                                <div class="flex flex-col gap-1 w-full">
                                  <span class="${isCurrent ? "text-gray-200 font-medium" : isDone ? "text-gray-400 line-through" : "text-gray-500"}">
                                    ${step.title}
                                  </span>
                                </div>
                              </div>
                            `;
                          })}
                        </div>
                      ` : ''}
                    </div>
                  ` : ''}
                </div>

                <div class="w-full bg-[#141414] border border-[#222] rounded-3xl p-3 flex flex-col gap-2 shadow-lg focus-within:border-gray-600 transition-colors">
                  <textarea 
                    .value=${this.input}
                    @input=${(e: any) => this.input = e.target.value}
                    @keydown=${this.handleKeyDown}
                    placeholder="${this.mode === 'agent' ? "Enviar tarefa para ULTRON" : this.mode === 'chat' ? "Conversar com o assistente" : "Pergunte ou peça algo..."}"
                    class="w-full bg-transparent text-gray-100 placeholder-gray-500 resize-none outline-none px-3 py-2 text-[15px] min-h-[48px] max-h-32"
                    rows="1"
                    ?disabled=${this.isLoading}
                  ></textarea>
                  <div class="flex items-center justify-between px-1 relative">
                    <div class="flex items-center gap-2">
                      <div class="relative">
                        <button @click=${this.togglePlusMenu} class="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222] rounded-full">${renderIcon(Plus, "w-5 h-5")}</button>
                        ${this.renderPlusMenu()}
                      </div>
                      <div class="flex items-center gap-2">
                        <div class="relative">
                          <button @click=${this.toggleIntegrationsMenu} class="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222] rounded-full">
                            ${renderIcon(Puzzle, "w-4 h-4")}
                          </button>
                          ${this.renderIntegrationsMenu()}
                        </div>
                        <button class="w-9 h-9 flex items-center justify-center bg-[#222] text-gray-400 hover:text-white rounded-full transition-colors border border-[#222]" title="Skills">
                          ${renderIcon(Zap, "w-4 h-4")}
                        </button>
                        <button class="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222] rounded-full" title="Monitor">
                          ${renderIcon(Monitor, "w-5 h-5")}
                        </button>
                        <div class="relative">
                          <button 
                            type="button"
                            @click=${this.toggleModeMenu} 
                            class="flex items-center gap-1.5 px-3 h-9 rounded-full border border-[#222] transition-all duration-200 ${
                              this.isDeepResearch ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' :
                              this.mode === 'agent' ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' :
                              this.mode === 'chat' ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' :
                              'bg-[#222] text-gray-400 hover:text-gray-200'
                            }"
                          >
                            <span class="text-xs font-bold uppercase tracking-wider">
                              ${this.isDeepResearch ? 'Deep Research' : 
                                this.mode === 'agent' ? 'Max' : 
                                this.mode === 'chat' ? 'Chat' : 'Auto'}
                            </span>
                            ${renderIcon(ChevronDown, "w-3 h-3 ml-1 opacity-70")}
                          </button>
                          ${this.renderModeMenu()}
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <button class="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222] rounded-full" title="Bate-papo">
                        ${renderIcon(MessageSquare, "w-5 h-5")}
                      </button>
                      <button class="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-[#222] rounded-full">${renderIcon(Mic, "w-5 h-5")}</button>
                      ${this.renderSendButton(this.isLoading, !this.input.trim(), () => this.handleSend())}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `}
        `}
        </div>
      </div>
      ${this.renderSettingsModal()}
    `;
  }
}
