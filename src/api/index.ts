/**
 * API 统一导出
 * 统一管理所有 API 模块
 */

import chatlogAPI from './chatlog'
import sessionAPI from './session'
import contactAPI from './contact'
import mediaAPI from './media'
import chatroomAPI from './chatroom'

/**
 * 导出所有 API
 */
export { chatlogAPI, sessionAPI, contactAPI, mediaAPI, chatroomAPI }

/**
 * 默认导出（对象形式）
 */
export default {
  chatlog: chatlogAPI,
  session: sessionAPI,
  contact: contactAPI,
  media: mediaAPI,
  chatroom: chatroomAPI,
}

/**
 * API 版本
 */
export const API_VERSION = 'v1'

/**
 * API 基础路径
 */
export const API_BASE_PATH = '/api/v1'