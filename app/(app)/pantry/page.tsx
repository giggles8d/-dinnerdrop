'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Camera, Loader2, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { AmazonRestock } from '@/components/AmazonRestock'
import { PANTRY_ESSENTIALS } from '@/lib/amazon-affiliate'

interface PantryItem {
  id: string
  name: string
  quantity: string | null
  unit: string | null
  use_soon?: boolean
  expires_on?: string | null
  source?: string
  last_seen?: string
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
  const [addingScanned, setAddingScanned] = useState(false)
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [showScanned, setShowScanned] = useState(false)
  const [scanError, setScanError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const loadItems = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('pantry_items').delete().eq('id', id).eq('user_id', user.id)
    setItems(prev => prev.filter(i => i.id !== id))
  }
  async function toggleUseSoon(item: PantryItem) {
    const next = !item.use_soon
    setItems((cur) => cur.map((x) => (x.id === item.id ? { ...x, use_soon: next } : x)))
    await supabase.from('pantry_items').update({ use_soon: next }).eq('id', item.id)
  }
  async function setExpires(item: PantryItem, date: string) {
    setItems((cur) => cur.map((x) => (x.id === item.id ? { ...x, expires_on: date || null } : x)))
    await supabase.from('pantry_items').update({ expires_on: date || null }).eq('id', item.id)
  }
  const soonCutoff = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const isSoon = (x: PantryItem) => !!x.use_soon || (!!x.expires_on && x.expires_on <= soonCutoff)
  const useSoon = items.filter(isSoon)
  const rest = items.filter((x) => !isSoon(x))


  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    setShowScanned(false)
    setScanError(false)

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      const mediaType = file.type
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setScanning(false); return }

      try {
        const res = await fetch('/api/scan-pantry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mediaType, userId: user.id }),
        })
        const data = await res.json()
        if (data.items) {
          setScannedItems(data.items.map((item: ScannedItem) => ({ ...item, selected: true })))
          setShowScanned(true)
        }
      } catch (err) {
        console.error('Scan error:', err)
        setScanError(true)
      } finally {
        setScanning(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsDataURL(file)
  }

  async function addScannedItems() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setAddingScanned(true)
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
    setAddingScanned(false)
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
            <p className="text-muted-foreground mt-1">What&apos;s in the house comes off your grocery list. Flag anything to <strong>use up</strong> and next week&apos;s dinners get built around it.</p>
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
                disabled={addingScanned}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {addingScanned ? 'Adding...' : 'Add selected'}
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

        {scanError && (
          <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-sm text-destructive">
            Couldn&apos;t read that photo — try a clearer image or add items manually below.
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
          <>
            {useSoon.length > 0 && (
              <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">🥫 Use up this week ({useSoon.length})</p>
                <p className="text-xs text-amber-800 mt-0.5 mb-3">Your next plan builds at least a couple of dinners around these, and they stay off the shopping list.</p>
                <ul className="space-y-2">{useSoon.map((item) => <Row key={item.id} item={item} onToggle={toggleUseSoon} onExpires={setExpires} onRemove={removeItem} />)}</ul>
              </div>
            )}
            {rest.length > 0 && (
              <ul className="space-y-2">{rest.map((item) => <Row key={item.id} item={item} onToggle={toggleUseSoon} onExpires={setExpires} onRemove={removeItem} />)}</ul>
            )}
          </>
        )}

        <div className="mt-10">
          <AmazonRestock
            groups={PANTRY_ESSENTIALS}
            heading="Restock your essentials"
            subheading="Running low? Send any staple straight to Amazon in one tap."
          />
        </div>
      </div>
    </div>
  )
}

function Row({ item, onToggle, onExpires, onRemove }: { item: PantryItem; onToggle: (i: PantryItem) => void; onExpires: (i: PantryItem, d: string) => void; onRemove: (id: string) => void }) {
  const from = item.source === 'order' ? `from your ${item.last_seen ? new Date(item.last_seen).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} order` : item.source === 'scan' ? 'from a photo' : ''
  return (
    <li className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-lg border border-border bg-card">
      <button type="button" onClick={() => onToggle(item)} title={item.use_soon ? 'Planned around — tap to unflag' : 'Use it up this week'} className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${item.use_soon ? 'bg-amber-200 border-amber-400 text-amber-900' : 'bg-white border-border text-muted-foreground hover:border-amber-400'}`}>
        {item.use_soon ? '🥫 use up' : 'use up?'}
      </button>
      <span className="text-sm text-foreground flex-1 min-w-[140px]">
        {item.quantity && item.unit ? <span className="text-muted-foreground mr-2">{item.quantity} {item.unit}</span> : null}
        {item.name}
        {from && <span className="ml-2 text-[11px] text-muted-foreground">{from}</span>}
      </span>
      <label className="text-[11px] text-muted-foreground flex items-center gap-1">
        by
        <input type="date" value={item.expires_on ?? ''} onChange={(e) => onExpires(item, e.target.value)} className="rounded border border-input bg-white px-1.5 py-0.5 text-[11px]" />
      </label>
      <button onClick={() => onRemove(item.id)} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-destructive" aria-label="Remove">
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  )
}
