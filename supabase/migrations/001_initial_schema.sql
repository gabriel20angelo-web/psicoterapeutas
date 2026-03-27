-- TERAPEUTAS
CREATE TABLE terapeutas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telefone TEXT,
  crp TEXT,
  especialidades TEXT[],
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PACIENTES
CREATE TABLE pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terapeuta_id UUID NOT NULL REFERENCES terapeutas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  data_nascimento DATE,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','espera')),
  contato_emergencia_nome TEXT,
  contato_emergencia_telefone TEXT,
  contato_emergencia_relacao TEXT,
  dia_fixo TEXT,
  horario_fixo TIME,
  modalidade TEXT DEFAULT 'presencial' CHECK (modalidade IN ('presencial','online','hibrido')),
  observacoes TEXT,
  data_inicio_atendimento DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pacientes_terapeuta ON pacientes(terapeuta_id);
CREATE INDEX idx_pacientes_status ON pacientes(status);

-- ATIVIDADES (Agenda Pessoal)
CREATE TABLE atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terapeuta_id UUID NOT NULL REFERENCES terapeutas(id) ON DELETE CASCADE,
  paciente_id UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('sessao','supervisao','pessoal','outro')),
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmada'
    CHECK (status IN ('confirmada','pendente','reagendada','cancelada','realizada','ausencia')),
  recorrencia TEXT DEFAULT 'nenhuma'
    CHECK (recorrencia IN ('nenhuma','semanal','quinzenal','mensal')),
  recorrencia_pai_id UUID REFERENCES atividades(id) ON DELETE SET NULL,
  motivo_cancelamento TEXT,
  nota_pos_sessao TEXT,
  presenca_registrada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_atividades_terapeuta ON atividades(terapeuta_id);
CREATE INDEX idx_atividades_data ON atividades(data_inicio);
CREATE INDEX idx_atividades_paciente ON atividades(paciente_id);

-- SUPERVISOES
CREATE TABLE supervisoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id UUID NOT NULL REFERENCES atividades(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_supervisoes_atividade ON supervisoes(atividade_id);
CREATE INDEX idx_supervisoes_paciente ON supervisoes(paciente_id);

-- ATIVIDADES COMUNIDADE
CREATE TABLE atividades_comunidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criador_id UUID NOT NULL REFERENCES terapeutas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL
    CHECK (categoria IN ('formacao_allos','grupo_estudos','intervisao','evento_externo','outro')),
  tipo TEXT NOT NULL DEFAULT 'comunidade' CHECK (tipo IN ('canonico','comunidade')),
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ NOT NULL,
  local_ou_link TEXT,
  max_participantes INT,
  recorrencia TEXT DEFAULT 'nenhuma'
    CHECK (recorrencia IN ('nenhuma','semanal','quinzenal','mensal')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- INSCRICOES COMUNIDADE
CREATE TABLE inscricoes_comunidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_comunidade_id UUID NOT NULL REFERENCES atividades_comunidade(id) ON DELETE CASCADE,
  terapeuta_id UUID NOT NULL REFERENCES terapeutas(id) ON DELETE CASCADE,
  inscrito_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(atividade_comunidade_id, terapeuta_id)
);

-- NOTIFICACOES
CREATE TABLE notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terapeuta_id UUID NOT NULL REFERENCES terapeutas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'lembrete_sessao','resumo_dia','confirmacao','paciente_inativo',
    'lembrete_supervisao','atividade_formacao','atividade_comunidade'
  )),
  titulo TEXT NOT NULL,
  mensagem TEXT,
  lida BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notificacoes_terapeuta ON notificacoes(terapeuta_id);
CREATE INDEX idx_notificacoes_lida ON notificacoes(lida);

-- TEMPLATES MENSAGEM
CREATE TABLE templates_mensagem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terapeuta_id UUID NOT NULL REFERENCES terapeutas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('confirmacao','cobranca','reagendamento','personalizado')),
  conteudo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
