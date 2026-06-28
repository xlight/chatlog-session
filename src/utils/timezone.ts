export function toCST(date: Date): string {
  const utcTime = date.getTime()
  const cstTime = utcTime + (8 * 60 * 60 * 1000)
  const cstDate = new Date(cstTime)

  const year = cstDate.getUTCFullYear()
  const month = String(cstDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(cstDate.getUTCDate()).padStart(2, '0')
  const hours = String(cstDate.getUTCHours()).padStart(2, '0')
  const minutes = String(cstDate.getUTCMinutes()).padStart(2, '0')
  const seconds = String(cstDate.getUTCSeconds()).padStart(2, '0')
  const milliseconds = String(cstDate.getUTCMilliseconds()).padStart(3, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}+08:00`
}

export function formatCSTTime(date: Date): string {
  const cstHours = (date.getUTCHours() + 8) % 24
  const minutes = date.getUTCMinutes()
  const seconds = date.getUTCSeconds()
  return `${String(cstHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatCSTRange(startDate: Date, endDate: Date): string {
  return `${toCST(startDate)}~${toCST(endDate)}`
}

export function formatCSTDate(date: Date): string {
  const cstString = toCST(date)
  return cstString.split('T')[0]
}

export function subtractDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() - days)
  return result
}
