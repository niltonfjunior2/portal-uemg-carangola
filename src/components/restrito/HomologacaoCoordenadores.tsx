'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  UserCheck,
  Mail,
  BadgeAlert,
  Clock,
  Send,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  ModalTransicaoMandato,
  CoordenadorItem,
} from './ModalTransicaoMandato';


interface SubstituicaoAlvo {
  solicitante: CoordenadorItem;
  titularAtual: CoordenadorItem;
}

export function HomologacaoCoordenadores() {
  const [coordenadores, setCoordenadores] = useState<CoordenadorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [mensagemAviso, setMensagemAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [substituicaoAlvo, setSubstituicaoAlvo] = useState<SubstituicaoAlvo | null>(null);

  const carregarCoordenadores = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/coordenadores');
      if (res.ok) {
        const data = await res.json();
        setCoordenadores(data.coordenadores || []);
      }
    } catch (err) {
      console.error('Erro ao carregar lista de coordenadores:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarCoordenadores();
  }, [carregarCoordenadores]);

  // Mapa de Coordenadores Ativos por Colegiado
  const coordenadorAtivoPorCurso = useMemo(() => {
    const mapa: Record<string, CoordenadorItem> = {};
    coordenadores.forEach((c) => {
      if (c.status === 'ativo') {
        mapa[c.cursoSigla.toUpperCase()] = c;
      }
    });
    return mapa;
  }, [coordenadores]);

  const handleDecisao = async (userId: string, acao: 'aprovar' | 'rejeitar' | 'reenviar_email') => {
    setProcessandoId(userId);
    setMensagemAviso(null);
    setSubstituicaoAlvo(null);

    try {
      const res = await fetch('/api/auth/coordenadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, acao }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensagemAviso({
          tipo: 'erro',
          texto: data.error || 'Falha ao processar homologação.',
        });
      } else {
        setMensagemAviso({
          tipo: 'sucesso',
          texto: data.message,
        });
        await carregarCoordenadores();
      }
    } catch (err) {
      console.error('Erro ao processar homologação:', err);
      setMensagemAviso({
        tipo: 'erro',
        texto: 'Falha na comunicação com o servidor de autenticação.',
      });
    } finally {
      setProcessandoId(null);
    }
  };

  const pendentes = coordenadores.filter((c) => c.status === 'pendente_aprovacao');
  const historico = coordenadores.filter((c) => c.status !== 'pendente_aprovacao');

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
      {/* Cabeçalho da Seção de Governança */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 mb-2">
            <UserCheck className="w-3.5 h-3.5 text-amber-700" />
            <span>Alçada Exclusiva da Direção Geral</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0B3B60]">
            Homologação de Coordenações de Curso
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Controle de governança para liberação e transição de mandato de coordenadores de colegiado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendentes.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-amber-500 text-white shadow-xs animate-pulse">
              <Clock className="w-3.5 h-3.5" />
              <span>{pendentes.length} Pendente{pendentes.length > 1 ? 's' : ''} de Aprovação</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sem pendências</span>
            </span>
          )}
        </div>
      </div>

      {/* Alerta de Feedback */}
      {mensagemAviso && (
        <div
          role="status"
          className={`p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-3 border transition-all ${
            mensagemAviso.tipo === 'sucesso'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          {mensagemAviso.tipo === 'sucesso' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{mensagemAviso.texto}</span>
        </div>
      )}

      {/* Fila de Solicitações Pendentes */}
      {loading ? (
        <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-[#0B3B60] border-t-transparent rounded-full animate-spin" />
          <span>Consultando registros de coordenação na base segura...</span>
        </div>
      ) : pendentes.length === 0 ? (
        <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <p className="text-sm font-bold text-slate-800">
            Todas as coordenações estão devidamente homologadas
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Novos cadastros realizados com o perfil de Coordenador de Curso surgirão automaticamente nesta fila para despacho da Direção Geral.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Solicitações Aguardando Homologação ({pendentes.length})</span>
          </h3>

          <div className="grid grid-cols-1 gap-4">
            {pendentes.map((coord) => {
              const titularAtual = coordenadorAtivoPorCurso[coord.cursoSigla.toUpperCase()];
              const temTitularAtivo = !!titularAtual && titularAtual.id !== coord.id;

              return (
                <div
                  key={coord.id}
                  className="p-5 rounded-2xl border-2 border-amber-300 bg-amber-50/20 shadow-xs flex flex-col gap-4 transition-all hover:border-amber-400"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-extrabold text-[#0B3B60]">
                          {coord.nomeCompleto}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0B3B60] text-white">
                          {coord.cursoSigla} — {coord.cursoNome}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(coord.solicitadoEm).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate" title={coord.emailInstitucional}>
                            {coord.emailInstitucional}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-amber-900 font-medium">
                          <Send className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate" title={`E-mail de recuperação: ${coord.emailSecundario}`}>
                            Alt: {coord.emailSecundario}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <BadgeAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>MASP/Matrícula: <strong>{coord.matricula}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação Direta da Direção */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-amber-200">
                      <button
                        type="button"
                        disabled={processandoId === coord.id}
                        onClick={() => {
                          if (temTitularAtivo) {
                            setSubstituicaoAlvo({ solicitante: coord, titularAtual });
                          } else {
                            handleDecisao(coord.id, 'aprovar');
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer ${
                          temTitularAtivo
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {temTitularAtivo ? (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            <span>Substituir Titular</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Homologar Acesso</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={processandoId === coord.id}
                        onClick={() => handleDecisao(coord.id, 'rejeitar')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white border border-red-300 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span>Indeferir</span>
                      </button>
                    </div>
                  </div>

                  {/* Alerta de Transição de Mandato caso já exista titular ativo */}
                  {temTitularAtivo && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-100/70 border border-amber-300 text-amber-950 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <strong>Transição de Mandato:</strong> O colegiado de {coord.cursoNome} já possui o(a) <strong>{titularAtual.nomeCompleto}</strong> (MASP: {titularAtual.matricula}) como titular ativo. A homologação desta solicitação encerrará o mandato anterior e o transferirá para {coord.nomeCompleto}.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Diretriz Institucional de Entrega de E-mails */}
      <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-slate-700 text-xs flex items-start gap-2.5">
        <Mail className="w-4 h-4 text-[#0056B3] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Diretriz Institucional UEMG:</strong> Todas as mensagens automáticas do sistema são disparadas <strong>exclusivamente para o e-mail alternativo/pessoal cadastrado</strong> (Gmail, Outlook, etc.), contornando bloqueios de scripts do domínio institucional. Devido aos filtros dos provedores externos, o usuário deve sempre conferir a caixa de entrada, a aba <em>Promoções</em> e a pasta de <em>Spam / Lixo Eletrônico</em>.
        </div>
      </div>

      {/* Histórico Recente de Coordenações Homologadas */}
      {historico.length > 0 && (
        <div className="pt-4 border-t border-slate-100">
          <details className="text-xs group" open>
            <summary className="font-bold text-slate-500 hover:text-[#0B3B60] cursor-pointer flex items-center gap-1.5 select-none py-1">
              <span>Coordenações homologadas / histórico departamental ({historico.length})</span>
            </summary>
            <div className="mt-3 space-y-2 pt-2">
              {historico.map((coord) => (
                <div
                  key={coord.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#0B3B60]">{coord.nomeCompleto}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-[#0056B3]">
                        {coord.cursoSigla} — {coord.cursoNome}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          coord.status === 'ativo'
                            ? 'bg-emerald-100 text-emerald-800'
                            : coord.status === 'mandato_encerrado'
                            ? 'bg-slate-200 text-slate-700 border border-slate-300'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {coord.status === 'ativo'
                          ? 'Homologado / Titular Ativo'
                          : coord.status === 'mandato_encerrado'
                          ? 'Mandato Encerrado (Docente/Autor)'
                          : 'Indeferido'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-500 text-[11px] flex-wrap">
                      <span>Institucional: {coord.emailInstitucional}</span>
                      <span>•</span>
                      <span className="text-amber-900 font-medium">
                        E-mail de Envio: <strong>{coord.emailSecundario}</strong>
                      </span>
                      {coord.substituidoPorNome && (
                        <>
                          <span>•</span>
                          <span className="text-slate-600 font-semibold">
                            Substituído(a) por: {coord.substituidoPorNome}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {coord.status === 'ativo' && (
                    <button
                      type="button"
                      disabled={processandoId === coord.id}
                      onClick={() => handleDecisao(coord.id, 'reenviar_email')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-bold text-[#0B3B60] transition-colors cursor-pointer shrink-0"
                      title={`Reenviar mensagem oficial para ${coord.emailSecundario}`}
                    >
                      <Send className="w-3 h-3 text-[#0056B3]" />
                      <span>{processandoId === coord.id ? 'Reenviando...' : 'Reenviar Notificação'}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Modal de Confirmação e Validação da Transição de Mandato pela Direção */}
      {substituicaoAlvo && (
        <ModalTransicaoMandato
          solicitante={substituicaoAlvo.solicitante}
          titularAtual={substituicaoAlvo.titularAtual}
          processando={processandoId === substituicaoAlvo.solicitante.id}
          aoFechar={() => setSubstituicaoAlvo(null)}
          aoConfirmar={() => handleDecisao(substituicaoAlvo.solicitante.id, 'aprovar')}
        />
      )}
    </div>
  );
}
