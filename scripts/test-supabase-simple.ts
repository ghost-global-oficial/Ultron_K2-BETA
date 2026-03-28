/**
 * Script Simples de Teste da Conexão Supabase
 * Testa apenas a conectividade básica
 */

import fetch from 'node-fetch';

// @ts-ignore
if (!globalThis.fetch) {
  // @ts-ignore
  globalThis.fetch = fetch;
}

// Carregar credenciais de variáveis de ambiente
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Erro: Credenciais do Supabase não configuradas!');
  console.error('');
  console.error('Configure as variáveis de ambiente:');
  console.error('  SUPABASE_URL=https://seu-projeto.supabase.co');
  console.error('  SUPABASE_ANON_KEY=sua-chave-anon');
  console.error('');
  console.error('Ou crie um arquivo .env na raiz do projeto.');
  process.exit(1);
}

async function testConnection() {
  console.log('='.repeat(60));
  console.log('ULTRON - Teste Simples de Conexão Supabase');
  console.log('='.repeat(60));
  console.log('');
  console.log('📋 Testando conexão com:');
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log('');

  try {
    // Teste 1: Verificar se o projeto está acessível
    console.log('🔍 Teste 1: Verificando se o projeto está acessível...');
    const healthCheck = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!healthCheck.ok) {
      throw new Error(`Projeto não acessível: ${healthCheck.status} ${healthCheck.statusText}`);
    }

    console.log('   ✅ Projeto acessível!');
    console.log('');

    // Teste 2: Verificar se as tabelas existem
    console.log('🔍 Teste 2: Verificando tabelas...');
    const tables = ['oauth_tokens', 'service_credentials', 'webhooks', 'api_keys'];

    for (const table of tables) {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count&limit=0`, {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'count=exact'
          }
        });

        if (response.ok) {
          console.log(`   ✅ ${table}: OK`);
        } else {
          const errorText = await response.text();
          console.log(`   ❌ ${table}: ${response.status} - ${errorText}`);
        }
      } catch (error: any) {
        console.log(`   ❌ ${table}: ${error.message}`);
      }
    }

    console.log('');
    console.log('🎉 Teste de conexão concluído!');
    console.log('');
    console.log('Se alguma tabela falhou, execute o script SQL:');
    console.log('1. Acesse: https://app.supabase.com/project/iskzruvdeqegerhphyec/sql/new');
    console.log('2. Copie o conteúdo de: supabase-setup.sql');
    console.log('3. Execute no SQL Editor');
    console.log('');

  } catch (error: any) {
    console.error('');
    console.error('❌ Erro no teste:', error.message);
    console.error('');
    console.error('Possíveis causas:');
    console.error('1. Projeto Supabase inativo ou pausado');
    console.error('2. Credenciais incorretas');
    console.error('3. Firewall bloqueando a conexão');
    console.error('4. Problema de rede');
    console.error('');
    console.error('Detalhes:', error);
    console.error('');
    process.exit(1);
  }
}

testConnection();
