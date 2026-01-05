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
  const statusBg = freshness === 'emerald' ? '#d1fae5' : freshness === 'sky' ? '#e0f2fe' : '#f3f4f6'

  return (
    <Link
      to={`/public-media/${encodeURIComponent(storeId)}`}
      className="block border border-white/20 bg-[#1a1a1a] p-5"
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <div className="relative w-16 h-16 border border-white/20 flex items-center justify-center" style={{ backgroundColor: statusBg }}>
            {storeLogoUrl ? (
              <img 
                className="w-full h-full object-cover" 
                alt="" 
                src={storeLogoUrl} 
              />
            ) : (
              <div className="text-base font-bold text-[#1a1a1a]">{initialsFromName(storeName)}</div>
            )}
            <div 
              className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 border-2 border-[#1a1a1a]" 
              style={{ backgroundColor: statusColor }}
            />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-[#18b5d5] mb-1">{storeName}</h3>
              <div className="text-xs text-white/50 mb-1">
                <span className="font-mono">{storeId}</span>
              </div>
              {(storeDomain || storeUrl) && (
                <div className="text-xs text-white/40">
                  {storeDomain || storeUrl}
                </div>
              )}
            </div>
            
            <div className="flex-shrink-0 bg-[#18b5d5] text-white font-bold px-3 py-1.5 text-sm">
              {total.toLocaleString()}
            </div>
          </div>

          <div className="text-xs text-white/40 mb-3">
            آخر رفع: {formatDate(store?.lastAt)}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="border border-emerald-500/30 bg-emerald-500/10 p-2 text-center">
              <div className="text-xs text-emerald-400/70 mb-0.5">صور</div>
              <div className="text-sm font-bold text-emerald-400">{images.toLocaleString()}</div>
            </div>
            <div className="border border-sky-500/30 bg-sky-500/10 p-2 text-center">
              <div className="text-xs text-sky-400/70 mb-0.5">فيديو</div>
              <div className="text-sm font-bold text-sky-400">{videos.toLocaleString()}</div>
            </div>
            <div className="border border-violet-500/30 bg-violet-500/10 p-2 text-center">
              <div className="text-xs text-violet-400/70 mb-0.5">ملفات</div>
              <div className="text-sm font-bold text-violet-400">{raws.toLocaleString()}</div>
            </div>
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
    <div className="min-h-screen bg-[#292929]">
      <div className="mx-auto w-full max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 bg-[#1a1a1a] border border-white/10 p-6">
          <h1 className="text-3xl font-bold text-white mb-2">Media Dashboard</h1>
          <p className="text-white/60 text-sm">تقسيم الميديا حسب المتجر - إدارة احترافية لجميع ملفاتك</p>
        </div>

        {/* Search & Filter */}
        <div className="mb-6 bg-[#1a1a1a] border border-white/10 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1 flex items-center gap-3">
              <svg className="h-5 w-5 text-white/40 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setPage(1)
                }}
                placeholder="ابحث بـ Store ID أو اسم المتجر..."
                className="flex-1 bg-[#252525] border border-white/10 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-[#18b5d5]/50 focus:outline-none"
                spellCheck={false}
              />
            </div>
            
            <div>
              <select
                value={String(limit)}
                onChange={(e) => {
                  setLimit(Number(e.target.value))
                  setPage(1)
                }}
                className="w-full sm:w-auto bg-[#252525] border border-white/10 px-4 py-2.5 text-sm text-white focus:border-[#18b5d5]/50 focus:outline-none"
              >
                <option value="12">12 متجر</option>
                <option value="24">24 متجر</option>
                <option value="36">36 متجر</option>
                <option value="60">60 متجر</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats & Pagination */}
        <div className="mb-6 bg-[#1a1a1a] border border-white/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-8">
              <div>
                <div className="text-xs text-white/50 mb-1">إجمالي المتاجر</div>
                <div className="text-2xl font-bold text-[#18b5d5]">{Number(data.total || 0).toLocaleString()}</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <div className="text-xs text-white/50 mb-1">الصفحة الحالية</div>
                <div className="text-2xl font-bold text-white">{page} / {totalPages}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="border border-white/10 bg-[#252525] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
              >
                السابق
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="bg-[#18b5d5] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
              >
                التالي
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loading label="جاري تحميل المتاجر..." />
            </div>
          ) : null}
          
          {!loading && error ? (
            <div className="border border-red-500/30 bg-red-500/10 p-6 text-center">
              <div className="text-sm font-semibold text-red-400">{error}</div>
            </div>
          ) : null}

          {!loading && !error ? (
            stores.length ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {stores.map((s) => (
                  <StoreCard key={String(s?.storeId)} store={s} />
                ))}
              </div>
            ) : (
              <div className="bg-[#1a1a1a] border border-white/10 p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-white/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <div className="text-sm font-semibold text-white/60">لا توجد متاجر لعرضها</div>
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  )
}