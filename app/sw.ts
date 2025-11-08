/// <reference lib="webworker" />
import { Serwist } from 'serwist';

declare let self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | PrecacheEntry)[];
};

interface PrecacheEntry {
  url: string;
  revision?: string;
}

// Filter out files that might not exist in production or cause 404 errors
const filteredManifest = self.__SW_MANIFEST.filter((entry) => {
  const url = typeof entry === 'string' ? entry : entry.url;
  // Skip notification sound and manifest - they'll be handled by runtime caching
  return !url.includes('notification-sound.mp3') && !url.includes('manifest.json');
});

// 创建 Serwist 实例
const serwist = new Serwist({
  precacheEntries: filteredManifest,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
});

// 自定义消息处理
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION',
      version: '1.0.0',
    });
  }
});

// 推送通知处理
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: data.data,
    actions: data.actions || [],
    tag: data.tag || 'default',
    renotify: true,
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 通知点击处理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 检查是否已有窗口打开
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // 打开新窗口
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// 后台同步处理
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // 执行后台同步任务
      fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: Date.now(),
        }),
      }).catch(() => {
        // 同步失败，稍后重试
        console.log('Background sync failed, will retry later');
      })
    );
  }
});

// 启动 Serwist
serwist.addEventListeners();
