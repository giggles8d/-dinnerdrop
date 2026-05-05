export const STORE_OPTIONS = ['Walmart', 'Amazon Fresh', 'Instacart', 'Target', 'Kroger'] as const;
export type StoreName = typeof STORE_OPTIONS[number];

export function getStoreSearchUrl(storeName: string, searchTerm: string): string {
  const encoded = encodeURIComponent(searchTerm);
  switch (storeName) {
    case 'Walmart':
      return `https://www.walmart.com/search?q=${encoded}&affilsrc=api&veh=aff&wmlspartner=REPLACE_WITH_WALMART_AFFILIATE_ID`;
    case 'Amazon Fresh':
      return `https://www.amazon.com/s?k=${encoded}&i=amazonfresh&tag=REPLACE_WITH_AMAZON_ASSOCIATE_TAG`;
    case 'Instacart':
      return `https://www.instacart.com/products/search?q=${encoded}`;
    case 'Target':
      return `https://www.target.com/s?searchTerm=${encoded}`;
    case 'Kroger':
      return ''; // Kroger uses OAuth cart push at list level
    default:
      return `https://www.google.com/search?q=${encoded}+grocery`;
  }
}

export function getStoreHomepageUrl(storeName: string): string {
  switch (storeName) {
    case 'Walmart':
      return 'https://www.walmart.com/';
    case 'Amazon Fresh':
      return 'https://www.amazon.com/fresh';
    case 'Instacart':
      return 'https://www.instacart.com/';
    case 'Target':
      return 'https://www.target.com/';
    case 'Kroger':
      return 'https://www.kroger.com/';
    default:
      return '#';
  }
}
