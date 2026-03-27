export interface WizardStep {
  id: string;
  q: string;
  sub: string;
  opts: { label: string; icon: string; desc: string; next?: string; result?: string }[];
}

export interface DocField {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  ph?: string;
  opts?: string[];
}

export interface DocNote {
  uso: string;
  quem: string;
  veda: string;
  base: string;
}

export interface DocDef {
  id: string;
  title: string;
  cat: number;
  icon: string;
  desc: string;
  note: DocNote;
  fields: DocField[];
}

export interface DocCategory {
  id: number;
  label: string;
  sub: string;
}

export const CATS: DocCategory[] = [
  { id: 0, label: "Documentos Psicológicos", sub: "Resolução CFP nº 06/2019" },
  { id: 1, label: "Registros Obrigatórios", sub: "Resolução CFP nº 01/2009" },
  { id: 2, label: "Documentos Auxiliares", sub: "Apêndices do Manual" },
];

export const WIZARD: WizardStep[] = [
  { id: "start", q: "Qual é a sua necessidade principal?", sub: "Selecione a opção que melhor descreve sua situação atual.", opts: [
    { label: "Preciso registrar atendimentos", icon: "📋", desc: "Prontuário ou registro de sessões e procedimentos", next: "reg" },
    { label: "Preciso emitir um documento solicitado", icon: "📝", desc: "Declaração, atestado, relatório, laudo ou parecer", next: "doc" },
    { label: "Preciso de um termo ou formulário auxiliar", icon: "📑", desc: "Termos, encaminhamentos e requerimentos", next: "aux" },
  ]},
  { id: "reg", q: "Como é o atendimento que você realiza?", sub: "Isso determina o tipo de registro mais adequado.", opts: [
    { label: "Atendimento individual", icon: "👤", desc: "Psicoterapia, avaliação ou acompanhamento individual", result: "prontuario" },
    { label: "Equipe multiprofissional", icon: "👥", desc: "Trabalho conjunto com profissionais de outras áreas", result: "prontuario_multi" },
  ]},
  { id: "doc", q: "O documento é resultado de avaliação psicológica formal?", sub: "Avaliação com uso sistemático de métodos, técnicas e instrumentos reconhecidos (Res. 31/2022).", opts: [
    { label: "Sim, é resultado de avaliação", icon: "🔍", desc: "Utilizei testes, escalas ou procedimentos formais de avaliação", next: "doc_av" },
    { label: "Não, é sobre intervenção ou acompanhamento", icon: "💬", desc: "Psicoterapia, acolhimento, visita domiciliar, estudo de caso", next: "doc_int" },
    { label: "É uma consulta técnica ou análise de documento", icon: "📊", desc: "Analisar documento de outro profissional ou responder questão teórica", result: "parecer" },
  ]},
  { id: "doc_av", q: "Qual nível de detalhamento é necessário?", sub: "A escolha entre atestado e laudo depende da profundidade da comunicação.", opts: [
    { label: "Comunicação sintética", icon: "✅", desc: "Apto/inapto, afastamento, justificativa de falta — sem detalhar procedimentos", result: "atestado" },
    { label: "Narrativa detalhada com análise", icon: "📖", desc: "Procedimentos, interpretação de dados, fundamentação e conclusão diagnóstica", result: "laudo" },
  ]},
  { id: "doc_int", q: "O que você precisa comunicar?", sub: "Cada situação exige um tipo diferente de documento.", opts: [
    { label: "Dados objetivos e pontuais", icon: "📌", desc: "Comparecimento, dias, horários — sem juízo clínico", result: "declaracao" },
    { label: "Atuação profissional detalhada", icon: "📄", desc: "Encaminhamento, estudo de caso, subsídio técnico", next: "doc_rel" },
  ]},
  { id: "doc_rel", q: "A atuação foi individual ou em equipe?", sub: "Isso determina se será relatório psicológico ou multiprofissional.", opts: [
    { label: "Atuação individual", icon: "👤", desc: "Somente eu realizei o atendimento ou acompanhamento", result: "relatorio" },
    { label: "Em equipe multiprofissional", icon: "👥", desc: "Trabalho conjunto com profissionais de outras áreas", result: "relatorio_multi" },
  ]},
  { id: "aux", q: "Qual situação se aplica?", sub: "Selecione o termo ou formulário adequado.", opts: [
    { label: "Informar usuário sobre serviço-escola", icon: "🏫", desc: "Ciência da natureza educacional e assistencial", result: "termo_ciencia" },
    { label: "Encaminhar a outro serviço", icon: "↗️", desc: "Indisponibilidade de vaga ou necessidade especializada", result: "encaminhamento" },
    { label: "Usuário solicita documento", icon: "📋", desc: "Requerimento formal de prontuário, relatório etc.", result: "requerimento" },
    { label: "Autorizar atendimento de menor", icon: "👶", desc: "Criança ou adolescente (menor de 18 anos)", result: "termo_autorizacao" },
    { label: "Comprovar entrega de documento", icon: "✋", desc: "Protocolar recebimento após devolutiva", result: "termo_entrega" },
  ]},
];

export const DOCS: DocDef[] = [
  { id: "declaracao", title: "Declaração", cat: 0, icon: "📄",
    desc: "Informações objetivas sobre prestação de serviço",
    note: { uso: "Registrar comparecimento, acompanhamento em realização, dias e horários.", quem: "Pessoa atendida, acompanhante, responsável legal, instituições.", veda: "É vedado informar sintomas, situações ou estados psicológicos.", base: "Res. CFP nº 06/2019, Art. 9º" },
    fields: [
      { id: "timbre", label: "Timbre da Instituição", type: "text", ph: "Nome da instituição (se aplicável)" },
      { id: "finalidade", label: "Finalidade específica", type: "text", ph: "Ex: comprovação de comparecimento junto à Empresa X" },
      { id: "nome", label: "Nome completo da pessoa", type: "text", ph: "Nome completo ou nome social" },
      { id: "cpf", label: "CPF", type: "text", ph: "000.000.000-00" },
      { id: "tipo", label: "Tipo de declaração", type: "select", opts: ["Comparecimento a atendimento", "Acompanhamento em realização", "Acompanhante de paciente"] },
      { id: "dataAtend", label: "Data do atendimento", type: "text", ph: "DD/MM/AAAA" },
      { id: "horario", label: "Horário", type: "text", ph: "Ex: das 16h às 17h" },
      { id: "servico", label: "Nome do serviço/clínica", type: "text", ph: "Serviço de Psicologia Aplicada" },
      { id: "frequencia", label: "Frequência (se acompanhamento)", type: "text", ph: "Ex: semanal, às quartas-feiras" },
      { id: "previsao", label: "Previsão de encerramento", type: "text", ph: "Ex: 26/08/2025 ou sem previsão definida" },
      { id: "nomePaciente", label: "Nome do paciente (se acompanhante)", type: "text", ph: "Nome completo do paciente acompanhado" },
      { id: "psiNome", label: "Nome da Psicóloga", type: "text", ph: "Nome completo" },
      { id: "psiCRP", label: "CRP", type: "text", ph: "CRP-XX/XXXXX" },
      { id: "local", label: "Local e data", type: "text", ph: "Ex: Natal, 31 de maio de 2025" },
    ]
  },
  { id: "atestado", title: "Atestado Psicológico", cat: 0, icon: "📋",
    desc: "Conclusão técnica resultante de avaliação psicológica",
    note: { uso: "Justificar faltas, atestar aptidão/inaptidão, solicitar afastamento.", quem: "Pessoa atendida, responsável legal, empregador, Poder Judiciário.", veda: "Emitir sem avaliação psicológica (Res. 31/2022). CID facultativo.", base: "Res. CFP nº 06/2019, Art. 10" },
    fields: [
      { id: "timbre", label: "Timbre da Instituição", type: "text", ph: "(se aplicável)" },
      { id: "finalidade", label: "Finalidade", type: "text", ph: "Ex: comprovação junto ao trabalho" },
      { id: "nome", label: "Nome da pessoa atendida", type: "text", ph: "Nome completo ou nome social" },
      { id: "idade", label: "Idade", type: "text", ph: "Ex: 35 anos" },
      { id: "cpf", label: "CPF", type: "text", ph: "000.000.000-00" },
      { id: "conclusao", label: "Conclusão técnica", type: "textarea", ph: "Descreva a situação, estado ou funcionamento psicológico" },
      { id: "recomendacao", label: "Recomendação", type: "textarea", ph: "Ex: afastamento de atividades laborais por 7 dias" },
      { id: "validade", label: "Validade", type: "text", ph: "Prazo conforme normatização vigente" },
      { id: "psiNome", label: "Nome da Psicóloga", type: "text", ph: "Nome completo" },
      { id: "psiCRP", label: "CRP", type: "text", ph: "CRP-XX/XXXXX" },
      { id: "local", label: "Local e data", type: "text", ph: "Ex: São Paulo, 10 de junho de 2025" },
    ]
  },
  { id: "relatorio", title: "Relatório Psicológico", cat: 0, icon: "📑",
    desc: "Comunicação da atuação profissional — informativo, não diagnóstico",
    note: { uso: "Encaminhamentos, estudos de caso, subsídio a processos.", quem: "Pessoa atendida, instituições, Poder Judiciário, planos de saúde.", veda: "Não é descrição literal das sessões. Caráter informativo.", base: "Res. CFP nº 06/2019, Art. 11" },
    fields: [
      { id: "timbre", label: "Timbre da Instituição", type: "text", ph: "(se aplicável)" },
      { id: "subtitulo", label: "Subtítulo", type: "text", ph: "Ex: Relatório de Acompanhamento Psicológico" },
      { id: "nome", label: "Nome da pessoa atendida", type: "text", ph: "Nome completo ou nome social" },
      { id: "dataNasc", label: "Data de nascimento", type: "text", ph: "DD/MM/AAAA" },
      { id: "idade", label: "Idade", type: "text", ph: "XX anos" },
      { id: "doc", label: "Documento", type: "text", ph: "CPF ou RG nº" },
      { id: "responsavel", label: "Responsável legal", type: "text", ph: "Nome completo (se aplicável)" },
      { id: "outrasInfo", label: "Outras informações", type: "text", ph: "Escolaridade, profissão, estado civil" },
      { id: "solicitante", label: "Solicitante", type: "text", ph: "Quem solicitou o relatório" },
      { id: "finalidade", label: "Finalidade", type: "text", ph: "Razão ou motivo do pedido" },
      { id: "psiNome", label: "Autora (Psicóloga)", type: "text", ph: "Nome — CRP-XX/XXXXX" },
      { id: "demanda", label: "Descrição da Demanda", type: "textarea", ph: "O que motivou a busca, quem forneceu as informações..." },
      { id: "procedimentos", label: "Procedimentos", type: "textarea", ph: "Referencial teórico-metodológico, técnicas, nº de encontros..." },
      { id: "analise", label: "Análise", type: "textarea", ph: "Apresentação descritiva, narrativa e analítica..." },
      { id: "conclusao", label: "Conclusão", type: "textarea", ph: "Encaminhamento, orientação, sugestão de continuidade..." },
      { id: "validade", label: "Validade", type: "text", ph: "Indicar prazo de validade" },
      { id: "referencias", label: "Referências (facultativas)", type: "textarea", ph: "Referências bibliográficas em ABNT ou APA" },
      { id: "local", label: "Local e data", type: "text", ph: "Cidade, DD de mês de AAAA" },
    ]
  },
  { id: "relatorio_multi", title: "Relatório Multiprofissional", cat: 0, icon: "👥",
    desc: "Atuação em equipe multiprofissional/interdisciplinar",
    note: { uso: "Comunicar atuação conjunta — hospitalar, escolar, clínica.", quem: "Instituições, equipes, Poder Judiciário.", veda: "Procedimentos e Análise devem ter redação independente por profissional.", base: "Res. CFP nº 06/2019, Art. 11" },
    fields: [
      { id: "timbre", label: "Timbre da Instituição", type: "text", ph: "Nome da instituição" },
      { id: "subtitulo", label: "Subtítulo", type: "text", ph: "Ex: Relatório de Acompanhamento Multidisciplinar" },
      { id: "nome", label: "Pessoa/instituição atendida", type: "text", ph: "Nome completo" },
      { id: "dataNasc", label: "Data de nascimento / Idade", type: "text", ph: "DD/MM/AAAA — XX anos" },
      { id: "doc", label: "CPF/RG", type: "text", ph: "Documento de identificação" },
      { id: "solicitante", label: "Solicitante", type: "text", ph: "Quem solicitou" },
      { id: "finalidade", label: "Finalidade", type: "text", ph: "Razão do pedido" },
      { id: "autores", label: "Autores (todos os profissionais)", type: "textarea", ph: "Nome — CRP/Conselho nº" },
      { id: "demanda", label: "Descrição da Demanda", type: "textarea", ph: "Informações conjuntas sobre o que motivou o trabalho" },
      { id: "procPsi", label: "Procedimentos da Psicologia", type: "textarea", ph: "Procedimentos privativos da Psicologia" },
      { id: "procOutro", label: "Procedimentos das demais áreas", type: "textarea", ph: "Procedimentos dos outros profissionais" },
      { id: "analisePsi", label: "Análise da Psicologia", type: "textarea", ph: "Análise específica da psicóloga" },
      { id: "analiseOutro", label: "Análise das demais áreas", type: "textarea", ph: "Análise dos outros profissionais" },
      { id: "conclusao", label: "Conclusão", type: "textarea", ph: "Encaminhamento, orientação, validade temporal" },
      { id: "validade", label: "Validade", type: "text", ph: "Indicar prazo" },
      { id: "referencias", label: "Referências (facultativas)", type: "textarea", ph: "ABNT ou APA" },
      { id: "local", label: "Local e data", type: "text", ph: "Cidade, data" },
      { id: "psiNome", label: "Psicóloga (nome e CRP)", type: "text", ph: "Nome — CRP-XX/XXXXX" },
    ]
  },
  { id: "laudo", title: "Laudo Psicológico", cat: 0, icon: "🔍",
    desc: "Resultado de avaliação psicológica com fundamentação técnica",
    note: { uso: "Resultado de avaliação formal com testes e instrumentos.", quem: "Pessoa atendida, Poder Judiciário, empregador.", veda: "Emitir sem avaliação psicológica formal (Res. 31/2022).", base: "Res. CFP nº 06/2019, Art. 12" },
    fields: [
      { id: "timbre", label: "Timbre", type: "text", ph: "(se aplicável)" },
      { id: "subtitulo", label: "Subtítulo", type: "text", ph: "Ex: Laudo de Avaliação Psicológica" },
      { id: "nome", label: "Pessoa avaliada", type: "text", ph: "Nome completo" },
      { id: "dataNasc", label: "Data nascimento / Idade", type: "text", ph: "DD/MM/AAAA — XX anos" },
      { id: "doc", label: "CPF/RG", type: "text", ph: "Documento" },
      { id: "responsavel", label: "Responsável legal", type: "text", ph: "(se aplicável)" },
      { id: "outrasInfo", label: "Outras informações", type: "text", ph: "Escolaridade, profissão" },
      { id: "solicitante", label: "Solicitante", type: "text", ph: "Quem solicitou" },
      { id: "finalidade", label: "Finalidade", type: "text", ph: "Razão da avaliação" },
      { id: "psiNome", label: "Autora", type: "text", ph: "Nome — CRP-XX/XXXXX" },
      { id: "demanda", label: "Descrição da Demanda", type: "textarea", ph: "Contexto e motivação" },
      { id: "procedimentos", label: "Procedimentos", type: "textarea", ph: "Instrumentos, testes, entrevistas" },
      { id: "analise", label: "Análise", type: "textarea", ph: "Interpretação dos resultados" },
      { id: "conclusao", label: "Conclusão", type: "textarea", ph: "Diagnóstico/conclusão técnica" },
      { id: "validade", label: "Validade", type: "text", ph: "Prazo" },
      { id: "referencias", label: "Referências (obrigatórias)", type: "textarea", ph: "ABNT ou APA" },
      { id: "local", label: "Local e data", type: "text", ph: "Cidade, data" },
    ]
  },
  { id: "parecer", title: "Parecer Psicológico", cat: 0, icon: "📊",
    desc: "Consulta técnica ou análise de documento",
    note: { uso: "Responder consultas técnicas, analisar documentos de outros profissionais.", quem: "Solicitante da consulta, instituições.", veda: "Não é parecer jurídico. Restrito ao campo da Psicologia.", base: "Res. CFP nº 06/2019, Art. 13" },
    fields: [
      { id: "timbre", label: "Timbre", type: "text", ph: "(se aplicável)" },
      { id: "subtitulo", label: "Subtítulo", type: "text", ph: "Ex: Parecer Técnico" },
      { id: "objeto", label: "Objeto do parecer", type: "text", ph: "Documento ou questão analisada" },
      { id: "solicitante", label: "Solicitante", type: "text", ph: "Quem solicitou" },
      { id: "finalidade", label: "Finalidade", type: "text", ph: "Razão do pedido" },
      { id: "psiNome", label: "Autora", type: "text", ph: "Nome — CRP-XX/XXXXX" },
      { id: "titulacao", label: "Titulação", type: "text", ph: "Especialização, mestrado etc." },
      { id: "demanda", label: "Descrição da Demanda", type: "textarea", ph: "Contexto e motivação" },
      { id: "analise", label: "Análise", type: "textarea", ph: "Fundamentação técnica" },
      { id: "conclusao", label: "Conclusão", type: "textarea", ph: "Resposta técnica" },
      { id: "referencias", label: "Referências (obrigatórias)", type: "textarea", ph: "ABNT ou APA" },
      { id: "local", label: "Local e data", type: "text", ph: "Cidade, data" },
    ]
  },
  { id: "prontuario", title: "Prontuário Psicológico", cat: 1, icon: "📓",
    desc: "Registro obrigatório de atendimento individual",
    note: { uso: "Registro de cada sessão/atendimento individual.", quem: "Uso exclusivo do profissional. Sigilo absoluto.", veda: "Compartilhar sem autorização. Deve ser guardado por 5 anos.", base: "Res. CFP nº 01/2009" },
    fields: [
      { id: "nome", label: "Nome do paciente", type: "text", ph: "Nome completo" },
      { id: "dataNasc", label: "Data de nascimento", type: "text", ph: "DD/MM/AAAA" },
      { id: "dataSessao", label: "Data da sessão", type: "text", ph: "DD/MM/AAAA" },
      { id: "queixaPrincipal", label: "Queixa principal", type: "textarea", ph: "Motivo da busca por atendimento" },
      { id: "observacoes", label: "Observações clínicas", type: "textarea", ph: "Registro da sessão, temas abordados, comportamento observado" },
      { id: "intervencoes", label: "Intervenções realizadas", type: "textarea", ph: "Técnicas aplicadas, orientações dadas" },
      { id: "plano", label: "Plano terapêutico", type: "textarea", ph: "Próximos passos, metas, frequência" },
      { id: "psiNome", label: "Psicóloga", type: "text", ph: "Nome — CRP-XX/XXXXX" },
    ]
  },
  { id: "prontuario_multi", title: "Prontuário Multiprofissional", cat: 1, icon: "👥",
    desc: "Registro de atendimento em equipe multiprofissional",
    note: { uso: "Registro de atendimento conjunto com outros profissionais.", quem: "Equipe multiprofissional. Sigilo compartilhado.", veda: "Informações privativas da Psicologia devem ser resguardadas.", base: "Res. CFP nº 01/2009" },
    fields: [
      { id: "nome", label: "Nome do paciente", type: "text", ph: "Nome completo" },
      { id: "dataSessao", label: "Data do atendimento", type: "text", ph: "DD/MM/AAAA" },
      { id: "equipe", label: "Profissionais presentes", type: "textarea", ph: "Nome — Conselho/Registro" },
      { id: "observacoes", label: "Observações gerais", type: "textarea", ph: "Registro do atendimento conjunto" },
      { id: "observacoesPsi", label: "Observações da Psicologia", type: "textarea", ph: "Aspectos privativos da atuação psicológica" },
      { id: "encaminhamentos", label: "Encaminhamentos", type: "textarea", ph: "Decisões e encaminhamentos da equipe" },
      { id: "psiNome", label: "Psicóloga", type: "text", ph: "Nome — CRP-XX/XXXXX" },
    ]
  },
  { id: "termo_ciencia", title: "Termo de Ciência", cat: 2, icon: "🏫",
    desc: "Ciência sobre natureza do serviço-escola",
    note: { uso: "Informar que o atendimento é parte de serviço-escola.", quem: "Pessoa atendida ou responsável legal.", veda: "Não substitui TCLE para pesquisa.", base: "Manual CFP 2025 — Apêndice" },
    fields: [
      { id: "nome", label: "Nome do usuário", type: "text", ph: "Nome completo" },
      { id: "servico", label: "Nome do serviço-escola", type: "text", ph: "Nome do serviço" },
      { id: "instituicao", label: "Instituição", type: "text", ph: "Nome da instituição de ensino" },
      { id: "condicoes", label: "Condições do atendimento", type: "textarea", ph: "Horários, frequência, supervisão, natureza educacional" },
      { id: "local", label: "Local e data", type: "text", ph: "Cidade, data" },
    ]
  },
  { id: "encaminhamento", title: "Encaminhamento", cat: 2, icon: "↗️",
    desc: "Encaminhamento a outro serviço ou profissional",
    note: { uso: "Quando não há vaga ou o caso requer especialidade diferente.", quem: "Outro serviço, profissional ou instituição.", veda: "Não é abandono do caso. Deve garantir continuidade.", base: "Manual CFP 2025 — Apêndice" },
    fields: [
      { id: "nome", label: "Nome do paciente", type: "text", ph: "Nome completo" },
      { id: "destinatario", label: "Destinatário", type: "text", ph: "Nome do serviço/profissional" },
      { id: "motivo", label: "Motivo do encaminhamento", type: "textarea", ph: "Razão pela qual o encaminhamento é necessário" },
      { id: "historico", label: "Breve histórico", type: "textarea", ph: "Resumo do acompanhamento realizado (sem quebra de sigilo)" },
      { id: "psiNome", label: "Psicóloga", type: "text", ph: "Nome — CRP-XX/XXXXX" },
      { id: "local", label: "Local e data", type: "text", ph: "Cidade, data" },
    ]
  },
  { id: "requerimento", title: "Requerimento", cat: 2, icon: "📋",
    desc: "Solicitação formal de documento pelo usuário",
    note: { uso: "Quando o usuário solicita formalmente um documento.", quem: "Pessoa atendida ou responsável legal.", veda: "Psicólogo deve responder em até 30 dias (CFP).", base: "Manual CFP 2025 — Apêndice" },
    fields: [
      { id: "nome", label: "Nome do solicitante", type: "text", ph: "Nome completo" },
      { id: "cpf", label: "CPF", type: "text", ph: "000.000.000-00" },
      { id: "docSolicitado", label: "Documento solicitado", type: "text", ph: "Ex: Relatório Psicológico" },
      { id: "finalidade", label: "Finalidade", type: "text", ph: "Para que será usado" },
      { id: "local", label: "Local e data", type: "text", ph: "Cidade, data" },
    ]
  },
  { id: "termo_autorizacao", title: "Termo de Autorização", cat: 2, icon: "👶",
    desc: "Autorização para atendimento de menor de idade",
    note: { uso: "Atendimento de criança ou adolescente.", quem: "Responsável legal do menor.", veda: "Atendimento sem autorização pode configurar infração ética.", base: "ECA + Código de Ética do Psicólogo" },
    fields: [
      { id: "nomeResponsavel", label: "Nome do responsável", type: "text", ph: "Nome completo" },
      { id: "cpfResponsavel", label: "CPF do responsável", type: "text", ph: "000.000.000-00" },
      { id: "nomeMenor", label: "Nome do menor", type: "text", ph: "Nome completo" },
      { id: "dataNasc", label: "Data de nascimento do menor", type: "text", ph: "DD/MM/AAAA" },
      { id: "servico", label: "Serviço/clínica", type: "text", ph: "Nome do serviço" },
      { id: "local", label: "Local e data", type: "text", ph: "Cidade, data" },
    ]
  },
  { id: "termo_entrega", title: "Termo de Entrega", cat: 2, icon: "✋",
    desc: "Comprovação de entrega de documento após devolutiva",
    note: { uso: "Protocolar que o documento foi entregue após devolutiva.", quem: "Pessoa atendida ou responsável legal.", veda: "A devolutiva é obrigatória antes da entrega.", base: "Res. CFP nº 06/2019" },
    fields: [
      { id: "nome", label: "Nome do recebedor", type: "text", ph: "Nome completo" },
      { id: "cpf", label: "CPF", type: "text", ph: "000.000.000-00" },
      { id: "docEntregue", label: "Documento entregue", type: "text", ph: "Ex: Laudo Psicológico" },
      { id: "dataDevolutiva", label: "Data da devolutiva", type: "text", ph: "DD/MM/AAAA" },
      { id: "psiNome", label: "Psicóloga", type: "text", ph: "Nome — CRP-XX/XXXXX" },
      { id: "local", label: "Local e data", type: "text", ph: "Cidade, data" },
    ]
  },
];
