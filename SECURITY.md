# 🔐 Security Architecture

ULTRON é um projeto open-source que requer integrações OAuth com serviços de terceiros. Este documento explica como mantemos as credenciais seguras.

## Arquitetura de Segurança

### 1. **Criptografia Local**
- Todas as credenciais OAuth são criptografadas usando **AES-256-GCM**
- Chaves de criptografia são derivadas de identificadores únicos da máquina
- Credenciais são armazenadas em `~/.ultron/credentials/` com permissões restritas (0600)

### 2. **Bring Your Own Keys (BYOK)**
- Usuários podem (e devem) usar suas próprias credenciais OAuth
- Credenciais padrão são apenas para facilitar o setup inicial
- Cada usuário pode configurar suas próprias apps OAuth

### 3. **Sem Secrets no Código**
- Nenhum secret é commitado no repositório
- `.env` contém apenas placeholders
- Secrets reais são criptografados localmente

## Como Funciona

### Para Desenvolvedores (Primeira Vez)

1. **Clone o repositório**
   ```bash
   git clone https://github.com/seu-usuario/ultron.git
   cd ultron
   npm install
   ```

2. **Inicialize as credenciais**
   ```bash
   npm run init-credentials
   ```
   
   Isso irá:
   - Criptografar as credenciais padrão fornecidas
   - Armazená-las em `~/.ultron/credentials/`
   - Usar chaves específicas da sua máquina

3. **Inicie o servidor**
   ```bash
   npm run dev
   ```

### Para Usuários Finais

1. **Configure suas próprias credenciais OAuth**
   - Vá em Settings > Integrations
   - Clique em "Add Your Own Credentials"
   - Insira Client ID e Client Secret das suas apps OAuth

2. **Suas credenciais são criptografadas automaticamente**
   - Armazenadas localmente em `~/.ultron/credentials/`
   - Criptografadas com chaves específicas da sua máquina
   - Nunca enviadas para servidores externos

## Criando Suas Próprias Apps OAuth

### Google (Gmail, Drive, Calendar)
1. Acesse: https://console.cloud.google.com/apis/credentials
2. Crie um novo projeto
3. Ative as APIs necessárias (Gmail, Drive, Calendar)
4. Crie credenciais OAuth 2.0
5. Adicione redirect URI: `http://localhost:3000/oauth/callback`

### GitHub
1. Acesse: https://github.com/settings/developers
2. Crie um novo OAuth App
3. Homepage URL: `http://localhost:3000`
4. Callback URL: `http://localhost:3000/oauth/callback`

### Slack
1. Acesse: https://api.slack.com/apps
2. Crie um novo app
3. Configure OAuth & Permissions
4. Adicione redirect URL: `http://localhost:3000/oauth/callback`

### Notion
1. Acesse: https://www.notion.so/my-integrations
2. Crie uma nova integração interna
3. Configure as capabilities necessárias

## Estrutura de Arquivos

```
~/.ultron/
└── credentials/
    ├── google.enc      # Credenciais Google criptografadas
    ├── github.enc      # Credenciais GitHub criptografadas
    ├── slack.enc       # Credenciais Slack criptografadas
    └── notion.enc      # Credenciais Notion criptografadas
```

## Algoritmos de Criptografia

- **Algoritmo**: AES-256-GCM (Galois/Counter Mode)
- **Derivação de Chave**: PBKDF2 com 100,000 iterações
- **Hash**: SHA-256
- **Salt**: 32 bytes aleatórios
- **IV**: 16 bytes aleatórios
- **Auth Tag**: 16 bytes

## Permissões de Arquivo

- Diretório de credenciais: `0700` (rwx------)
- Arquivos de credenciais: `0600` (rw-------)

## Boas Práticas

### ✅ Faça
- Use suas próprias credenciais OAuth para produção
- Mantenha o `.env` limpo (sem secrets)
- Revise permissões de arquivo regularmente
- Rotacione credenciais periodicamente

### ❌ Não Faça
- Não commite secrets no git
- Não compartilhe arquivos `.enc`
- Não use credenciais padrão em produção
- Não exponha credenciais em logs

## Auditoria de Segurança

Para verificar a segurança do seu ambiente:

```bash
npm run security-audit
```

Isso irá:
- Verificar permissões de arquivos
- Validar que não há secrets expostos
- Listar serviços configurados
- Verificar integridade das credenciais

## Reportando Vulnerabilidades

Se você encontrar uma vulnerabilidade de segurança:

1. **NÃO** abra uma issue pública
2. Envie email para: security@ultron.ai
3. Inclua detalhes da vulnerabilidade
4. Aguarde resposta em até 48 horas

## Conformidade

- **GDPR**: Dados armazenados localmente, usuário tem controle total
- **SOC 2**: Criptografia em repouso, controle de acesso
- **OWASP**: Seguimos as melhores práticas do OWASP Top 10

## Perguntas Frequentes

**P: Minhas credenciais são enviadas para algum servidor?**
R: Não. Todas as credenciais são armazenadas e criptografadas localmente.

**P: O que acontece se eu perder meu computador?**
R: As credenciais estão criptografadas com chaves específicas da máquina. Sem acesso físico ao computador, não podem ser descriptografadas.

**P: Posso usar ULTRON em múltiplas máquinas?**
R: Sim, mas você precisará configurar as credenciais em cada máquina separadamente.

**P: Como faço backup das minhas credenciais?**
R: Recomendamos anotar suas credenciais OAuth em um gerenciador de senhas seguro (1Password, Bitwarden, etc).

## Licença

Este projeto é open-source sob a licença MIT. Veja LICENSE para mais detalhes.

---

**Última atualização**: 2024
**Versão**: 1.0.0
