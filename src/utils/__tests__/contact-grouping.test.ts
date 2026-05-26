import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ensureContactIndex,
  batchEnsureContactIndexes,
  groupAndSortContacts,
  generateIndexList,
  flattenGroups,
  filterContacts,
  toggleContactStar,
  getGroupStats,
} from '@/utils/contact-grouping'
import type { Contact } from '@/types/contact'
import { ContactType } from '@/types/contact'

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    wxid: 'wxid_' + Math.random().toString(36).slice(2, 8),
    nickname: 'User',
    type: ContactType.Friend,
    ...overrides,
  } as Contact
}

describe('ensureContactIndex', () => {
  it('computes pinyinInitial and sortKey when missing', () => {
    const c = makeContact({ nickname: 'Alice' })
    ensureContactIndex(c)
    expect(c.pinyinInitial).toBe('A')
    expect(c.sortKey).toBe('alice')
  })

  it('uses remark over nickname for indexing', () => {
    const c = makeContact({ nickname: 'Alice', remark: 'Bob' })
    ensureContactIndex(c)
    expect(c.pinyinInitial).toBe('B')
  })

  it('returns ⭐ for starred contacts', () => {
    const c = makeContact({ nickname: 'Alice', isStarred: true })
    ensureContactIndex(c)
    expect(c.pinyinInitial).toBe('⭐')
  })

  it('does not overwrite existing values', () => {
    const c = makeContact({ pinyinInitial: 'X', sortKey: 'preserved' })
    ensureContactIndex(c)
    expect(c.pinyinInitial).toBe('X')
    expect(c.sortKey).toBe('preserved')
  })
})

describe('batchEnsureContactIndexes', () => {
  it('processes all contacts', () => {
    const contacts = [
      makeContact({ nickname: 'Alice' }),
      makeContact({ nickname: 'Bob' }),
    ]
    batchEnsureContactIndexes(contacts)
    expect(contacts[0].pinyinInitial).toBe('A')
    expect(contacts[1].pinyinInitial).toBe('B')
  })
})

describe('groupAndSortContacts', () => {
  it('groups contacts by pinyin initial and sorts groups', () => {
    const contacts = [
      makeContact({ nickname: 'Bob' }),
      makeContact({ nickname: 'Alice' }),
      makeContact({ nickname: 'Charlie' }),
    ]
    const groups = groupAndSortContacts(contacts)
    const letters = groups.filter(g => g.type === 'letter').map(g => g.key)
    expect(letters).toEqual(['A', 'B', 'C'])
  })

  it('puts starred contacts in their own group at the top', () => {
    const contacts = [
      makeContact({ nickname: 'Alice' }),
      makeContact({ nickname: 'Bob', isStarred: true }),
    ]
    const groups = groupAndSortContacts(contacts)
    expect(groups[0].type).toBe('starred')
    expect(groups[0].key).toBe('⭐')
  })

  it('sorts starred contacts by starredAt desc', () => {
    const contacts = [
      makeContact({ nickname: 'A', isStarred: true, starredAt: 1000 }),
      makeContact({ nickname: 'B', isStarred: true, starredAt: 2000 }),
    ]
    const groups = groupAndSortContacts(contacts)
    const starred = groups.find(g => g.type === 'starred')!
    expect(starred.contacts[0].nickname).toBe('B')
    expect(starred.contacts[1].nickname).toBe('A')
  })
})

describe('generateIndexList', () => {
  it('returns all group keys with enabled flag', () => {
    const contacts = [makeContact({ nickname: 'Alice' }), makeContact({ nickname: 'Bob' })]
    const groups = groupAndSortContacts(contacts)
    const indexList = generateIndexList(groups)
    const enabledKeys = indexList.filter(i => i.enabled).map(i => i.label)
    expect(enabledKeys).toContain('A')
    expect(enabledKeys).toContain('B')
  })
})

describe('flattenGroups', () => {
  it('flattens groups into header + item entries', () => {
    const contacts = [makeContact({ nickname: 'Alice', wxid: 'w1' })]
    const groups = groupAndSortContacts(contacts)
    const flat = flattenGroups(groups)
    expect(flat[0].type).toBe('header')
    expect(flat[1].type).toBe('item')
    expect(flat[1].key).toBe('w1')
  })
})

describe('filterContacts', () => {
  const sample: Contact[] = [
    makeContact({
      wxid: 'wxid_alice',
      nickname: 'Alice',
      remark: 'BFF',
      alias: 'al',
      sortKey: 'alice',
      pinyinInitial: 'A',
    }),
    makeContact({
      wxid: 'wxid_bob',
      nickname: 'Bob',
      sortKey: 'bob',
      pinyinInitial: 'B',
    }),
  ]

  it('returns all contacts for empty keyword', () => {
    expect(filterContacts(sample, '')).toEqual(sample)
    expect(filterContacts(sample, '   ')).toEqual(sample)
  })

  it('matches by nickname', () => {
    const result = filterContacts(sample, 'alice')
    expect(result).toHaveLength(1)
    expect(result[0].wxid).toBe('wxid_alice')
  })

  it('matches by remark', () => {
    const result = filterContacts(sample, 'bff')
    expect(result).toHaveLength(1)
  })

  it('matches by alias', () => {
    expect(filterContacts(sample, 'al')).toHaveLength(1)
  })

  it('matches by wxid', () => {
    const result = filterContacts(sample, 'wxid_bob')
    expect(result).toHaveLength(1)
  })

  it('matches by sortKey/pinyin', () => {
    const result = filterContacts(sample, 'bob')
    expect(result).toHaveLength(1)
  })

  it('matches by pinyin initial when exact match', () => {
    const result = filterContacts(sample, 'a')
    expect(result.length).toBeGreaterThanOrEqual(1)
  })
})

describe('toggleContactStar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('marks as starred and sets starredAt', () => {
    const c = makeContact({ nickname: 'Alice' })
    toggleContactStar(c, true)
    expect(c.isStarred).toBe(true)
    expect(c.starredAt).toBe(new Date('2026-05-15T10:00:00Z').getTime())
    expect(c.pinyinInitial).toBe('⭐')
  })

  it('unstars and clears starredAt', () => {
    const c = makeContact({
      nickname: 'Alice',
      isStarred: true,
      starredAt: 1000,
      pinyinInitial: '⭐',
    })
    toggleContactStar(c, false)
    expect(c.isStarred).toBe(false)
    expect(c.starredAt).toBeUndefined()
    expect(c.pinyinInitial).toBe('A')
  })
})

describe('getGroupStats', () => {
  it('counts contacts per group type', () => {
    const contacts = [
      makeContact({ nickname: 'Alice', isStarred: true }),
      makeContact({ nickname: 'Bob' }),
      makeContact({ nickname: 'Charlie' }),
    ]
    const groups = groupAndSortContacts(contacts)
    const stats = getGroupStats(groups)
    expect(stats.total).toBe(3)
    expect(stats.starred).toBe(1)
    expect(stats.letters).toBe(2)
  })
})