# 🚨 AÇÃO NECESSÁRIA: Executar Script SQL

## ✅ Boa Notícia
As credenciais estão corretas e o projeto Supabase está ativo!

## ⚠️ Próximo Passo OBRIGATÓRIO
Você precisa executar o script SQL para criar as tabelas no banco de dados.

## 📝 Instruções Passo a Passo

### 1. Abrir o SQL Editor do Supabase
Clique neste link ou copie e cole no navegador:
```
https://app.supabase.com/project/iskzruvdeqegerhphyec/sql/new
```

### 2. Copiar o Script SQL
Abra o arquivo `supabase-setup.sql` neste projeto e copie TODO o conteúdo.

Ou execute este comando para ver o conteúdo:
```bash
cat supabase-setup.sql
```

### 3. Colar no SQL Editor
- Cole todo o conteúdo do script no editor SQL do Supabase
- O script tem aproximadamente 200 linhas

### 4. Executar o Script
- Clique no botão **"Run"** (ou pressione Ctrl+Enter)
- Aguarde alguns segundos

### 5. Verificar Sucesso
Você deve ver a mensagem:
```
Setup completo! Tabelas criadas com sucesso.
```

E uma lista com 4 tabelas:
- oauth_tokens
- service_credentials  
- webhooks
- api_keys

### 6. Testar Novamente
Após executar o script SQL, volte ao terminal e execute:
```bash
npm run test-supabase-simple
```

Agora deve funcionar! ✅

## 🎯 O que o Script Faz

O script SQL cria:
- ✅ 4 tabelas para armazenar dados
- ✅ Índices para performance
- ✅ Row Level Security (RLS)
- ✅ Triggers para timestamps automáticos
- ✅ Função de limpeza de tokens expirados

## 🆘 Problemas?

Se encontrar algum erro ao executar o script:
1. Verifique se você está logado no Supabase
2. Confirme que está no projeto correto (iskzruvdeqegerhphyec)
3. Tente executar o script em partes menores
4. Me avise qual erro apareceu

## ✨ Depois de Executar

Após executar o script SQL com sucesso:
1. ✅ Teste a conexão: `npm run test-supabase-simple`
2. ✅ Inicie o ULTRON: `npm run dev`
3. ✅ Teste as integrações OAuth
4. ✅ Seus dados estarão seguros no Supabase!

---

**Link Direto para SQL Editor:**
https://app.supabase.com/project/iskzruvdeqegerhphyec/sql/new
