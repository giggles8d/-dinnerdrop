'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Camera, Loader2, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface PantryItem {
  id: string
  name: string
  quantity: string | null
  unit: string | null
}

interface ScannedItem {
  name: string
  quantity: string | null
  unit: string | null
  selected: boolean
}

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: '' })
  const [scanning, setScanning] = useState(false)
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [showScanned, setShowScanned] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const loadItems = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setItems(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  async function addItem() {
    if (!newItem.name.trim()) return
    setAdding(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAdding(false); return }

    const { data } = await supabase.from('pantry_items').insert({
      user_id: user.id,
      name: newItem.name.trim(),
      quantity: newItem.quantity || null,
      unit: newItem.unit || null,
    }).select().single()

    if (data) {
      setItems(prev => [data, ...prev])
      setNewItem({ name: '', quantity: '', unit: '' })
    }
    setAdding(false)
  }

  async function removeItem(id: string) {
    await supabase.from('pantry_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    setShowScanned(false)

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      const mediaType = file.type

      try {
        const res = await fetch('/api/scan-pantry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mediaType }),
        })
        const data = await res.json()
        if (data.items) {
          setScannedItems(data.items.map((item: ScannedItem) => ({ ...item, selected: true })))
          setShowScanned(true)
        }
      } catch (err) {
        console.error('Scan error:', err)
      } finally {
        setScanning(false)
      }
    }
    reader.readAsDataURL(file)
  }

  async function addScannedItems() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const selected = scannedItems.filter(i => i.selected)
    const inserts = selected.map(i => ({
      user_id: user.id,
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
    }))

    const { data } = await supabase.from('pantry_items').insert(inserts).select()
    if (data) {
      setItems(prev => [...data, ...prev])
      setShowScanned(false)
      setScannedItems([])
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to meal plan
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">My pantry</h1>
            <p className="text-muted-foreground mt-1">Items here get subtracted from your grocery list</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {scanning ? 'Scanning...' : 'Scan photo'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>

        {/* Scanned items confirmation */}
        {showScanned && scannedItems.length > 0 && (
          <div className="mb-6 p-4 rounded-lg border border-border bg-card">
            <h2 className="text-sm font-medium text-foreground mb-3">
              Found {scannedItems.length} items — select which to add:
            </h2>
            <ul className="space-y-2 mb-4">
              {scannedItems.map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => setScannedItems(prev =>
                      prev.map((s, j) => j === i ? { ...s, selected: !s.selected } : s)
                    )}
                    className="rounded"
                  />
                  <span className="text-sm text-foreground">
                    {item.quantity && item.unit ? `${item.quantity} ${item.unit} ` : ''}{item.name}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                onClick={addScannedItems}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Add selected
              </button>
              <button
                onClick={() => { setShowScanned(false); setScannedItems([]) }}
                className="px-4 py-2 rounded-md border border-input text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Manual add */}
        <div className="mb-6 p-4 rounded-lg border border-border bg-card">
          <h2 className="text-sm font-medium text-foreground mb-3">Add item manually</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Item name"
              value={newItem.name}
              onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Qty"
              value={newItem.quantity}
              onChange={e => setNewItem(prev => ({ ...prev, quantity: e.target.value }))}
              className="w-16 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Unit"
              value={newItem.unit}
              onChange={e => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
              className="w-20 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={addItem}
              disabled={adding || !newItem.name.trim()}
              className="px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pantry list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">Your pantry is empty.</p>
            <p className="text-muted-foreground text-xs mt-1">Add items manually or scan a photo.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map(item => (
              <li
                key={item.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card"
              >
                <span className="text-sm text-foreground">
                  {item.quantity && item.unit ? (
                    <span className="text-muted-foreground mr-2">{item.quantity} {item.unit}</span>
                  ) : null}
                  {item.name}
                </span>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
