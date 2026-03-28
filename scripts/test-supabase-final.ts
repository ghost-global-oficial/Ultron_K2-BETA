/**
 * Teste Final da Conexão Supabase
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

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

async function test() {
  console.log('='.repeat(60));
  console.log('ULTRON - Teste Final Supabase');
  console.log('='.repeat(60));
  console.log('');
  console.log('📋 Projeto: Ghost systems Ultron service');
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log('');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('🔍 Testando tabelas...');
  console.log('');

  const tables = ['oauth_tokens', 'service_credentials', 'webhooks', 'api_keys'];

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: OK (${count || 0} registros)`);
      }
    } catch (err: any) {
      console.log(`   ❌ ${table}: ${err.message}`);
    }
  }

  console.log('');
  console.log('🔍 Testando inserção...');
  
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: 'test-user',
        service: 'test-service',
        key_encrypted: 'test-key-encrypted'
      })
      .select();

    if (error) {
      console.log(`   ❌ Erro ao inserir: ${error.message}`);
    } else {
      console.log(`   ✅ Inserção bem-sucedida!`);
      
      // Limpar teste
      if (data && data[0]) {
        await supabase.from('api_keys').delete().eq('id', data[0].id);
        console.log(`   ✅ Registro de teste removido`);
      }
    }
  } catch (err: any) {
    console.log(`   ❌ Erro: ${err.message}`);
  }

  console.log('');
  console.log('🎉 Teste concluído!');
  console.log('');
}

test();
