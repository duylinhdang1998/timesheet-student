// Mails due reminders through Resend. Called every 5 minutes by pg_cron (see the reminders migration).
// Secrets: RESEND_API_KEY, REMINDER_FROM (e.g. "Lịch học <nhac-lich@your-domain.vn>").
import { createClient } from 'npm:@supabase/supabase-js@2'

interface Due {
  session_id: string
  remind_at: string
  title: string
  child_name: string
  date: string
  start_time: string
  end_time: string
  location: string | null
  escort: string | null
  note: string | null
  remind_minutes: number
  recipients: string[]
}

const LEAD: Record<number, string> = {
  15: '15 phút', 30: '30 phút', 60: '1 tiếng', 120: '2 tiếng', 240: '4 tiếng', 720: '12 tiếng', 1440: '1 ngày',
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const hhmm = (t: string) => t.slice(0, 5)
const ddmmyyyy = (d: string) => d.split('-').reverse().join('/')

function email(r: Due) {
  const when = `${hhmm(r.start_time)}–${hhmm(r.end_time)}, ${ddmmyyyy(r.date)}`
  const rows = [
    ['Bé', r.child_name],
    ['Giờ', when],
    ['Địa điểm', r.location],
    ['Người đưa đón', r.escort],
    ['Ghi chú', r.note],
  ].filter((row): row is [string, string] => Boolean(row[1]))
  return {
    subject: `Còn ${LEAD[r.remind_minutes] ?? `${r.remind_minutes} phút`}: ${r.title} (${r.child_name}) lúc ${hhmm(r.start_time)}`,
    html:
      `<p>Sắp đến giờ <b>${escape(r.title)}</b>.</p><table cellpadding="4">` +
      rows.map(([k, v]) => `<tr><td style="color:#64748b">${k}</td><td>${escape(v)}</td></tr>`).join('') +
      '</table>',
  }
}

Deno.serve(async () => {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('REMINDER_FROM') ?? 'Lịch học <onboarding@resend.dev>'
  if (!apiKey) return new Response('RESEND_API_KEY is not set', { status: 500 })

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data, error } = await db.rpc('claim_email_reminders')
  if (error) return new Response(error.message, { status: 500 })

  let sent = 0
  for (const r of (data ?? []) as Due[]) {
    if (r.recipients.length === 0) continue
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: r.recipients, ...email(r) }),
    })
    if (res.ok) {
      sent++
    } else {
      console.error('resend', r.session_id, res.status, await res.text())
      // release the claim so the next run retries (until the session starts)
      await db.from('reminder_emails').delete().eq('session_id', r.session_id).eq('remind_at', r.remind_at)
    }
  }
  return Response.json({ due: data?.length ?? 0, sent })
})
