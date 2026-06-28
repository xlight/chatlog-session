export function formatFileSize(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B'
  if (!bytes || bytes < 0) return '-'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm))

  return `${size} ${sizes[i]}`
}

export function formatNumber(num: number): string {
  if (!num && num !== 0) return '-'
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default {
  formatFileSize,
  formatNumber,
}
