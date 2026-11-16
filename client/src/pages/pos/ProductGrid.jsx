import React from 'react'
import { formatCLP } from '../../lib/format'

const CATEGORY_EMOJI = {
  'Pizzas': '🍕',
  'Galletones': '🍪',
  'Empanadas': '🥟',
  'Café': '☕',
  'Bebestibles': '🥤',
  'Snacks': '🍿',
  'Otros': '📦',
}

function ProductCard({ product, onAdd, wholesale }) {
  const price = wholesale && product.wholesale_price
    ? parseFloat(product.wholesale_price)
    : parseFloat(product.price)

  return (
    <div
      onClick={() => onAdd(product)}
      className="bg-white border-2 border-gray-100 hover:border-brand-red rounded-2xl p-3 cursor-pointer transition-all duration-150 active:scale-95 select-none group min-h-[120px] flex flex-col justify-between"
    >
      <div>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-20 object-cover rounded-xl mb-2"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }}
          />
        ) : null}
        <div className={`text-3xl mb-2 ${product.image_url ? 'hidden' : ''}`}>
          {CATEGORY_EMOJI[product.category_name] || '📦'}
        </div>
        <div className="font-semibold text-sm text-gray-800 leading-tight group-hover:text-brand-red transition-colors line-clamp-2">
          {product.name}
        </div>
      </div>
      <div className="font-bold text-brand-red mt-1">
        {formatCLP(price)}
        {product.is_pizza && (
          <span className="ml-1 text-xs text-gray-400 font-normal">🍕½</span>
        )}
      </div>
    </div>
  )
}

export default function ProductGrid({ products, categories, selectedCategory, onCategoryChange, onSearch, searchQ, onAdd, wholesale }) {
  const filtered = products.filter(p => {
    const matchCat = selectedCategory === 'Todas' || p.category_name === selectedCategory
    const matchSearch = !searchQ || p.name.toLowerCase().includes(searchQ.toLowerCase())
    return matchCat && matchSearch && p.active !== false
  })

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={searchQ}
          onChange={e => onSearch(e.target.value)}
          className="input"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 flex-shrink-0 scrollbar-hide">
        {['Todas', ...categories.map(c => c.name)].map(cat => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all
              ${selectedCategory === cat
                ? 'bg-brand-red text-white border-brand-red'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
          >
            {CATEGORY_EMOJI[cat] || ''} {cat}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">🔍</div>
            <div className="text-sm">No se encontraron productos</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-4">
            {filtered.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={onAdd}
                wholesale={wholesale}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
