/**
 * Script de Migração para Supabase
 * Migra dados do localStorage para o Supabase
 */

import { migrateFromLocalStorage } from '../src/supabase/oauth-store-supabase';

async function main() {
  console.log('='.repeat(60));
  console.log('ULTRON - Migração para Supabase');
  console.log('='.repeat(60));
  console.log('');

  try {
    console.log('Iniciando migração de dados OAuth...');
    await migrateFromLocalStorage();
    
    console.log('');
    console.log('✅ Migração concluída com sucesso!');
    console.log('');
    console.log('Próximos passos:');
    console.log('1. Verifique os dados no Supabase Dashboard');
    console.log('2. Teste as funcionalidades OAuth');
    console.log('3. Os dados antigos do localStorage foram removidos');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ Erro durante a migração:', error);
    console.error('');
    console.error('Os dados do localStorage não foram removidos.');
    console.error('Você pode tentar novamente executando: npm run migrate-to-supabase');
    console.error('');
    process.exit(1);
  }
}

main();
