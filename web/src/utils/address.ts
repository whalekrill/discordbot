export function formatAddressEllipsis(address: string | undefined): string {
  if (!address) return ''
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}
