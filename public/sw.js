/* eslint-env serviceworker */

// Chatlog Session - Service Worker
// Version: 1.0.0

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `chatlog-session-${CACHE_VERSION}`;
const API_CACHE_NAME = `chatlog-api-${CACHE_VERSION}`;
const IMAGE_CACHE_NAME = `chatlog-images-${CACHE_VERSION}`;

// 需要预缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// API 缓存配置
const API_CACHE_CONFIG = {
  maxAge: 5 * 60 * 1000, // 5分钟
  maxEntries: 50,
};

// 图片缓存配置
const IMAGE_CACHE_CONFIG = {
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
  maxEntries: 100,
};

// ============================================================================
// Install Event - 安装时预缓存静态资源
// ============================================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Service Worker installed successfully');
        // 立即激活新的 Service Worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// ============================================================================
// Activate Event - 清理旧缓存
// ============================================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 删除旧版本的缓存
            if (
              cacheName.startsWith('chatlog-') &&
              cacheName !== CACHE_NAME &&
              cacheName !== API_CACHE_NAME &&
              cacheName !== IMAGE_CACHE_NAME
            ) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        // 立即控制所有页面
        return self.clients.claim();
      })
  );
});

// ============================================================================
// Fetch Event - 拦截网络请求
// ============================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源或 API 请求
  if (url.origin === location.origin || isApiRequest(url)) {
    event.respondWith(handleFetch(request, url));
  }
});

// ============================================================================
// 处理 Fetch 请求
// ============================================================================
async function handleFetch(request, url) {
  // 1. 静态资源：Cache First
  if (isStaticAsset(url)) {
    return cacheFirst(request, CACHE_NAME);
  }

  // 2. 图片资源：Cache First with Network Fallback
  if (isImageRequest(url)) {
    return cacheFirstWithExpiry(request, IMAGE_CACHE_NAME, IMAGE_CACHE_CONFIG);
  }

  // 3. API 请求：Network First with Cache Fallback
  if (isApiRequest(url)) {
    return networkFirstWithCache(request, API_CACHE_NAME, API_CACHE_CONFIG);
  }

  // 4. HTML 页面：Network First
  if (request.mode === 'navigate') {
    return networkFirst(request, CACHE_NAME);
  }

  // 5. 其他请求：Network Only
  return fetch(request);
}

// ============================================================================
// 缓存策略：Cache First
// ============================================================================
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    console.log('[SW] Cache hit:', request.url);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    return new Response('Network error', { status: 408 });
  }
}

// ============================================================================
// 缓存策略：Cache First with Expiry
// ============================================================================
async function cacheFirstWithExpiry(request, cacheName, config) {
  const cached = await caches.match(request);
  
  if (cached) {
    const cachedDate = new Date(cached.headers.get('sw-cached-date'));
    const now = Date.now();
    
    // 检查缓存是否过期
    if (cachedDate && (now - cachedDate.getTime()) < config.maxAge) {
      console.log('[SW] Cache hit (fresh):', request.url);
      return cached;
    } else {
      console.log('[SW] Cache hit (stale):', request.url);
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      // 添加缓存时间戳
      const responseToCache = new Response(response.clone().body, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers({
          ...Object.fromEntries(response.headers.entries()),
          'sw-cached-date': new Date().toISOString(),
        }),
      });

      const cache = await caches.open(cacheName);
      cache.put(request, responseToCache);
      
      // 限制缓存数量
      await limitCacheSize(cacheName, config.maxEntries);
    }
    return response;
  } catch (error) {
    // 网络失败，返回过期的缓存
    if (cached) {
      console.log('[SW] Network failed, returning stale cache:', request.url);
      return cached;
    }
    throw error;
  }
}

// ============================================================================
// 缓存策略：Network First with Cache Fallback
// ============================================================================
async function networkFirstWithCache(request, cacheName, config) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // 只缓存成功的 GET 请求
      if (request.method === 'GET') {
        const responseToCache = new Response(response.clone().body, {
          status: response.status,
          statusText: response.statusText,
          headers: new Headers({
            ...Object.fromEntries(response.headers.entries()),
            'sw-cached-date': new Date().toISOString(),
          }),
        });

        const cache = await caches.open(cacheName);
        cache.put(request, responseToCache);
        
        // 限制缓存数量
        await limitCacheSize(cacheName, config.maxEntries);
      }
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cached = await caches.match(request);
    if (cached) {
      console.log('[SW] Cache fallback:', request.url);
      return cached;
    }
    
    // 返回离线页面或错误响应
    return new Response(
      JSON.stringify({ error: 'Network error', offline: true }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ============================================================================
// 缓存策略：Network First
// ============================================================================
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// ============================================================================
// 限制缓存大小
// ============================================================================
async function limitCacheSize(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxEntries) {
    // 删除最老的缓存
    const deleteCount = keys.length - maxEntries;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// ============================================================================
// 判断请求类型
// ============================================================================
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.eot'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

function isImageRequest(url) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];
  return imageExtensions.some(ext => url.pathname.toLowerCase().endsWith(ext));
}

function isApiRequest(url) {
  // 根据你的 API 地址调整
  return url.pathname.startsWith('/api/') || 
         url.hostname.includes('your-api-domain.com') ||
         url.port === '5030'; // 假设 API 运行在 5030 端口
}

// ============================================================================
// Message Event - 处理来自页面的消息
// ============================================================================
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data);

  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
        
      case 'CLEAR_CACHE':
        handleClearCache(event);
        break;
        
      case 'GET_CACHE_SIZE':
        handleGetCacheSize(event);
        break;
        
      case 'UPDATE_CACHE':
        handleUpdateCache(event);
        break;
        
      default:
        console.log('[SW] Unknown message type:', event.data.type);
    }
  }
});

// ============================================================================
// 清空缓存
// ============================================================================
async function handleClearCache(event) {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(name => name.startsWith('chatlog-'))
        .map(name => caches.delete(name))
    );
    
    event.ports[0].postMessage({
      success: true,
      message: 'All caches cleared',
    });
  } catch (error) {
    event.ports[0].postMessage({
      success: false,
      error: error.message,
    });
  }
}

// ============================================================================
// 获取缓存大小
// ============================================================================
async function handleGetCacheSize(event) {
  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    const details = {};

    for (const cacheName of cacheNames) {
      if (cacheName.startsWith('chatlog-')) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        details[cacheName] = keys.length;
        totalSize += keys.length;
      }
    }

    event.ports[0].postMessage({
      success: true,
      totalEntries: totalSize,
      details,
    });
  } catch (error) {
    event.ports[0].postMessage({
      success: false,
      error: error.message,
    });
  }
}

// ============================================================================
// 更新缓存
// ============================================================================
async function handleUpdateCache(event) {
  try {
    const { urls } = event.data;
    const cache = await caches.open(CACHE_NAME);
    
    await Promise.all(
      urls.map(url => 
        fetch(url)
          .then(response => {
            if (response.ok) {
              return cache.put(url, response);
            }
          })
          .catch(err => console.error('[SW] Failed to update cache for:', url, err))
      )
    );

    event.ports[0].postMessage({
      success: true,
      message: 'Cache updated',
    });
  } catch (error) {
    event.ports[0].postMessage({
      success: false,
      error: error.message,
    });
  }
}

// ============================================================================
// Push Notification Event
// ============================================================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const options = {
    body: 'You have new messages',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: 'explore',
        title: '查看',
        icon: '/icons/checkmark.png',
      },
      {
        action: 'close',
        title: '关闭',
        icon: '/icons/xmark.png',
      },
    ],
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || options.body;
      options.data = { ...options.data, ...data };
    } catch (e) {
      console.error('[SW] Failed to parse push data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification('Chatlog Session', options)
  );
});

// ============================================================================
// Notification Click Event
// ============================================================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// ============================================================================
// Sync Event - 后台同步
// ============================================================================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  try {
    // 这里可以实现后台同步逻辑
    console.log('[SW] Syncing messages...');
    // await fetch('/api/sync', { method: 'POST' });
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// ============================================================================
// Periodic Sync Event - 定期同步
// ============================================================================
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);

  if (event.tag === 'periodic-sync') {
    event.waitUntil(periodicSync());
  }
});

async function periodicSync() {
  try {
    console.log('[SW] Running periodic sync...');
    // 定期同步逻辑
  } catch (error) {
    console.error('[SW] Periodic sync failed:', error);
  }
}

console.log('[SW] Service Worker loaded');