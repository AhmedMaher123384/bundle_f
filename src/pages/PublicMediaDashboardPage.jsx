import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { requestJson } from '../lib/http.js'

function initialsFromName(name) {
  const s = String(name || '').trim()
  if (!s) return '—'
  const parts = s.split(/\s+/g).filter(Boolean)
  const first = parts[0]?.[0] || ''
  const second = parts.length > 1 ? parts[1]?.[0] || '' : parts[0]?.[1] || ''
  const out = `${first}${second}`.trim().toUpperCase()
  return out || '—'
}

function ratio(part, total) {
  const p = Number(part)
  const t = Number(total)
  if (!Number.isFinite(p) || !Number.isFinite(t) || t <= 0) return 0
  return Math.max(0, Math.min(1, p / t))
}

function formatDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PublicMediaDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const qParam = String(searchParams.get('q') || '')
  const pageParam = Math.max(1, Number(searchParams.get('page') || 1) || 1)

  const [q, setQ] = useState(qParam)
  const [page, setPage] = useState(pageParam)
  const [limit, setLimit] = useState(24)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ total: 0, stores: [] })
  const [error, setError] = useState('')

  useEffect(() => {
    setQ(qParam)
  }, [qParam])

  useEffect(() => {
    setPage(pageParam)
  }, [pageParam])

  useEffect(() => {
    const t = globalThis.setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        const nq = String(q || '').trim()
        if (nq) next.set('q', nq)
        else next.delete('q')
        next.set('page', String(page))
        return next
      })
    }, 150)
    return () => globalThis.clearTimeout(t)
  }, [page, q, setSearchParams])

  useEffect(() => {
    const controller = new AbortController()
    async function run() {
      setLoading(true)
      setError('')
      try {
        const res = await requestJson('/api/public/media/stores', { query: { q, page, limit }, signal: controller.signal })
        setData({ total: Number(res?.total || 0) || 0, stores: Array.isArray(res?.stores) ? res.stores : [] })
      } catch (e) {
        if (e?.code === 'REQUEST_ABORTED') return
        setError(String(e?.message || 'Failed to load stores.'))
        setData({ total: 0, stores: [] })
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    run()
    return () => controller.abort()
  }, [limit, page, q])

  const totalPages = useMemo(() => Math.max(1, Math.ceil((Number(data.total || 0) || 0) / limit)), [data.total, limit])
  const stores = Array.isArray(data.stores) ? data.stores : []

  // --- Component: Compact Store Row (No animation, no hover, pure data) ---
  function StoreRow({ store, index }) {
    const storeId = String(store?.storeId || '')
    const total = Number(store?.total || 0)
    const images = Number(store?.images || 0)
    const videos = Number(store?.videos || 0)
    const raws = Number(store?.raws || 0)
    const storeName = String(store?.store?.name || '').trim() || storeId || '—'
    const storeDomain = String(store?.store?.domain || '').trim()
    const storeUrl = String(store?.store?.url || '').trim()
    const storeLogoUrl = String(store?.store?.logoUrl || '').trim()
    const pImages = ratio(images, total)
    const pVideos = ratio(videos, total)
    const pRaws = ratio(raws, total)

    return (
      <tr className="border-b border-white/5">
        {/* Index */}
        <td className="py-3 pl-4 pr-2 text-right text-xs text-white/40 w-8">{index + 1}.</td>

        {/* Logo + Name/ID/Domain */}
        <td className="py-3 pr-4">
          <div className="flex items-center gap-3">
            {/* Logo: 32x32, no border, no dot */}
            <div className="h-8 w-8 flex-shrink-0 overflow-hidden">
              {storeLogoUrl ? (
                <img
                  className="h-full w-full object-contain bg-white/5"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  src={storeLogoUrl}
                />
              ) : (
                <div className="h-full w-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/60">
                  {initialsFromName(storeName)}
                </div>
              )}
            </div>

            <div>
              <div className="font-semibold text-white text-sm">{storeName}</div>
              <div className="text-xs text-white/50 font-mono">
                {storeId}
                {storeDomain && ` · ${storeDomain}`}
                {!storeDomain && storeUrl && ` · ${storeUrl}`}
              </div>
            </div>
          </div>
        </td>

        {/* Stats: Icons + counts + micro progress */}
        <td className="py-3 pr-4 w-64">
          <div className="flex items-baseline gap-2 text-xs">
            <span className="text-emerald-400">📷 {images.toLocaleString()}</span>
            <span className="text-sky-400">🎥 {videos.toLocaleString()}</span>
            <span className="text-violet-400">📁 {raws.toLocaleString()}</span>
          </div>
          {/* Micro progress bar: 2px height, no gap, full width */}
          <div className="mt-0.5 h-0.5 w-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${(pImages * 100).toFixed(2)}%` }} />
            <div className="h-full bg-sky-500" style={{ width: `${(pVideos * 100).toFixed(2)}%` }} />
            <div className="h-full bg-violet-500" style={{ width: `${(pRaws * 100).toFixed(2)}%` }} />
          </div>
        </td>

        {/* Last Upload */}
        <td className="py-3 pr-4 w-48">
          <div className="text-xs text-white/50">
            {formatDate(store?.lastAt)}
          </div>
        </td>

        {/* Total */}
        <td className="py-3 pr-4 text-right w-20">
          <span className="font-mono font-bold text-[#18b5d5]">
            {total.toLocaleString()}
          </span>
        </td>

        {/* Action (Link) */}
        <td className="py-3 pl-2 w-12">
          <Link
            to={`/public-media/${encodeURIComponent(storeId)}`}
            className="block w-6 h-6 rounded text-white/40 text-center leading-6 no-underline"
            // بدون hover, بدون focus ring, بدون تغيير لون
          >
            →
          </Link>
        </td>
      </tr>
    )
  }

  return (
    <div className="min-h-screen bg-[#292929] text-sm">
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="h-0.5 w-8 bg-[#18b5d5]"></span>
            Media Dashboard
          </h1>
          <p className="text-white/50 mt-1 text-sm">
            تقسيم الميديا حسب المتجر — إدارة احترافية لجميع ملفاتك
          </p>
        </div>

        {/* Control Strip: Search + Stats + Pagination in one line */}
        <div className="mb-5 bg-[#1a1a1a] rounded border border-white/10 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex items-center gap-2 flex-1 min-w-64">
              <svg className="h-4 w-4 text-white/40 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setPage(1)
                }}
                placeholder="ابحث بـ Store ID أو اسم المتجر..."
                className="flex-1 bg-transparent text-white placeholder-white/40 outline-none w-full"
                spellCheck={false}
              />
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-white/60 text-xs">
              <span>المتاجر: <span className="font-bold text-[#18b5d5]">{data.total.toLocaleString()}</span></span>
              <span>الصفحة: <span className="font-bold">{page} / {totalPages}</span></span>
            </div>

            {/* Limit Selector */}
            <select
              value={String(limit)}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                setPage(1)
              }}
              className="bg-[#1f1f1f] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none"
            >
              <option value="12">12</option>
              <option value="24">24</option>
              <option value="36">36</option>
              <option value="60">60</option>
            </select>

            {/* Pagination: minimal arrows */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="w-7 h-7 rounded flex items-center justify-center text-white/50 disabled:opacity-30"
              >
                ‹
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="w-7 h-7 rounded flex items-center justify-center text-white/50 disabled:opacity-30"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div>
          {loading ? (
            <div className="py-16 flex justify-center">
              <div className="text-white/70">جاري التحميل...</div>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          ) : stores.length === 0 ? (
            <div className="bg-[#1a1a1a] border border-white/10 rounded px-6 py-12 text-center text-white/50">
              لا توجد متاجر مطابقة
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-[#1c1c1c] text-left text-xs text-white/60">
                    <th className="py-2 pl-4 pr-2 w-8">#</th>
                    <th className="py-2 pr-4">المتجر</th>
                    <th className="py-2 pr-4 w-64">الملفات</th>
                    <th className="py-2 pr-4 w-48">آخر رفع</th>
                    <th className="py-2 pr-4 w-20 text-right">المجموع</th>
                    <th className="py-2 pl-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((s, i) => (
                    <StoreRow key={String(s?.storeId)} store={s} index={(page - 1) * limit + i} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
