import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  downloadFile,
  revokeDownloadUrl,
  downloadJSON,
  downloadText,
  downloadMarkdown,
  downloadCSV,
  MIME_TYPES,
} from '@/utils/download'

const createObjectURLMock = vi.fn(() => 'blob:mock-url')
const revokeObjectURLMock = vi.fn()

beforeEach(() => {
  vi.useFakeTimers()
  createObjectURLMock.mockClear()
  revokeObjectURLMock.mockClear()

  globalThis.URL.createObjectURL = createObjectURLMock as unknown as typeof URL.createObjectURL
  globalThis.URL.revokeObjectURL = revokeObjectURLMock as unknown as typeof URL.revokeObjectURL
})

describe('MIME_TYPES', () => {
  it('contains expected types', () => {
    expect(MIME_TYPES.json).toContain('application/json')
    expect(MIME_TYPES.csv).toContain('text/csv')
    expect(MIME_TYPES.md).toContain('text/markdown')
  })
})

describe('downloadFile', () => {
  it('creates blob URL and triggers download via anchor', () => {
    downloadFile('hello', 'test.txt')
    expect(createObjectURLMock).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(150)
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url')
  })

  it('handles Blob input directly', () => {
    const blob = new Blob(['x'], { type: 'application/octet-stream' })
    downloadFile(blob, 'a.bin')
    expect(createObjectURLMock).toHaveBeenCalledOnce()
  })

  it('infers MIME type from filename extension', () => {
    downloadFile('data', 'file.json')
    expect(createObjectURLMock).toHaveBeenCalledOnce()
  })
})

describe('revokeDownloadUrl', () => {
  it('calls URL.revokeObjectURL', () => {
    revokeDownloadUrl('blob:foo')
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:foo')
  })
})

describe('downloadJSON', () => {
  it('serializes data and calls downloadFile', () => {
    downloadJSON({ a: 1 }, 'data')
    expect(createObjectURLMock).toHaveBeenCalledOnce()
  })

  it('handles already-has-extension filename', () => {
    downloadJSON({ a: 1 }, 'data.json')
    expect(createObjectURLMock).toHaveBeenCalledOnce()
  })
})

describe('downloadText / downloadMarkdown / downloadCSV', () => {
  it('downloadText calls downloadFile', () => {
    downloadText('hi', 'note')
    expect(createObjectURLMock).toHaveBeenCalledOnce()
  })

  it('downloadMarkdown calls downloadFile', () => {
    downloadMarkdown('# hi', 'note')
    expect(createObjectURLMock).toHaveBeenCalledOnce()
  })

  it('downloadCSV calls downloadFile', () => {
    downloadCSV('a,b\n1,2', 'data')
    expect(createObjectURLMock).toHaveBeenCalledOnce()
  })
})