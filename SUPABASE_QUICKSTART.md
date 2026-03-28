# 🚀 Supabase - Guia Rápido de Instalação

## Passo 1: Executar Script SQL

1. Acesse: https://app.supabase.com/project/iskzruvdeqegerhphyec/sql/new
2. Copie todo o conteúdo do arquivo `supabase-setup.sql`
3. Cole no editor SQL
4. Clique em **Run** (ou pressione Ctrl+Enter)
5. Aguarde a mensagem: "Setup completo! Tabelas criadas com sucesso."

## Passo 2: Instalar Dependências

```bash
cd Ultron_K2
npm install
```

## Passo 3: Verificar Instalação

Execute no Supabase SQL Editor:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('oauth_tokens', 'service_credentials', 'webhooks', 'api_keys');
```

Você deve ver 4 tabelas listadas.

## Passo 4: Testar Conexão

Execute o script de teste:

```bash
npm run test-supabase
```

## Passo 5: Migrar Dados (Opcional)

Se você já tem dados no localStorage:

```bash
npm run migrate-to-supabase
```

## ✅ Pronto!

Agora o ULTRON está usando Supabase para armazenar:
- ✅ Tokens OAuth (GitHub, Google, etc.)
- ✅ Credenciais de serviços
- ✅ Webhooks
- ✅ API Keys

## 🔒 Segurança

- Todos os dados sensíveis são encriptados antes de serem enviados
- O arquivo `.kiro/settings/mcp.json` está protegido no `.gitignore`
- Row Level Security (RLS) está habilitado em todas as tabelas

## 📊 Monitorar Dados

Acesse o Supabase Dashboard:
- **Table Editor**: https://app.supabase.com/project/iskzruvdeqegerhphyec/editor
- **Logs**: https://app.supabase.com/project/iskzruvdeqegerhphyec/logs/explorer

## 🆘 Problemas?

Consulte o arquivo `SUPABASE_INTEGRATION.md` para troubleshooting detalhado.
