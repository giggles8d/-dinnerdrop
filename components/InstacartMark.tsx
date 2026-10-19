/** Official Instacart carrot mark (Instacart logo kit) and a "Powered by Instacart" badge — reuse wherever the integration is mentioned. */
export function InstacartCarrot({ height = 22, className = '' }: { height?: number; className?: string }) {
  const width = Math.round(height * (42.3 / 52.9))
  return (
    <svg width={width} height={height} viewBox="0 0 42.3 52.9" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M36.4,8.6c-2.3,0-4,1-5.5,3.2l-4.4,6.4V0H15.9v18.2l-4.4-6.4C9.9,9.6,8.2,8.6,5.9,8.6C2.4,8.6,0,11.2,0,14.4c0,2.7,1.3,4.5,4,6.3l17.1,11l17.1-11c2.7-1.8,4-3.5,4-6.3C42.3,11.2,39.9,8.6,36.4,8.6z" fill="#0AAD0A" />
      <path d="M21.1,34.4c10.2,0,18.5,7.6,18.5,18.5h-37C2.6,42,11,34.4,21.1,34.4z" fill="#FF7009" />
    </svg>
  )
}

export function PoweredByInstacart({ className = '', text = 'Powered by Instacart' }: { className?: string; text?: string }) {
  return (
    <span className={`inline-flex shrink-0 whitespace-nowrap items-center gap-2 rounded-full border border-[#003D29]/15 bg-white px-3 py-1.5 text-xs font-bold text-[#003D29] shadow-sm ${className}`}>
      <InstacartCarrot height={16} />
      {text}
    </span>
  )
}

/** Thin band: the integration in one line, with the stores it reaches. */
export function InstacartBand({ stores = ['Wegmans', 'Aldi', 'Tops', 'Price Chopper', 'Weis', 'Target', 'Costco', 'Kroger'] }: { stores?: string[] }) {
  return (
    <div className="border-y border-border bg-white">
      <div className="container mx-auto px-4 py-5 max-w-6xl flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <PoweredByInstacart text="Built on the Instacart Developer Platform" />
        <p className="text-sm text-muted-foreground leading-snug">
          One tap and your whole list opens in <span className="font-semibold text-foreground">your own Instacart account</span>, every item matched — then you pick the store and check out there. Works with {stores.slice(0, -1).join(', ')}, {stores[stores.length - 1]} and every store on Instacart near you.
        </p>
      </div>
    </div>
  )
}
