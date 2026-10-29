'use client'
export default function PrintButton() {
  return <button onClick={() => window.print()} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90">Print the card</button>
}
