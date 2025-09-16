// src/app/api/projects/[id]/callsheet/route.ts
import puppeteer, { type Browser } from 'puppeteer'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const url = `${base}/projects/${id}/callsheet/print`

  let browser: Browser | null = null
  try {
    browser = await puppeteer.launch({
      headless: true, // 'new' causes TS type errors; boolean is correct
      args: ['--no-sandbox', '--font-render-hinting=none'],
    })
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 })
    await page.emulateMediaType('print')

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      preferCSSPageSize: true,
    })

    await page.close()

    // Wrap into a Blob so TS accepts BodyInit in Web Response
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' })
    return new Response(pdfBlob, {
      headers: {
        'content-disposition': `inline; filename="callsheet-${id}.pdf"`,
        'cache-control': 'no-store',
      },
    })
  } catch (e: any) {
    return new Response(`PDF error: ${e?.message || e}`, { status: 500 })
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch {}
    }
  }
}