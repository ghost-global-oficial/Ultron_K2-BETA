/**
 * Script de Teste da Conexão Supabase
 */

// Polyfill para fetch em Node.js
import fetch from 'node-fetch';
// @ts-ignore
if (!globalThis.fetch) {
  // @ts-ignore
  globalThis.fetch = fetch;
}

import { getSupabaseClient, getCurrentUserId } from '../src/supabase/supabase-client';

async function main() {
  console.log('='.repeat(60));
  console.log('ULTRON - Teste de Conexão Supabase');
  console.log('='.repeat(60));
  console.log('');

  const userId = getCurrentUserId();

  console.log('📋 Informações:');
  console.log(`   User ID: ${userId}`);
  console.log(`   URL: https://iskzruvdeqegerhphyec.supabase.co`);
  console.log('');

  try {
    console.log('🔍 Testando conexão com Supabase...');
    
    const supabase = getSupabaseClient();

    // Testar conexão listando tabelas
    const { data: tables, error: tablesError } = await supabase
      .from('oauth_tokens')
      .select('count')
      .limit(0);

    if (tablesError) {
      throw new Error(`Erro ao conectar: ${tablesError.message}`);
    }

    console.log('✅ Conexão estabelecida com sucesso!');
    console.log('');

    // Testar cada tabela
    const tablesToTest = ['oauth_tokens', 'service_credentials', 'webhooks', 'api_keys'];
    
    console.log('🔍 Verificando tabelas...');
    for (const table of tablesToTest) {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(0);

      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: OK`);
      }
    }

    console.log('');
    console.log('🎉 Teste concluído com sucesso!');
    console.log('');
    console.log('Próximos passos:');
    console.log('1. Execute: npm run migrate-to-supabase (se tiver dados antigos)');
    console.log('2. Inicie o ULTRON: npm run dev');
    console.log('3. Teste as funcionalidades OAuth');
    console.log('');

  } catch (error: any) {
    console.error('');
    console.error('❌ Erro no teste:', error.message);
    console.error('');
    console.error('Verifique:');
    console.error('1. O script SQL foi executado no Supabase?');
    console.error('2. As credenciais estão corretas?');
    console.error('3. O projeto Supabase está ativo?');
    console.error('');
    console.error('Detalhes do erro:', error);
    console.error('');
    process.exit(1);
  }
}

main();
