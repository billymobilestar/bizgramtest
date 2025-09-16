// src/lib/useHasMounted.ts
'use client'
import { useEffect, useState } from 'react'
export function useHasMounted() {
  const [m, setM] = useState(false)
  useEffect(() => setM(true), [])
  return m
}