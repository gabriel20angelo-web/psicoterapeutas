-- ANOTAÇÕES DE SESSÃO
CREATE TABLE anotacoes_sessao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terapeuta_id UUID NOT NULL REFERENCES terapeutas(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  atividade_id UUID REFERENCES atividades(id) ON DELETE SET NULL,
  data_sessao TIMESTAMPTZ NOT NULL,
  conteudo TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_anotacoes_sessao_paciente ON anotacoes_sessao(paciente_id);
CREATE INDEX idx_anotacoes_sessao_atividade ON anotacoes_sessao(atividade_id);

-- ANOTAÇÕES GERAIS DO CASO (texto livre)
CREATE TABLE anotacoes_caso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terapeuta_id UUID NOT NULL REFERENCES terapeutas(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(terapeuta_id, paciente_id)
);

CREATE INDEX idx_anotacoes_caso_paciente ON anotacoes_caso(paciente_id);

-- CANVAS (diagramas)
CREATE TABLE canvas_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terapeuta_id UUID NOT NULL REFERENCES terapeutas(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  atividade_id UUID REFERENCES atividades(id) ON DELETE SET NULL,
  storage_key TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(terapeuta_id, storage_key)
);

CREATE INDEX idx_canvas_paciente ON canvas_data(paciente_id);

-- Enable RLS
ALTER TABLE anotacoes_sessao ENABLE ROW LEVEL SECURITY;
ALTER TABLE anotacoes_caso ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_data ENABLE ROW LEVEL SECURITY;

-- RLS policies: therapists can only access their own notes
CREATE POLICY "Terapeutas acessam próprias anotações de sessão"
  ON anotacoes_sessao FOR ALL
  USING (terapeuta_id = auth.uid());

CREATE POLICY "Terapeutas acessam próprias anotações de caso"
  ON anotacoes_caso FOR ALL
  USING (terapeuta_id = auth.uid());

CREATE POLICY "Terapeutas acessam próprios canvas"
  ON canvas_data FOR ALL
  USING (terapeuta_id = auth.uid());
