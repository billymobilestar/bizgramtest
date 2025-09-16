// src/app/create/post/page.tsx
'use client'

import { useState } from 'react'
import imageCompression from 'browser-image-compression'
import { nanoid } from 'nanoid'
import { api } from '@/app/providers'
import { supabase } from '@/lib/supabaseClient'

import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'

/** Change this if your bucket name is different */
const BUCKET = 'posts' // e.g. 'public' or whatever you created in Supabase
const FOLDER = 'posts'       // folder prefix inside the bucket

function extFromMime(mime: string) {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

export default function CreatePostPage() {
  const [files, setFiles] = useState<File[]>([])
  const [caption, setCaption] = useState('')
  const [tags, setTags] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string>('')

  // ✅ single mutation that creates the post given file URLs
  const { mutateAsync: createPost, isPending } = api.post.create.useMutation({
    onSuccess: () => {
      setFiles([])
      setCaption('')
      setTags('')
      setBusy(false)
      setProgress('')
      alert('Post created!')
    },
    onError: (err) => {
      setBusy(false)
      setProgress('')
      alert(`Failed: ${err.message}`)
    },
  })

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || [])
    if (!picked.length) return

    setProgress('Compressing images…')
    const compressed: File[] = []
    for (const f of picked) {
      const out = await imageCompression(f, {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 2000,
        useWebWorker: true,
      })
      const name = f.name.replace(/\.[^.]+$/, '')
      const ext = extFromMime(out.type)
      compressed.push(new File([out], `${name}.${ext}`, { type: out.type }))
    }
    setFiles(compressed)
    setProgress('')
  }

  async function onCreate() {
    try {
      if (!files.length) return alert('Pick at least one image')
      setBusy(true)
      setProgress('Uploading images…')

      // 1) Upload each file to Supabase using a signed URL from our API
      const uploaded: { url: string; altText: string | null; order: number }[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const ext = extFromMime(file.type)
        const filename = `${Date.now()}_${i}_${nanoid(8)}.${ext}`
        const path = `${FOLDER}/${filename}`

        // Ask our API to sign this exact upload (server returns a short-lived token)
        const res = await fetch('/api/storage/signed-upload', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ bucket: BUCKET, path }),
        })
        const data = await res.json()
        if (!res.ok || !data?.token) throw new Error(data?.error || 'Failed to sign upload')

        // Upload using Supabase's signed URL token
        const up = await supabase.storage.from(BUCKET).uploadToSignedUrl(path, data.token, file)
        if (up.error) throw up.error

        // Get a public URL (ensure the bucket is public or serves via RLS/CDN as you prefer)
        const pub = supabase.storage.from(BUCKET).getPublicUrl(path)
        if (!pub.data?.publicUrl) throw new Error('Could not get public URL')

        uploaded.push({ url: pub.data.publicUrl, altText: null, order: i })
      }

      // 2) Create the post with those uploaded URLs
      setProgress('Finalizing post…')
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      await createPost({
        caption: caption || null,
        tags: tagList,
        files: uploaded,
      })
    } catch (err: any) {
      console.error(err)
      setBusy(false)
      setProgress('')
      alert(`Failed: ${err?.message || String(err)}`)
    }
  }

  return (
    <main>


        <SignedIn>
        {/* your form is unchanged */}
        <div className="p-6 max-w-3xl mx-auto">
          {/* … existing UI … */}
        </div>
      </SignedIn>

      <SignedOut>
        <div className="p-6 max-w-3xl mx-auto">
          <p className="mb-3">Please sign in to create a post.</p>
          <SignInButton mode="modal">
            <button className="px-4 py-2 rounded bg-black text-white">Sign in</button>
          </SignInButton>
        </div>
      </SignedOut>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Create Post</h1>

        <div className="space-y-4">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption…"
            className="w-full border rounded p-3"
            maxLength={1000}
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="tags, comma,separated"
            className="w-full border rounded p-3"
          />
          <input type="file" accept="image/*" multiple onChange={onPick} />

          {files.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {files.map((f, i) => (
                <div key={i} className="border rounded p-2 text-xs">
                  <div className="h-32 overflow-hidden">
                    <img src={URL.createObjectURL(f)} alt="preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="mt-1 truncate">{f.name}</div>
                </div>
              ))}
            </div>
          )}

          <button
            disabled={busy || isPending}
            onClick={onCreate}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {busy ? progress || 'Working…' : isPending ? 'Creating…' : 'Create Post'}
          </button>

          {busy && progress && <p className="text-sm text-gray-600">{progress}</p>}
        </div>
      </div>
    </main>
  )
}
