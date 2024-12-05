'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Locker() {
  const [files, setFiles] = useState([])

  useEffect(() => {
    // Fetch files from backend
    fetch('http://localhost:3001/files')
      .then(response => response.json())
      .then(data => setFiles(data))
      .catch(error => console.error('Error fetching files:', error))
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">My Locker</h1>
      <ul className="space-y-2">
        {files.map((file, index) => (
          <li key={index} className="bg-gray-100 p-2 rounded">
            {file.name}
          </li>
        ))}
      </ul>
      <Link href="/" className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        Back to Home
      </Link>
    </div>
  )
}

