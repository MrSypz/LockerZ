'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Category() {
  const [categories, setCategories] = useState([])

  useEffect(() => {
    // Fetch categories from backend
    fetch('http://localhost:3001/categories')
      .then(response => response.json())
      .then(data => setCategories(data))
      .catch(error => console.error('Error fetching categories:', error))
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">My Categories</h1>
      <ul className="space-y-2">
        {categories.map((category, index) => (
          <li key={index} className="bg-gray-100 p-2 rounded">
            {category.name}
          </li>
        ))}
      </ul>
      <Link href="/" className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        Back to Home
      </Link>
    </div>
  )
}

