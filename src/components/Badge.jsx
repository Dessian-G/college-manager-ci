export default function Badge({ children, variant = 'gray' }) {
  const variants = {
    green:  'bg-green-100 text-green-700',
    red:    'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    blue:   'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
    gray:   'bg-gray-100 text-gray-600',
    purple: 'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`badge ${variants[variant] || variants.gray}`}>
      {children}
    </span>
  )
}
