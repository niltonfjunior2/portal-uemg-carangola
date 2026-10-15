'use client';

import React from 'react';
import { RefreshCw, ArrowRight, CheckCircle2, X } from 'lucide-react';

export interface CoordenadorItem {
  id: string;
  nomeCompleto: string;
  emailInstitucional: string;
  emailSecundario: string;
  matricula: string;
  cursoSigla: string;
  cursoNome: string;
  status: 'pendente_aprovacao' | 'ativo' | 'rejeitado' | 'mandato_encerrado';
  solicitadoEm: string;
  aprovadoEm?: string | null;
  substituidoPorNome?: string | null;
  mandatoEncerradoEm?: string | null;
}

interface ModalTransicaoMandatoProps {
  solicitante: CoordenadorItem;
  titularAtual: CoordenadorItem;
  processando: boolean;
  aoFechar: () => void;
  aoConfirmar: () => void;
}

export function ModalTransicaoMandato({
  solicitante,
  titularAtual,
  processando,
  aoFechar,
  aoConfirmar,
}: ModalTransicaoMandatoProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-substituicao"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200 shadow-2xl">
        {/* Topo do Modal */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5 text-amber-700 animate-spin-slow" />
            </div>
            <div>
              <h3 id="titulo-modal-substituicao" className="text-base font-bold text-slate-900">
                Validação de Transição de Mandato
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Colegiado de {solicitante.cursoNome} ({solicitante.cursoSigla})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={aoFechar}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparativo de Titularidade */}
        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-200 space-y-1 text-slate-700">
            <span className="font-bold text-red-900 uppercase tracking-wider text-[10px] block">
              Mandato Atual a Ser Encerrado
            </span>
            <p className="font-bold text-slate-900 text-sm">
              {titularAtual.nomeCompleto}
            </p>
            <p className="text-slate-500">
              MASP: {titularAtual.matricula} • {titularAtual.emailInstitucional}
            </p>
            <span className="text-[11px] text-red-700 font-semibold block pt-1">
              → Perfil será convertido para Docente/Autor (acesso editorial ao curso será revogado).
            </span>
          </div>

          <div className="flex justify-center text-slate-400">
            <ArrowRight className="w-5 h-5 rotate-90" />
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1 text-slate-700">
            <span className="font-bold text-emerald-900 uppercase tracking-wider text-[10px] block">
              Novo(a) Coordenador(a) Titular
            </span>
            <p className="font-bold text-slate-900 text-sm">
              {solicitante.nomeCompleto}
            </p>
            <p className="text-slate-500">
              MASP: {solicitante.matricula} • {solicitante.emailInstitucional}
            </p>
            <span className="text-[11px] text-emerald-700 font-semibold block pt-1">
              → Receberá credencial ativa exclusiva para moderar e homologar artigos de {solicitante.cursoSigla}.
            </span>
          </div>
        </div>

        {/* Aviso Institucional */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
          Esta ação assegura a unicidade da gestão departamental conforme as normas acadêmicas da UEMG. A notificação oficial será despachada para o e-mail alternativo do novo titular via Brevo.
        </div>

        {/* Ações do Modal */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={aoFechar}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={processando}
            onClick={aoConfirmar}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{processando ? 'Processando transição...' : 'Confirmar Substituição de Mandato'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
