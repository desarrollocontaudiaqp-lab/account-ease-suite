import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const tipo = (url.searchParams.get('tipo') || '').toLowerCase();
    const numero = (url.searchParams.get('numero') || '').trim();

    if (!['ruc', 'dni'].includes(tipo)) {
      return new Response(JSON.stringify({ error: 'tipo debe ser "ruc" o "dni"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (tipo === 'ruc' && !/^\d{11}$/.test(numero)) {
      return new Response(JSON.stringify({ error: 'RUC debe tener 11 dígitos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (tipo === 'dni' && !/^\d{8}$/.test(numero)) {
      return new Response(JSON.stringify({ error: 'DNI debe tener 8 dígitos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = tipo === 'dni'
      ? (Deno.env.get('VERIFICAPE_DNI_API_KEY') || Deno.env.get('VERIFICAPE_API_KEY'))
      : Deno.env.get('VERIFICAPE_API_KEY');
    if (!apiKey) {
      const missing = tipo === 'dni' ? 'VERIFICAPE_DNI_API_KEY' : 'VERIFICAPE_API_KEY';
      return new Response(JSON.stringify({ error: `${missing} no configurada` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const upstream = await fetch(`https://api.verificape.com/v2/${tipo}/${numero}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const text = await upstream.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    console.log('[verifica-pe-lookup]', tipo, numero, 'status=', upstream.status, 'body=', text.slice(0, 1500));

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: 'VerificaPe respondió error', status: upstream.status, data }), {
        status: upstream.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});