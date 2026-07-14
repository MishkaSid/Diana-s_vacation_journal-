const { createClient } = require('@supabase/supabase-js');

let adminClient = null;

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}

const PHOTOS_BUCKET = 'vacation-photos';
const SIGNED_URL_EXPIRES_IN = 60 * 60;
/** Keep under Vercel serverless body limits after base64 encoding. */
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

async function ensurePhotosBucket(supabase) {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('[storage] listBuckets failed', error.message);
    return;
  }

  const exists = (buckets || []).some((bucket) => bucket.name === PHOTOS_BUCKET);
  if (exists) return;

  const { error: createError } = await supabase.storage.createBucket(PHOTOS_BUCKET, {
    public: false,
    fileSizeLimit: MAX_UPLOAD_BYTES,
    allowedMimeTypes: Array.from(ALLOWED_MIME_TYPES),
  });

  if (createError && !/already exists/i.test(createError.message || '')) {
    console.error('[storage] createBucket failed', createError.message);
  }
}

async function createSignedUrlSafe(supabase, path) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_IN);
  if (error) return null;
  return data?.signedUrl ?? null;
}

module.exports = {
  getSupabaseAdmin,
  PHOTOS_BUCKET,
  SIGNED_URL_EXPIRES_IN,
  MAX_UPLOAD_BYTES,
  ALLOWED_MIME_TYPES,
  ensurePhotosBucket,
  createSignedUrlSafe,
};
