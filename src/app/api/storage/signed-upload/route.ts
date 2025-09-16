import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use the SERVICE ROLE key on the server only (never expose to client)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-side secret
  { auth: { persistSession: false } }
)

export async function POST(req: Request) {
  try {
    const { bucket, path } = await req.json()
    if (!bucket || !path) {
      return NextResponse.json({ error: 'bucket and path required' }, { status: 400 })
    }

    // Ensure the bucket exists (create if missing)
    const { data: buckets, error: listErr } = await supabaseAdmin.storage.listBuckets()
    if (listErr) {
      return NextResponse.json({ error: listErr.message }, { status: 400 })
    }
    const exists = buckets?.some(b => b.name === bucket)
    if (!exists) {
      const { error: createErr } = await supabaseAdmin.storage.createBucket(bucket, {
        public: true,                      // make it public so publicUrl works
        fileSizeLimit: 20 * 1024 * 1024,   // 20MB per file (adjust)
      })
      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 400 })
      }
    }

    // Create a short-lived signed upload URL token for the exact object path
    const { data, error } = await supabaseAdmin
      .storage
      .from(bucket)
      .createSignedUploadUrl(path)

    if (error || !data?.token) {
      return NextResponse.json({ error: error?.message || 'Failed to sign upload' }, { status: 400 })
    }

    return NextResponse.json({ token: data.token })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
