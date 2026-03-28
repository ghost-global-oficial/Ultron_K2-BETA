-- ============================================
-- ULTRON Supabase Database Setup
-- ============================================
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Habilitar extensão UUID (se não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Tabela: oauth_tokens
-- Armazena tokens OAuth de integrações
-- ============================================
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  service TEXT NOT NULL,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at BIGINT,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  config JSONB,
  user_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, service)
);

-- ============================================
-- Tabela: service_credentials
-- Armazena credenciais de serviços (Computer Use)
-- ============================================
CREATE TABLE IF NOT EXISTS service_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  service TEXT NOT NULL,
  email TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  extra JSONB,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, service)
);

-- ============================================
-- Tabela: webhooks
-- Armazena configurações de webhooks
-- ============================================
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST',
  service TEXT NOT NULL,
  events TEXT[] NOT NULL,
  headers JSONB,
  enabled BOOLEAN DEFAULT true,
  last_triggered TIMESTAMP WITH TIME ZONE,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Tabela: api_keys
-- Armazena API keys de serviços (Gemini, OpenAI, etc)
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  service TEXT NOT NULL,
  key_encrypted TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, service)
);

-- ============================================
-- Índices para Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_service ON oauth_tokens(user_id, service);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires ON oauth_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_service_credentials_user_service ON service_credentials(user_id, service);
CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_service ON webhooks(service);
CREATE INDEX IF NOT EXISTS idx_webhooks_enabled ON webhooks(enabled);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_service ON api_keys(user_id, service);

-- ============================================
-- Row Level Security (RLS)
-- Políticas abertas para desenvolvimento
-- ATENÇÃO: Ajuste conforme necessário para produção
-- ============================================
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Políticas abertas (permite todas as operações)
-- Para produção, você deve restringir por user_id
CREATE POLICY "Allow all operations on oauth_tokens" ON oauth_tokens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on service_credentials" ON service_credentials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on webhooks" ON webhooks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on api_keys" ON api_keys FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Função: Atualizar updated_at automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_oauth_tokens_updated_at BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_credentials_updated_at BEFORE UPDATE ON service_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Função: Limpar tokens expirados
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_tokens 
  WHERE expires_at IS NOT NULL 
    AND expires_at < EXTRACT(EPOCH FROM NOW()) * 1000
    AND refresh_token IS NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Comentários nas tabelas
-- ============================================
COMMENT ON TABLE oauth_tokens IS 'Armazena tokens OAuth de integrações (GitHub, Google, etc)';
COMMENT ON TABLE service_credentials IS 'Armazena credenciais encriptadas para Computer Use skills';
COMMENT ON TABLE webhooks IS 'Configurações de webhooks para automações';
COMMENT ON TABLE api_keys IS 'API keys encriptadas de serviços (Gemini, OpenAI, etc)';

-- ============================================
-- Verificação
-- ============================================
SELECT 'Setup completo! Tabelas criadas com sucesso.' AS status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('oauth_tokens', 'service_credentials', 'webhooks', 'api_keys');
