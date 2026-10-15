'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ProtocoloInterno,
  DespachoDirecaoInput,
  PayloadCifradoEnvelope,
  StatusProtocolo,
  MAPA_ACAO_STATUS,
} from '@/types/ouvidoria';
import {
  obterProtocolosArmazenados,
  aplicarDespachoDirecao,
} from '@/lib/data/mock-ouvidoria';
import { publicarNoMuralSanitizado } from '@/lib/data/mock-mural';
import { createClient } from '@/lib/supabase/client';

export type FiltroStatusGabinete =
  | 'todos'
  | 'pendentes'
  | 'em_analise'
  | 'respondidos'
  | 'homologados';

export interface UseGabineteOuvidoriaReturn {
  protocolos: ProtocoloInterno[];
  protocolosFiltrados: ProtocoloInterno[];
  busca: string;
  setBusca: (busca: string) => void;
  filtroStatus: FiltroStatusGabinete;
  setFiltroStatus: (filtro: FiltroStatusGabinete) => void;
  filtroCurso: string;
  setFiltroCurso: (curso: string) => void;
  protocoloEmAcao: ProtocoloInterno | null;
  setProtocoloEmAcao: (proto: ProtocoloInterno | null) => void;
  mensagemSucesso: string | null;
  metricas: {
    total: number;
    pendentes: number;
    emAnalise: number;
    respondidos: number;
    homologados: number;
  };
  handleConfirmarDespacho: (dados: DespachoDirecaoInput) => void;
  carregarProtocolos: () => void;
}

/**
 * Hook orquestrador do Painel do Gabinete da Direção Geral (Ouvidoria Segura).
 * Isola gestão de estado, filtragem multicritério e aplicação de despachos oficiais.
 */
export function useGabineteOuvidoria(): UseGabineteOuvidoriaReturn {
  const [protocolos, setProtocolos] = useState<ProtocoloInterno[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusGabinete>('todos');
  const [filtroCurso, setFiltroCurso] = useState<string>('TODOS');
  const [protocoloEmAcao, setProtocoloEmAcao] = useState<ProtocoloInterno | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const carregarProtocolos = useCallback(async () => {
    // 1. Carrega dados de contingência local
    const locais = obterProtocolosArmazenados();

    // 2. Consulta dados reais do Supabase
    try {
      const supabase = createClient();
      const { data: rowsDb, error } = await supabase
        .from('protocolos_internos')
        .select('*, cursos(sigla, nome)')
        .order('criado_em', { ascending: false });

      if (!error && rowsDb && rowsDb.length > 0) {
        const mapeados: ProtocoloInterno[] = rowsDb.map((row: any) => {
          let parsed: any = {};
          try {
            parsed = JSON.parse(row.payload_cifrado);
          } catch {
            parsed = { ciphertext: row.payload_cifrado };
          }

          const envelopeCifrado: PayloadCifradoEnvelope = {
            ciphertextBase64: parsed.ciphertext || row.payload_cifrado,
            ivBase64: parsed.iv || '',
            wrappedDekBase64: row.wrapped_dek,
            algoritmoSimetrico: parsed.algoritmoSimetrico || 'AES-GCM-256',
            algoritmoAssimetrico: parsed.algoritmoAssimetrico || 'RSA-OAEP-4096',
          };

          const dataCriacao = row.criado_em
            ? new Date(row.criado_em).toLocaleDateString('pt-BR') +
              ' ' +
              new Date(row.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : '';

          const dataAtualizacao = row.atualizado_em
            ? new Date(row.atualizado_em).toLocaleDateString('pt-BR') +
              ' ' +
              new Date(row.atualizado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : '';

          return {
            id: row.id,
            codigoProtocolo: row.codigo_protocolo,
            tokenHash: row.token_hash,
            tipo: (parsed.tipo || 'solicitacao') as any,
            cursoSigla: (row.cursos?.sigla || parsed.cursoSigla || 'GERAL') as any,
            isAnonimo: row.is_anonimo,
            envelopeCifrado,
            status: row.status,
            despachoOficial: row.despacho_cifrado || undefined,
            numeroPortaria: row.numero_portaria || undefined,
            criadoEm: dataCriacao,
            atualizadoEm: dataAtualizacao,
          };
        });

        // Unifica priorizando o Supabase e mesclando locais não sincronizados
        const codigosDb = new Set(mapeados.map((m) => m.codigoProtocolo));
        const unificados = [...mapeados, ...locais.filter((l) => !codigosDb.has(l.codigoProtocolo))];
        setProtocolos(unificados);
        return;
      }
    } catch (err) {
      console.warn('Aviso: Falha ao carregar protocolos do Supabase, usando cache local:', err);
    }

    setProtocolos(locais);
  }, []);

  useEffect(() => {
    carregarProtocolos();
  }, [carregarProtocolos]);

  const handleConfirmarDespacho = useCallback(
    async (dados: DespachoDirecaoInput) => {
      // 1. Localiza o protocolo no estado
      const protocoloAlvo = protocolos.find(
        (p) => p.id === dados.protocoloId || p.codigoProtocolo === dados.protocoloId
      );

      const codigoProto = protocoloAlvo?.codigoProtocolo || dados.protocoloId;
      const novoStatus: StatusProtocolo = MAPA_ACAO_STATUS[dados.acao] || 'pendente';

      // 2. Persistência remota prioritária via API do Servidor (Service Role / Supabase)
      try {
        const resp = await fetch('/api/ouvidoria/despacho', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            protocoloId: dados.protocoloId,
            acao: dados.acao,
            despachoOficial: dados.despachoOficial,
            numeroPortaria: dados.numeroPortaria,
            resumoSanitizadoMural: dados.resumoSanitizadoMural,
          }),
        });

        if (!resp.ok) {
          const errJson = await resp.json().catch(() => ({}));
          console.warn('Aviso: API de despacho retornou status:', resp.status, errJson);
        }
      } catch (errApi) {
        console.warn('Erro ao chamar API de despacho:', errApi);
      }

      // 3. Persistência de contingência local (localStorage)
      aplicarDespachoDirecao(
        dados.protocoloId,
        dados.acao,
        dados.despachoOficial,
        dados.numeroPortaria,
        dados.resumoSanitizadoMural
      );

      if (dados.acao === 'homologar_mural' && dados.resumoSanitizadoMural) {
        publicarNoMuralSanitizado({
          protocoloId: protocoloAlvo?.id || dados.protocoloId,
          protocoloReferencia: codigoProto,
          cursoSigla: protocoloAlvo?.cursoSigla || 'GERAL',
          tipo: protocoloAlvo?.tipo || 'solicitacao',
          resumoSanitizado: dados.resumoSanitizadoMural,
          respostaOficial: dados.despachoOficial,
          numeroPortaria: dados.numeroPortaria,
          dataManifestacao:
            protocoloAlvo?.criadoEm?.split(' ')[0] ||
            new Date().toLocaleDateString('pt-BR'),
        });
      }

      // 4. Feedback visual e fechamento do modal garantido
      setMensagemSucesso(
        `Despacho assinado e registrado com sucesso para o protocolo ${codigoProto}!`
      );
      setProtocoloEmAcao(null);
      await carregarProtocolos();
      setTimeout(() => setMensagemSucesso(null), 6000);
    },
    [protocolos, carregarProtocolos]
  );

  const metricas = useMemo(() => {
    return {
      total: protocolos.length,
      pendentes: protocolos.filter((p) => p.status === 'pendente').length,
      emAnalise: protocolos.filter(
        (p) => p.status === 'em_analise_assessoria' || p.status === 'em_analise_diretoria'
      ).length,
      respondidos: protocolos.filter((p) => p.status === 'respondido_privado').length,
      homologados: protocolos.filter((p) => p.status === 'homologado_publico').length,
    };
  }, [protocolos]);

  const protocolosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return protocolos.filter((p) => {
      // 1. Filtro textual
      if (termo) {
        const bateu =
          p.codigoProtocolo.toLowerCase().includes(termo) ||
          p.tipo.toLowerCase().includes(termo) ||
          (p.despachoOficial && p.despachoOficial.toLowerCase().includes(termo)) ||
          (p.numeroPortaria && p.numeroPortaria.toLowerCase().includes(termo));
        if (!bateu) return false;
      }

      // 2. Filtro de curso
      if (filtroCurso !== 'TODOS' && p.cursoSigla !== filtroCurso) {
        return false;
      }

      // 3. Filtro por aba de status
      if (filtroStatus === 'pendentes') return p.status === 'pendente';
      if (filtroStatus === 'em_analise') {
        return p.status === 'em_analise_assessoria' || p.status === 'em_analise_diretoria';
      }
      if (filtroStatus === 'respondidos') return p.status === 'respondido_privado';
      if (filtroStatus === 'homologados') return p.status === 'homologado_publico';

      return true;
    });
  }, [protocolos, busca, filtroCurso, filtroStatus]);

  return {
    protocolos,
    protocolosFiltrados,
    busca,
    setBusca,
    filtroStatus,
    setFiltroStatus,
    filtroCurso,
    setFiltroCurso,
    protocoloEmAcao,
    setProtocoloEmAcao,
    mensagemSucesso,
    metricas,
    handleConfirmarDespacho,
    carregarProtocolos,
  };
}
