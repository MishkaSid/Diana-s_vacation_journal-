const { requireAuth } = require('../../lib/auth');
const {
  methodNotAllowed,
  readJsonBody,
  serverError,
  withErrorHandling,
} = require('../../lib/http');
const { getSupabaseAdmin } = require('../../lib/supabaseAdmin');

async function ensureItalySeed() {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from('destinations')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;
  if ((count ?? 0) > 0) return;

  const { error: insertError } = await supabase.from('destinations').insert({
    name: 'Italy',
    flag: '🇮🇹',
    description:
      'A dreamy journey through cobblestone streets, sunlit piazzas, and timeless coastlines.',
  });
  if (insertError) throw insertError;
}

async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    await ensureItalySeed();
    const { data, error } = await supabase
      .from('destinations')
      .select('id, name, flag, description, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      serverError(res, 'Unable to load destinations');
      return;
    }

    res.status(200).json({ destinations: data ?? [] });
    return;
  }

  if (req.method === 'POST') {
    const body = await readJsonBody(req);
    const name = body?.name?.trim() ?? '';
    if (!name) {
      res.status(400).json({ error: 'Destination name is required' });
      return;
    }

    const { data, error } = await supabase
      .from('destinations')
      .insert({
        name,
        flag: body?.flag?.trim() || null,
        description: body?.description?.trim() || null,
      })
      .select('id, name, flag, description, created_at')
      .single();

    if (error || !data) {
      serverError(res, 'Unable to create destination');
      return;
    }

    res.status(201).json({ destination: data });
    return;
  }

  methodNotAllowed(res, ['GET', 'POST']);
}

module.exports = withErrorHandling(handler);
