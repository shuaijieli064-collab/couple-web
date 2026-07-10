self.addEventListener('push', function(event) {
  if (!event.data) return

  const data = event.data.json()

  const options = {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-72x72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'notification',
    renotify: true,
    data: data.url || '/',
    actions: data.actions || [],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || '我们的时光', options)
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  const url = event.notification.data || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
