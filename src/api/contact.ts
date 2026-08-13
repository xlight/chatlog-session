/**
 * 联系人管理 API
 * 对应后端 /api/v1/contact 相关接口
 */

import { request } from '@/utils/request'
import { BaseAPI } from './base'
import { chatroomAPI } from './chatroom'
import type { Contact, BackendContact, OfficialAccountProfile, ChatroomAnnouncement } from '@/types/contact'
import type { OfficialAccountProfilesParams, ChatroomAnnouncementsParams } from '@/types/contact'
import { ContactType } from '@/types/contact'
import type { ContactParams } from '@/types/api'

/**
 * 根据 username 生成头像 URL
 * @param username 头像 MD5 值
 * @param size 头像尺寸，0=大图，132=小图
 * @returns 头像 URL
 */
function getAvatarUrl(username?: string): string {
  if (!username) return ''
  return `/avatar/${username}`
}

/**
 * 转换后端联系人数据到前端格式
 */
function transformContact(backendContact: BackendContact): Contact {
  // 判断联系人类型：@chatroom 优先，其次基于后端 verifyFlag，缺失回落前缀推断
  let type: ContactType
  if (backendContact.userName.endsWith('@chatroom')) {
    type = ContactType.Chatroom
  } else if (backendContact.verifyFlag === 8 || backendContact.verifyFlag === 24) {
    type = ContactType.Official
  } else if (backendContact.verifyFlag === 29) {
    type = ContactType.Official
  } else if (backendContact.userName.startsWith('gh_')) {
    type = ContactType.Official
  } else {
    type = ContactType.Friend
  }

  // 优先使用后端返回的头像 URL，否则通过 userName 生成
  const avatar = backendContact.bigHeadImgUrl || backendContact.smallHeadImgUrl ||
                 getAvatarUrl(backendContact.userName)

  return {
    wxid: backendContact.userName,
    nickname: backendContact.nickName || backendContact.userName,
    remark: backendContact.remark || '',
    alias: backendContact.alias || '',
    avatar,
    type,
    isStarred: false, // 后端未返回，默认false
    isPinned: backendContact.isPinned,
    isMinimized: backendContact.isMinimized,
    bigHeadImgUrl: backendContact.bigHeadImgUrl,
    smallHeadImgUrl: backendContact.smallHeadImgUrl,
    headImgMd5: backendContact.headImgMd5,
  }
}

/**
 * 联系人 API 类
 */
class ContactAPI extends BaseAPI<BackendContact, Contact> {
  protected resourcePath = 'contact'

  protected transform = transformContact

  /**
   * 获取联系人列表
   * GET /api/v1/contact
   *
   * @param params 查询参数
   * @returns 联系人列表
   */
  async getContacts(params?: ContactParams): Promise<Contact[]> {
    const response = await request.get<unknown>(this.resourceUrl, params)
    const items = this.normalizeItems(response)
    return this.transformAll(items)
  }

  /**
   * 获取联系人详情
   * 后端无 /api/v1/contact/:wxid 路由（404），改用 keyword 精确搜索（后端 `=` 匹配）+ userName 匹配
   *
   * @param wxid 联系人微信 ID
   * @returns 联系人详情，未命中返回 null
   */
  async getContactDetail(wxid: string): Promise<Contact | null> {
    const contacts = await this.getContacts({ keyword: wxid, limit: 0 })
    return contacts.find(c => c.wxid === wxid) || null
  }

  /**
   * 获取群聊列表（前端过滤，全量拉取）
   *
   * @returns 群聊列表
   */
  async getChatrooms(): Promise<Contact[]> {
    const all = await this.getContacts({ limit: 0 })
    return all.filter(c => c.type === ContactType.Chatroom)
  }

  /**
   * 获取好友列表（前端过滤，全量拉取）
   *
   * @returns 好友列表
   */
  async getFriends(): Promise<Contact[]> {
    const all = await this.getContacts({ limit: 0 })
    return all.filter(c => c.type === ContactType.Friend)
  }

  /**
   * 获取公众号列表（前端过滤，全量拉取）
   *
   * @returns 公众号列表
   */
  async getOfficialAccounts(): Promise<Contact[]> {
    const all = await this.getContacts({ limit: 0 })
    return all.filter(c => c.type === ContactType.Official)
  }

  /**
   * 搜索联系人
   * GET /api/v1/contact?keyword=xxx
   *
   * @param keyword 搜索关键词
   * @returns 搜索结果
   */
  searchContacts(keyword: string): Promise<Contact[]> {
    return this.getContacts({ keyword })
  }

  /**
   * 获取所有联系人（不分类型，全量拉取 limit=0）
   *
   * @returns 所有联系人
   */
  getAllContacts(): Promise<Contact[]> {
    return this.getContacts({ limit: 0 })
  }

  /**
   * 按首字母分组获取联系人
   *
   * @returns 按首字母分组的联系人
   */
  async getContactsByLetter(): Promise<Record<string, Contact[]>> {
    const contacts = await this.getFriends()
    const grouped: Record<string, Contact[]> = {}

    contacts.forEach(contact => {
      // 获取首字母（简单处理，实际可能需要更复杂的拼音转换）
      const letter = this.getFirstLetter(contact.nickname || contact.alias || contact.wxid)
      if (!grouped[letter]) {
        grouped[letter] = []
      }
      grouped[letter].push(contact)
    })

    // 排序每组内的联系人
    Object.keys(grouped).forEach(letter => {
      grouped[letter].sort((a, b) => {
        const nameA = a.remark || a.nickname || a.alias || a.wxid
        const nameB = b.remark || b.nickname || b.alias || b.wxid
        return nameA.localeCompare(nameB, 'zh-CN')
      })
    })

    return grouped
  }

  /**
   * 获取星标联系人（全量拉取后过滤）
   *
   * @returns 星标联系人列表
   */
  async getStarredContacts(): Promise<Contact[]> {
    const contacts = await this.getContacts({ limit: 0 })
    return contacts.filter(contact => contact.isStarred)
  }

  /**
   * 获取最近联系人（全量拉取后按最后交互时间排序）
   * （根据最后交互时间排序）
   *
   * @param limit 返回数量
   * @returns 最近联系人列表
   */
  async getRecentContacts(limit = 20): Promise<Contact[]> {
    const contacts = await this.getContacts({ limit: 0 })
    return contacts
      .sort((a, b) => {
        const timeA = a.lastContactTime || 0
        const timeB = b.lastContactTime || 0
        return timeB - timeA
      })
      .slice(0, limit)
  }

  /**
   * 获取群聊成员
   * 后端 contact 无 memberList 字段，改从 chatroomAPI.getChatroomDetail（users[]）获取
   *
   * @param chatroomId 群聊 ID
   * @returns 群成员列表
   */
  async getChatroomMembers(chatroomId: string): Promise<Contact[]> {
    const chatroom = await chatroomAPI.getChatroomDetail(chatroomId)
    if (!chatroom) {
      return []
    }

    return chatroom.members.map(member => ({
      wxid: member.wxid,
      nickname: member.nickname,
      remark: '',
      alias: '',
      avatar: member.avatar,
      type: ContactType.Friend,
    }))
  }

  /**
   * 获取联系人统计信息
   *
   * @returns 统计信息
   */
  async getContactStats(): Promise<{
    total: number
    friends: number
    chatrooms: number
    official: number
    starred: number
  }> {
    const [all, friends, chatrooms, official, starred] = await Promise.all([
      this.getAllContacts(),
      this.getFriends(),
      this.getChatrooms(),
      this.getOfficialAccounts(),
      this.getStarredContacts(),
    ])

    return {
      total: all.length,
      friends: friends.length,
      chatrooms: chatrooms.length,
      official: official.length,
      starred: starred.length,
    }
  }

  /**
   * 批量获取联系人详情
   *
   * @param wxids 联系人微信 ID 列表
   * @returns 联系人详情列表
   */
  async getBatchContactDetails(wxids: string[]): Promise<Contact[]> {
    const promises = wxids.map(wxid =>
      this.getContactDetail(wxid).catch(() => null)
    )
    const contacts = await request.all<Contact>(promises)
    return contacts.filter((c): c is Contact => c !== null)
  }

  /**
   * 获取联系人显示名称
   * （优先级：备注 > 昵称 > 别名 > 微信号）
   *
   * @param contact 联系人对象
   * @returns 显示名称
   */
  getDisplayName(contact: Contact): string {
    return contact.remark || contact.nickname || contact.alias || contact.wxid
  }

  /**
   * 获取首字母（简单实现）
   *
   * @param name 名称
   * @returns 首字母
   */
  private getFirstLetter(name: string): string {
    if (!name) return '#'

    const firstChar = name.charAt(0).toUpperCase()

    // 如果是英文字母
    if (/[A-Z]/.test(firstChar)) {
      return firstChar
    }

    // 其他字符归类到 #
    return '#'
  }

  /**
   * 获取公众号画像列表
   * GET /api/v1/contact/official-accounts（画像：注册主体/认证/类目/小程序）
   * 显式传 limit 默认 50 对齐后端；区别于 getOfficialAccounts（联系人列表公众号子集）
   *
   * @param params 查询参数（keyword/limit/offset）
   * @returns 公众号画像列表
   */
  async getOfficialAccountProfiles(
    params?: OfficialAccountProfilesParams,
  ): Promise<OfficialAccountProfile[]> {
    const queryParams: Record<string, unknown> = {}
    if (params?.keyword) {
      queryParams.keyword = params.keyword
    }
    queryParams.limit = params?.limit ?? 50
    if (params?.offset) {
      queryParams.offset = params.offset
    }
    const response = await request.get<{
      items: Array<{
        user_name: string
        brand_icon_url: string
        brand_flag: number
        brand_info: string
        company: string
        external_info: string
        category: string
        mini_programs: string[]
      }>
      total: number
    }>('/api/v1/contact/official-accounts', queryParams)
    return (response.items || []).map(item => ({
      userName: item.user_name,
      brandIconUrl: item.brand_icon_url,
      brandFlag: item.brand_flag,
      brandInfo: item.brand_info,
      company: item.company,
      externalInfo: item.external_info,
      category: item.category,
      miniPrograms: item.mini_programs || [],
    }))
  }

  /**
   * 获取群公告列表
   * GET /api/v1/contact/announcements（content 内容模糊匹配）
   * 显式传 limit 默认 50 对齐后端
   *
   * @param params 查询参数（content/limit/offset）
   * @returns 群公告列表
   */
  async getAnnouncements(params?: ChatroomAnnouncementsParams): Promise<ChatroomAnnouncement[]> {
    const queryParams: Record<string, unknown> = {}
    if (params?.content) {
      queryParams.content = params.content
    }
    queryParams.limit = params?.limit ?? 50
    if (params?.offset) {
      queryParams.offset = params.offset
    }
    const response = await request.get<{
      items: Array<{
        room_id: number
        user_name: string
        announcement: string
        editor: string
        publish_time: number
        xml_announcement: string
      }>
    }>('/api/v1/contact/announcements', queryParams)
    return (response.items || []).map(item => ({
      roomId: item.room_id,
      userName: item.user_name,
      announcement: item.announcement,
      editor: item.editor,
      publishTime: item.publish_time,
      xmlAnnouncement: item.xml_announcement,
    }))
  }
}

/**
 * 导出单例
 */
export const contactAPI = new ContactAPI()

/**
 * 导出工具函数
 */
export { getAvatarUrl }

/**
 * 默认导出
 */
export default contactAPI
