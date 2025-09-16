import { onUser } from '@/server/utils/notifier'
import { auth } from '@clerk/nextjs/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic' // ensure this route is not statically cached

export async function GET() {
  // Clerk's `auth()` can be async on some versions; await it to get `userId`
  const { userId } = await auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: any) => controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
      const unsub = onUser(userId, send)

      // Keep-alive ping each 25s to prevent idle timeouts
      const ping = setInterval(() => controller.enqueue(':\n\n'), 25_000)

      // Initial hello (optional) and reconnection delay hint
      send({ kind: 'hello' })
      controller.enqueue('retry: 3000\n\n')

      ;(controller as any)._cleanup = () => {
        clearInterval(ping)
        unsub()
        try { controller.close() } catch {}
      }
    },
    cancel() {
      (this as any)?._cleanup?.()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // disable proxy buffering if present
    },
  })
}