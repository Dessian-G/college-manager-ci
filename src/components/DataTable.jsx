import { useState, useMemo } from 'react'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export default function DataTable({
  columns, data, searchable = true, searchPlaceholder = 'Rechercher...',
  emptyMessage = 'Aucune donnée', pageSize = 20, actions,
}) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter(row =>
      columns.some(col => {
        if (!col.searchable && col.searchable !== undefined) return false
        const val = col.accessor ? row[col.accessor] : col.cell?.(row)
        return String(val ?? '').toLowerCase().includes(q)
      })
    )
  }, [data, search, columns])

  const sorted = useMemo(() => {
    if (!sort.key) return filtered
    return [...filtered].sort((a, b) => {
      const va = a[sort.key], vb = b[sort.key]
      if (va == null) return 1
      if (vb == null) return -1
      const cmp = String(va).localeCompare(String(vb), 'fr', { numeric: true })
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize)

  const toggleSort = key => {
    setSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }))
    setPage(1)
  }

  const SortIcon = ({ colKey }) => {
    if (sort.key !== colKey) return <ChevronsUpDown size={14} className="text-gray-400" />
    return sort.dir === 'asc'
      ? <ChevronUp size={14} className="text-accent" />
      : <ChevronDown size={14} className="text-accent" />
  }

  return (
    <div className="flex flex-col gap-3">
      {(searchable || actions) && (
        <div className="flex items-center gap-3 flex-wrap">
          {searchable && (
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-9"
                placeholder={searchPlaceholder}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
          )}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap
                    ${col.sortable !== false ? 'cursor-pointer select-none hover:text-gray-900' : ''}`}
                  style={col.width ? { width: col.width } : {}}
                  onClick={() => col.sortable !== false && col.accessor && toggleSort(col.accessor)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable !== false && col.accessor && <SortIcon colKey={col.accessor} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : paged.map((row, i) => (
              <tr key={row.id ?? i} className="hover:bg-gray-50 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-gray-700">
                    {col.cell ? col.cell(row) : row[col.accessor] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1
              return (
                <button
                  key={p}
                  className={`w-8 h-8 rounded-lg text-sm ${page === p ? 'bg-accent text-white' : 'hover:bg-gray-100'}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
