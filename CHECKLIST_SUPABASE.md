# ✅ Checklist de Instalação Supabase

## 📋 Pré-requisitos
- [ ] Node.js instalado
- [ ] Projeto Supabase criado
- [ ] Credenciais do Supabase em mãos

## 🔧 Instalação

### Passo 1: Configurar Banco de Dados
- [ ] Acessar Supabase SQL Editor
- [ ] Copiar conteúdo de `supabase-setup.sql`
- [ ] Executar script SQL
- [ ] Verificar mensagem de sucesso
- [ ] Confirmar 4 tabelas criadas

### Passo 2: Instalar Dependências
- [ ] Executar `npm install`
- [ ] Verificar instalação de `@supabase/supabase-js`
- [ ] Sem erros de instalação

### Passo 3: Configurar Credenciais
- [ ] Arquivo `.kiro/settings/mcp.json` criado
- [ ] Credenciais corretas no arquivo
- [ ] Arquivo protegido no `.gitignore`

### Passo 4: Testar Conexão
- [ ] Executar `npm run test-supabase`
- [ ] Todas as tabelas verificadas (✅)
- [ ] Sem erros de conexão

### Passo 5: Migrar Dados (Opcional)
- [ ] Executar `npm run migrate-to-supabase`
- [ ] Dados migrados com sucesso
- [ ] localStorage limpo

## 🔍 Verificação

### No Supabase Dashboard
- [ ] Acessar Table Editor
- [ ] Ver tabela `oauth_tokens`
- [ ] Ver tabela `service_credentials`
- [ ] Ver tabela `webhooks`
- [ ] Ver tabela `api_keys`

### No SQL Editor
```sql
-- Executar esta query
SELECT 
  (SELECT COUNT(*) FROM oauth_tokens) as oauth_tokens,
  (SELECT COUNT(*) FROM service_credentials) as credentials,
  (SELECT COUNT(*) FROM webhooks) as webhooks,
  (SELECT COUNT(*) FROM api_keys) as api_keys;
```
- [ ] Query executada sem erros
- [ ] Contadores exibidos

## 🚀 Uso

### Testar OAuth
- [ ] Iniciar aplicação: `npm run dev`
- [ ] Clicar no botão de puzzle
- [ ] Selecionar uma integração (ex: GitHub)
- [ ] Clicar em "Conectar"
- [ ] Autorizar no navegador
- [ ] Verificar conexão salva no Supabase

### Verificar Dados no Supabase
```sql
-- Ver tokens salvos
SELECT service, provider, created_at FROM oauth_tokens;
```
- [ ] Dados aparecem no Supabase
- [ ] Tokens encriptados
- [ ] Timestamps corretos

## 🔐 Segurança

### Arquivos Protegidos
- [ ] `.kiro/settings/mcp.json` no `.gitignore`
- [ ] `.env*` no `.gitignore`
- [ ] `supabase-credentials.json` no `.gitignore`
- [ ] `**/supabase-config.ts` no `.gitignore`

### Verificar Git
```bash
git status
```
- [ ] Nenhum arquivo de credenciais listado
- [ ] `.gitignore` atualizado

## 📊 Monitoramento

### Logs do Supabase
- [ ] Acessar Logs no Dashboard
- [ ] Ver requisições recentes
- [ ] Sem erros críticos

### Logs da Aplicação
- [ ] Console sem erros de Supabase
- [ ] Mensagens de sucesso ao salvar
- [ ] Encriptação funcionando

## 🎯 Funcionalidades

### OAuth
- [ ] Conectar GitHub
- [ ] Conectar Google (Gmail)
- [ ] Conectar Microsoft (Outlook)
- [ ] Tokens salvos no Supabase
- [ ] Refresh token funcionando

### Credenciais
- [ ] Salvar credenciais de serviço
- [ ] Ler credenciais
- [ ] Senha encriptada
- [ ] Deletar credenciais

### Webhooks
- [ ] Criar webhook
- [ ] Listar webhooks
- [ ] Atualizar webhook
- [ ] Deletar webhook

## ✨ Extras

### MCP Server
- [ ] MCP configurado
- [ ] Comandos disponíveis
- [ ] Interação com Supabase via MCP

### Backup
- [ ] Dados duplicados (Supabase + localStorage)
- [ ] Fallback funcionando
- [ ] Sem perda de dados

## 🐛 Troubleshooting

Se algo não funcionar:

1. **Erro de conexão**
   - [ ] Verificar credenciais
   - [ ] Verificar script SQL executado
   - [ ] Verificar projeto Supabase ativo

2. **Tabelas não existem**
   - [ ] Executar `supabase-setup.sql` novamente
   - [ ] Verificar no Table Editor

3. **Dados não aparecem**
   - [ ] Verificar `user_id` no console
   - [ ] Verificar políticas RLS
   - [ ] Executar query SQL direta

4. **Encriptação falha**
   - [ ] Executar `npm run init-credentials`
   - [ ] Verificar chave gerada

## 🎉 Conclusão

- [ ] Todas as verificações passaram
- [ ] Aplicação funcionando
- [ ] Dados seguros no Supabase
- [ ] Sem vulnerabilidades

---

**Data de Instalação**: _______________

**Instalado por**: _______________

**Notas**: 
_______________________________________
_______________________________________
_______________________________________
