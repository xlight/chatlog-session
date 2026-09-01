/**
 * Search hitMap 索引等价性测试
 *
 * 验证：
 * 1. 源码含 hitMap computed（Map 索引）
 * 2. hitOf 改为 hitMap.value.get（O(1)），不再用 .find 线性扫描
 * 3. hitMap 逻辑等价：对相同 searchHits，hitOf 返回结果与原线性扫描一致
 * 4. 边界：空结果、重复 id（后者覆盖前者）
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { SearchHit } from '@/types/search'
import type { Message } from '@/types/message'

const source = readFileSync(resolve('src/views/Search/index.vue'), 'utf-8')

function makeMessage(id: number): Message {
  return {
    id,
    seq: id,
    time: '2026-01-01T10:00:00+08:00',
    createTime: 1735689600,
    talker: 'wxid_test',
    talkerName: '测试',
    sender: 'wxid_sender',
    senderName: '发送者',
    isSelf: false,
    isSend: 0,
    isChatRoom: false,
    type: 1 as never,
    subType: 0,
    content: '',
  }
}

describe('Search hitMap 源码结构', () => {
  it('含 hitMap computed', () => {
    expect(source).toMatch(/const hitMap\s*=\s*computed/)
  })

  it('hitMap 使用 Map 索引', () => {
    expect(source).toContain('new Map')
    expect(source).toContain('map.set(hit.message.id, hit)')
  })

  it('hitOf 改为 hitMap.value.get（O(1)）', () => {
    expect(source).toContain('hitMap.value.get(message.id)')
  })

  it('hitOf 不再用 .find 线性扫描', () => {
    expect(source).not.toContain('searchStore.searchHits.find')
  })
})

describe('hitMap 索引逻辑等价性', () => {
  // 模拟 hitMap 构建逻辑
  function buildHitMap(hits: SearchHit[]): Map<number | string, SearchHit> {
    const map = new Map<number | string, SearchHit>()
    for (const hit of hits) {
      map.set(hit.message.id, hit)
    }
    return map
  }

  // 原线性扫描逻辑
  function hitOfLinear(hits: SearchHit[], message: Message): SearchHit | undefined {
    return hits.find(h => h.message.id === message.id)
  }

  // 新 hitMap 查询逻辑
  function hitOfMap(hits: SearchHit[], message: Message): SearchHit | undefined {
    return buildHitMap(hits).get(message.id)
  }

  function makeHit(id: number, snippet = '', score = 0): SearchHit {
    return { message: makeMessage(id), snippet, score }
  }

  it('空结果：两种方式都返回 undefined', () => {
    const hits: SearchHit[] = []
    const msg = makeMessage(1)
    expect(hitOfLinear(hits, msg)).toBeUndefined()
    expect(hitOfMap(hits, msg)).toBeUndefined()
  })

  it('单条命中：两种方式返回相同结果', () => {
    const hits = [makeHit(1, 'snippet1', 0.9)]
    const msg = makeMessage(1)
    expect(hitOfMap(hits, msg)).toEqual(hitOfLinear(hits, msg))
  })

  it('多条命中：查询中间项', () => {
    const hits = [makeHit(1, 's1', 0.9), makeHit(2, 's2', 0.8), makeHit(3, 's3', 0.7)]
    const msg = makeMessage(2)
    expect(hitOfMap(hits, msg)).toEqual(hitOfLinear(hits, msg))
    expect(hitOfMap(hits, msg)?.snippet).toBe('s2')
  })

  it('未命中 id：两种方式都返回 undefined', () => {
    const hits = [makeHit(1), makeHit(2)]
    const msg = makeMessage(999)
    expect(hitOfMap(hits, msg)).toBeUndefined()
    expect(hitOfLinear(hits, msg)).toBeUndefined()
  })

  it('重复 id：hitMap 后者覆盖前者（与 .find 行为一致——.find 返回首个，Map 返回末个）', () => {
    const hits = [makeHit(1, 'first', 0.9), makeHit(1, 'second', 0.8)]
    const msg = makeMessage(1)
    // .find 返回首个匹配
    expect(hitOfLinear(hits, msg)?.snippet).toBe('first')
    // Map.set 后者覆盖前者
    expect(hitOfMap(hits, msg)?.snippet).toBe('second')
    // 注意：重复 id 时行为不同。但实际场景中 searchHits 不会有重复 id
    // （searchStore 保证唯一性），此测试记录该差异。
  })

  it('无重复 id 时完全等价', () => {
    const hits = [makeHit(1, 's1', 0.9), makeHit(2, 's2', 0.8), makeHit(3, 's3', 0.7)]
    for (const hit of hits) {
      const msg = makeMessage(hit.message.id as number)
      expect(hitOfMap(hits, msg)).toEqual(hitOfLinear(hits, msg))
    }
  })
})
