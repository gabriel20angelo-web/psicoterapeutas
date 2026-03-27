import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Paciente, Atividade } from '@/types/database';

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  // Validate: Brazilian numbers should be 12-13 digits (55 + DDD + number)
  if (withCountry.length < 12 || withCountry.length > 13) {
    return withCountry; // Return anyway, WhatsApp will handle validation
  }
  return withCountry;
}

export function fillTemplate(
  template: string,
  vars: { nome_paciente?: string; data_sessao?: string; horario_sessao?: string; nome_terapeuta?: string }
): string {
  let result = template;
  if (vars.nome_paciente) result = result.replace(/\{nome_paciente\}/g, vars.nome_paciente);
  if (vars.data_sessao) result = result.replace(/\{data_sessao\}/g, vars.data_sessao);
  if (vars.horario_sessao) result = result.replace(/\{horario_sessao\}/g, vars.horario_sessao);
  if (vars.nome_terapeuta) result = result.replace(/\{nome_terapeuta\}/g, vars.nome_terapeuta);
  return result;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const formattedPhone = formatPhone(phone);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encoded}`;
}

export function buildMessageVars(terapeuta: { nome: string } | { full_name: string }, paciente: Paciente, atividade?: Atividade) {
  const nomeTerapeuta = 'nome' in terapeuta ? terapeuta.nome : terapeuta.full_name;
  return {
    nome_paciente: paciente.nome,
    nome_terapeuta: nomeTerapeuta,
    data_sessao: atividade ? format(new Date(atividade.data_inicio), "dd/MM/yyyy (EEEE)", { locale: ptBR }) : '',
    horario_sessao: atividade ? format(new Date(atividade.data_inicio), 'HH:mm') : '',
  };
}
