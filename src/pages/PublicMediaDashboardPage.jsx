import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Loading } from '../components/ui/Loading.jsx'
import { requestJson } from '../lib/http.js'

function formatDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('ar-EG', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function timeTone(iso) {
  if (!iso) return 'gray'
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return 'gray'
  const diff = Date.now() - t
  if (diff <= 6 * 60 * 60 * 1000) return 'emerald'
  if (diff <= 24 * 60 * 60 * 1000) return 'sky'
  return 'gray'
}

function initialsFromName(name) {
  const s = String(name || '').trim()
  if (!s) return '—'
  const parts = s.split(/\s+/g).filter(Boolean)
  const first = parts[0]?.[0] || ''
  const second = parts.length > 1 ? parts[1]?.[0] || '' : parts[0]?.[1] || ''
  const out = `${first}${second}`.trim().toUpperCase()
  return out || '—'
}

function StoreCard({ store }) {
  const storeId = String(store?.storeId || '')
  const total = Number(store?.total || 0)
  const images = Number(store?.images || 0)
  const videos = Number(store?.videos || 0)
  const raws = Number(store?.raws || 0)
  const storeName = String(store?.store?.name || '').trim() || storeId || '—'
  const storeDomain = String(store?.store?.domain || '').trim()
  const storeUrl = String(store?.store?.url || '').trim()
  const storeLogoUrl = String(store?.store?.logoUrl || '').trim()
  const freshness = timeTone(store?.lastAt)

  const statusColor = freshness === 'emerald' ? '#10b981' : freshness === 'sky' ? '#38bdf8' : '#6b7280'

  return (
    <Link
      to={`/public-media/${encodeURIComponent(storeId)}`}
      className="block border-l-4 bg-[#1a1a1a] focus:outline-none"
      style={{ borderLeftColor: statusColor }}
    >
      {/* Header Section */}
      <div className="border-b border-white/5 bg-[#1f1f1f] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center bg-[#18b5d5]/10 border border-[#18b5d5]/20">
              {storeLogoUrl ? (
                <img className="h-full w-full object-cover" alt="" src={storeLogoUrl} />
              ) : (
                <span className="text-sm font-bold text-[#18b5d5]">{initialsFromName(storeName)}</span>
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-0.5">{storeName}</h3>
              <p className="text-xs font-mono text-white/40">{storeId}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/40 mb-1">إجمالي الملفات</div>
            <div className="text-2xl font-bold text-[#18b5d5]">{total.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="border-b border-white/5 px-6 py-3 bg-[#1a1a1a]">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-white/40">الدومين:</span>
            <span className="mr-2 text-white/70">{storeDomain || storeUrl || '—'}</span>
          </div>
          <div className="text-left">
            <span className="text-white/40">آخر رفع:</span>
            <span className="mr-2 text-white/70">{formatDate(store?.lastAt)}</span>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="mb-2 h-1 w-full bg-white/5">
              <div className="h-full bg-emerald-500" style={{ width: `${total > 0 ? (images / total * 100) : 0}%` }} />
            </div>
            <div className="text-xs text-white/40 mb-1">صور</div>
            <div className="text-lg font-bold text-emerald-400">{images.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="mb-2 h-1 w-full bg-white/5">
              <div className="h-full bg-sky-500" style={{ width: `${total > 0 ? (videos / total * 100) : 0}%` }} />
            </div>
            <div className="text-xs text-white/40 mb-1">فيديو</div>
            <div className="text-lg font-bold text-sky-400">{videos.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="mb-2 h-1 w-full bg-white/5">
              <div className="h-full bg-violet-500" style={{ width: `${total > 0 ? (raws / total * 100) : 0}%` }} />
            </div>
            <div className="text-xs text-white/40 mb-1">ملفات</div>
            <div className="text-lg font-bold text-violet-400">{raws.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </Link>
  )
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

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Top Bar */}
      <div className="border-b border-white/10 bg-[#1a1a1a]">
        <div className="mx-auto max-w-[1600px] px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Media Management System</h1>
              <p className="text-sm text-white/50">إدارة شاملة لجميع ملفات المتاجر</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xs text-white/40">إجمالي المتاجر</div>
                <div className="text-xl font-bold text-[#18b5d5]">{Number(data.total || 0).toLocaleString()}</div>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div className="text-right">
                <div className="text-xs text-white/40">الصفحة</div>
                <div className="text-xl font-bold text-white">{page} / {totalPages}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="border-b border-white/10 bg-[#1a1a1a]">
        <div className="mx-auto max-w-[1600px] px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setPage(1)
                }}
                placeholder="بحث بـ Store ID أو اسم المتجر..."
                className="w-full border border-white/10 bg-[#0f0f0f] px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#18b5d5] focus:outline-none"
                spellCheck={false}
              />
            </div>
            <select
              value={String(limit)}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                setPage(1)
              }}
              className="border border-white/10 bg-[#0f0f0f] px-4 py-2.5 text-sm text-white focus:border-[#18b5d5] focus:outline-none"
            >
              <option value="12">12 متجر</option>
              <option value="24">24 متجر</option>
              <option value="36">36 متجر</option>
              <option value="60">60 متجر</option>
            </select>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border border-white/10 bg-[#252525] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              السابق
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="border border-[#18b5d5] bg-[#18b5d5] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              التالي
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-[1600px] px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loading label="جاري التحميل..." />
          </div>
        ) : error ? (
          <div className="border border-red-500/20 bg-red-500/5 p-8 text-center">
            <div className="text-sm font-semibold text-red-400">{error}</div>
          </div>
        ) : stores.length ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            {stores.map((s) => (
              <StoreCard key={String(s?.storeId)} store={s} />
            ))}
          </div>
        ) : (
          <div className="border border-white/10 bg-[#1a1a1a] p-16 text-center">
            <svg className="mx-auto mb-4 h-16 w-16 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <div className="text-white/40">لا توجد نتائج</div>
          </div>
        )}
      </div>
    </div>
  )
}