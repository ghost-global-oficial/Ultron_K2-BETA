/**
 * Script de Debug da Conexão Supabase
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
  console.error('Configure as variáveis de ambiente ou arquivo .env');
  process.exit(1);
}

async function debug() {
  console.log('='.repeat(60));
  console.log('ULTRON - Debug Supabase');
  console.log('='.repeat(60));
  console.log('');

  // Teste 1: Verificar se o projeto responde
  console.log('🔍 Teste 1: Ping no projeto...');
  try {
    const response = await fetch(SUPABASE_URL);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log(`   Resposta: ${text.substring(0, 100)}...`);
  } catch (error: any) {
    console.log(`   ❌ Erro: ${error.message}`);
  }
  console.log('');

  // Teste 2: Verificar endpoint REST
  console.log('🔍 Teste 2: Testando endpoint REST...');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    console.log(`   Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log(`   Resposta: ${text.substring(0, 200)}`);
  } catch (error: any) {
    console.log(`   ❌ Erro: ${error.message}`);
  }
  console.log('');

  // Teste 3: Verificar se a chave é válida
  console.log('🔍 Teste 3: Validando chave...');
  console.log(`   Chave começa com: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
  console.log(`   Tamanho da chave: ${SUPABASE_ANON_KEY.length} caracteres`);
  
  // Decodificar JWT
  try {
    const parts = SUPABASE_ANON_KEY.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log(`   ✅ JWT válido!`);
      console.log(`   Issuer: ${payload.iss}`);
      console.log(`   Role: ${payload.role}`);
      console.log(`   Ref: ${payload.ref}`);
      console.log(`   Expira em: ${new Date(payload.exp * 1000).toLocaleString()}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Erro ao decodificar JWT: ${error.message}`);
  }
  console.log('');

  // Teste 4: Verificar status do projeto
  console.log('🔍 Teste 4: Verificando status do projeto...');
  console.log('   Acesse: https://app.supabase.com/project/iskzruvdeqegerhphyec');
  console.log('   Verifique se o projeto está:');
  console.log('   - ✅ Ativo (não pausado)');
  console.log('   - ✅ Sem erros');
  console.log('   - ✅ Com as tabelas criadas');
  console.log('');

  console.log('📋 Próximos passos:');
  console.log('1. Se o projeto estiver pausado, ative-o no dashboard');
  console.log('2. Execute o script SQL: supabase-setup.sql');
  console.log('3. Tente novamente: npm run test-supabase-simple');
  console.log('');
}

debug();
