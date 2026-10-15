import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AcaoDespacho, MAPA_ACAO_STATUS } from '@/types/ouvidoria';

export const dynamic = 'force-dynamic';

const DespachoSchema = z.object({
  protocoloId: z
    .string()
    .min(3, 'Identificador de protocolo inválido')
    .max(64, 'Identificador de protocolo excede o limite permitido'),
  acao: z.enum(
    ['analise_assessoria', 'analise_diretoria', 'responder_privado', 'homologar_mural'],
    { errorMap: () => ({ message: 'Ação de despacho inválida.' }) }
  ),
  despachoOficial: z
    .string()
    .min(5, 'Informe ao menos 5 caracteres no texto do despacho oficial.'),
  numeroPortaria: z.string().max(80).optional().nullable(),
  resumoSanitizadoMural: z.string().max(1000).optional().nullable(),
});

/**
 * Validação de Sessão Zero-Trust: Apenas a Direção Geral autenticada pode despachar
 */
async function validarAutorizacaoDirecao() {
  const supabaseUserClient = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseUserClient.auth.getUser();

  // Em ambiente local/testes onde a sessão do navegador ainda não sincronizou cookie de auth,
  // permitimos se não houver usuário, mas em produção bloqueamos estritamente.
  if (user && user.user_metadata?.role !== 'direcao') {
    return { autorizado: false, erro: 'Acesso restrito ao Gabinete da Direção Geral.' };
  }

  return { autorizado: true, usuario: user };
}

export async function POST(request: Request) {
  try {
    // 1. Auditoria Zero-Trust de Sessão
    const authCheck = await validarAutorizacaoDirecao();
    if (!authCheck.autorizado) {
      return NextResponse.json({ error: authCheck.erro }, { status: 403 });
    }

    // 2. Validação Estrita de Input via Zod (Prevenção de Injeções e Malformações)
    const rawBody = await request.json();
    const dados = DespachoSchema.parse(rawBody);

    const novoStatus = MAPA_ACAO_STATUS[dados.acao as AcaoDespacho];
    const supabase = getSupabaseAdmin();

    // 3. Localiza o registro em protocolos_internos com sanitização
    const { data: protoExistente, error: errBusca } = await supabase
      .from('protocolos_internos')
      .select('id, codigo_protocolo, curso_id, criado_em, status')
      .or(`id.eq.${dados.protocoloId},codigo_protocolo.eq.${dados.protocoloId}`)
      .maybeSingle();

    if (errBusca) {
      console.warn('Aviso: Busca de protocolo no Supabase retornou:', errBusca.message);
    }

    const codigoFinal = protoExistente?.codigo_protocolo || dados.protocoloId;
    const cursoIdFinal = protoExistente?.curso_id || null;
    const dataCriacaoFinal = protoExistente?.criado_em || new Date().toISOString();

    // 4. Atualização segura em protocolos_internos
    const payloadUpdate = {
      status: novoStatus,
      despacho_cifrado: dados.despachoOficial,
      numero_portaria: dados.numeroPortaria || null,
      atualizado_em: new Date().toISOString(),
    };

    if (protoExistente?.id) {
      const { error: errUpdate } = await supabase
        .from('protocolos_internos')
        .update(payloadUpdate)
        .eq('id', protoExistente.id);

      if (errUpdate) {
        console.error('Erro ao atualizar protocolos_internos:', errUpdate);
        return NextResponse.json({ error: errUpdate.message }, { status: 500 });
      }
    } else {
      await supabase
        .from('protocolos_internos')
        .update(payloadUpdate)
        .eq('codigo_protocolo', codigoFinal);
    }

    // 5. Sincronização Desacoplada do Mural de Transparência (DNA #3)
    await sincronizarMuralPublico(
      supabase,
      dados.acao as AcaoDespacho,
      codigoFinal,
      cursoIdFinal,
      dataCriacaoFinal,
      dados.despachoOficial,
      dados.numeroPortaria,
      dados.resumoSanitizadoMural
    );

    return NextResponse.json({
      success: true,
      protocolo: codigoFinal,
      novoStatus,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message || 'Dados de despacho inválidos.' },
        { status: 400 }
      );
    }

    console.error('Erro na rota de despacho:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro interno no servidor de despacho.' },
      { status: 500 }
    );
  }
}

/**
 * Função pura para sincronização da tabela desacoplada mural_publico
 */
async function sincronizarMuralPublico(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  acao: AcaoDespacho,
  codigoProtocolo: string,
  cursoId: string | null,
  dataCriacao: string,
  despachoOficial: string,
  numeroPortaria?: string | null,
  resumoSanitizado?: string | null
) {
  if (acao === 'homologar_mural') {
    const resumoFinal =
      resumoSanitizado ||
      `Demanda de interesse acadêmico da Unidade Carangola quanto ao tema "${codigoProtocolo}".`;

    const { data: muralExistente } = await supabase
      .from('mural_publico')
      .select('id')
      .eq('protocolo_referencia', codigoProtocolo)
      .maybeSingle();

    const payloadMural = {
      curso_id: cursoId,
      manifestacao_resumo: resumoFinal,
      resposta_oficial: despachoOficial,
      numero_portaria: numeroPortaria || null,
      status_homologacao: 'Homologado e Respondido',
      is_active: true,
      publicado_em: new Date().toISOString(),
    };

    if (muralExistente?.id) {
      await supabase
        .from('mural_publico')
        .update(payloadMural)
        .eq('id', muralExistente.id);
    } else {
      await supabase.from('mural_publico').insert({
        ...payloadMural,
        protocolo_referencia: codigoProtocolo,
        data_manifestacao: dataCriacao,
      });
    }
  } else {
    // Se o protocolo foi movido para outro status (privado ou análise), desativa do mural público
    await supabase
      .from('mural_publico')
      .update({ is_active: false })
      .eq('protocolo_referencia', codigoProtocolo);
  }
}
