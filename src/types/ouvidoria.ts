import { SiglaCurso } from './editorial';

export type TipoManifestacao = 'sugestao' | 'elogio' | 'solicitacao' | 'denuncia';

export type StatusProtocolo =
  | 'pendente'
  | 'em_analise_assessoria'
  | 'em_analise_diretoria'
  | 'respondido_privado'
  | 'homologado_publico';

export interface ManifestacaoInput {
  tipo: TipoManifestacao;
  cursoSigla?: SiglaCurso | 'GERAL';
  assunto: string;
  mensagem: string;
  isAnonimo: boolean;
  autorNome?: string;
  autorMatricula?: string;
  autorEmail?: string;
}

export interface PayloadCifradoEnvelope {
  ciphertextBase64: string;
  ivBase64: string;
  wrappedDekBase64: string;
  algoritmoSimetrico: 'AES-GCM-256';
  algoritmoAssimetrico: 'RSA-OAEP-4096';
}

export interface ProtocoloInterno {
  id: string;
  codigoProtocolo: string; // Ex: #CAR-2026-8942
  tokenHash: string; // SHA-256 do token secreto de 24 caracteres
  tipo: TipoManifestacao;
  cursoSigla: SiglaCurso | 'GERAL';
  isAnonimo: boolean;
  envelopeCifrado: PayloadCifradoEnvelope;
  status: StatusProtocolo;
  despachoOficial?: string;
  numeroPortaria?: string;
  resumoSanitizadoMural?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ComprovanteProtocolo {
  codigoProtocolo: string;
  tokenSecreto: string;
  tipo: TipoManifestacao;
  cursoSigla: SiglaCurso | 'GERAL';
  isAnonimo: boolean;
  autorNome?: string;
  dataHoraEnvio: string;
  hashIntegridade: string;
}

export interface ResultadoConsultaProtocolo {
  encontrado: boolean;
  codigoProtocolo?: string;
  tipo?: TipoManifestacao;
  status?: StatusProtocolo;
  cursoSigla?: SiglaCurso | 'GERAL';
  isAnonimo?: boolean;
  dataEnvio?: string;
  dataResposta?: string;
  despachoOficial?: string;
  numeroPortaria?: string;
  mensagemErro?: string;
}

// ==============================================================================
// MURAL PÚBLICO DE TRANSPARÊNCIA (TABELA FISICAMENTE DESACOPLADA)
// Conforme DNA #3: mural_publico não possui FK para protocolos_internos
// e contém apenas resumos higienizados e respostas oficiais do Diretor.
// ==============================================================================

export interface ItemMuralPublico {
  id: string;
  protocoloReferencia: string; // Ex: #CAR-2026-8942
  cursoSigla: SiglaCurso | 'GERAL';
  tipo: TipoManifestacao;
  manifestacaoResumo: string; // Texto sanitizado no navegador (sem PII)
  respostaOficial: string;
  numeroPortaria?: string;
  statusHomologacao: 'Homologado e Respondido';
  isActive: boolean;
  dataManifestacao: string;
  publicadoEm: string;
}

export interface HomologacaoMuralInput {
  protocoloId: string;
  protocoloReferencia: string;
  cursoSigla: SiglaCurso | 'GERAL';
  tipo: TipoManifestacao;
  resumoSanitizado: string;
  respostaOficial: string;
  numeroPortaria?: string;
  dataManifestacao: string;
}

export type AcaoDespacho =
  | 'analise_assessoria'
  | 'analise_diretoria'
  | 'responder_privado'
  | 'homologar_mural';

export const MAPA_ACAO_STATUS: Record<AcaoDespacho, StatusProtocolo> = {
  analise_assessoria: 'em_analise_assessoria',
  analise_diretoria: 'em_analise_diretoria',
  responder_privado: 'respondido_privado',
  homologar_mural: 'homologado_publico',
} as const;

export interface DespachoDirecaoInput {
  protocoloId: string;
  acao: AcaoDespacho;
  despachoOficial: string;
  numeroPortaria?: string;
  resumoSanitizadoMural?: string;
}

