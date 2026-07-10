import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

const DISMISS_KEY = 'couple-web-pwa-install-dismissed'
const INSTALL_SHOWN_KEY = 'couple-web-pwa-install-shown'

let deferredPrompt: BeforeInstallPromptEvent | null = null
let promptCaptured = false

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIOS() {
  const userAgent = navigator.userAgent
  return /iPad|iPhone|iPod/.test(userAgent) && !/MacIntel/.test(userAgent)
}

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768
}

function isDesktop() {
  return !isMobile()
}

function isChromeAndroid() {
  return /Android/i.test(navigator.userAgent) && /Chrome/i.test(navigator.userAgent) && !/Edg/i.test(navigator.userAgent)
}

function isSafari() {
  return /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent) && !/Edg/i.test(navigator.userAgent)
}

if (typeof window !== 'undefined' && !promptCaptured) {
  promptCaptured = true
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
  })
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [iosDevice, setIosDevice] = useState(false)
  const [desktopDevice, setDesktopDevice] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [showRefresh, setShowRefresh] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const { updateServiceWorker } = useRegisterSW({
    onRegistered(r) {
      if (!r) return
      r.addEventListener('updatefound', () => {
        const newWorker = r.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              const reg = r as ServiceWorkerRegistration & { controller?: ServiceWorker | null }
              if (reg.controller) {
                setShowRefresh(true)
              }
            }
          })
        }
      })
    },
    onRegisterError(error) {
      console.error('SW registration error:', error)
    },
  })

  useEffect(() => {
    if (isStandalone()) return

    const ios = isIOS()
    const desktop = isDesktop()
    setIosDevice(ios)
    setDesktopDevice(desktop)

    const dismissed = localStorage.getItem(DISMISS_KEY)
    const shown = localStorage.getItem(INSTALL_SHOWN_KEY)
    const lastShownDate = shown ? parseInt(shown, 10) : 0
    const now = Date.now()
    const oneWeek = 7 * 24 * 60 * 60 * 1000

    if (dismissed && now - lastShownDate < oneWeek) {
      return
    }

    if (ios) {
      setVisible(true)
      return
    }

    if (deferredPrompt) {
      setVisible(true)
      return
    }

    if (desktop) {
      setTimeout(() => {
        if (!isStandalone() && !localStorage.getItem(DISMISS_KEY)) {
          setVisible(true)
        }
      }, 3000)
      return
    }

    function handleBeforeInstall(event: BeforeInstallPromptEvent) {
      event.preventDefault()
      deferredPrompt = event
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    localStorage.setItem(INSTALL_SHOWN_KEY, Date.now().toString())
    setVisible(false)
  }

  async function install() {
    if (!deferredPrompt || installing) return
    setInstalling(true)
    try {
      const promptEvent = deferredPrompt
      await promptEvent.prompt()
      const result = await promptEvent.userChoice
      if (result.outcome === 'accepted') {
        deferredPrompt = null
        setVisible(false)
        localStorage.setItem(DISMISS_KEY, '1')
      } else {
        setManualMode(true)
      }
    } catch {
      setManualMode(true)
    } finally {
      setInstalling(false)
    }
  }

  async function refreshApp() {
    setRefreshing(true)
    try {
      await updateServiceWorker(true)
    } catch (e) {
      console.error('Failed to update service worker:', e)
      window.location.reload()
    }
  }

  if (!visible && !showRefresh) return null

  return (
    <>
      {visible && (
        <div
          className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-[60] animate-[fade-in-up_0.3s_ease-out]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
        >
          <div className="bg-white/95 backdrop-blur-md border border-sakura-100 rounded-2xl shadow-lg shadow-sakura-100/40 p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">📲</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-cloud-800 text-sm">
                  {manualMode ? '手动安装' : iosDevice ? '安装到主屏幕' : desktopDevice ? '安装到桌面' : '安装到主屏幕'}
                </p>
                {manualMode ? (
                  <div className="text-xs text-cloud-500 mt-1 leading-relaxed space-y-1">
                    {isChromeAndroid() ? (
                      <>
                        <p>Chrome 浏览器操作：</p>
                        <ol className="list-decimal list-inside space-y-0.5">
                          <li>点击右上角 ⋮ 菜单</li>
                          <li>选择「安装应用」</li>
                          <li>点击「安装」确认</li>
                        </ol>
                      </>
                    ) : isSafari() && iosDevice ? (
                      <>
                        <p>Safari 浏览器操作：</p>
                        <ol className="list-decimal list-inside space-y-0.5">
                          <li>点击底部 ↗ 分享按钮</li>
                          <li>向下滑动找到「添加到主屏幕」</li>
                          <li>点击「添加」完成</li>
                        </ol>
                      </>
                    ) : desktopDevice ? (
                      <>
                        <p>桌面 Chrome 操作：</p>
                        <ol className="list-decimal list-inside space-y-0.5">
                          <li>点击地址栏右侧 ➕ 安装图标</li>
                          <li>或点击右上角 ⋮ → 更多工具 → 安装应用</li>
                        </ol>
                      </>
                    ) : (
                      <>
                        <p>浏览器操作：</p>
                        <ol className="list-decimal list-inside space-y-0.5">
                          <li>点击浏览器菜单（⋮ 或 ···）</li>
                          <li>选择「安装应用」或「添加到主屏幕」</li>
                        </ol>
                      </>
                    )}
                  </div>
                ) : iosDevice ? (
                  <div className="text-xs text-cloud-500 mt-1 leading-relaxed space-y-1">
                    <p>在 Safari 中点击底部 ↗ 分享按钮</p>
                    <p>向下滑动，选择「添加到主屏幕」</p>
                    <p>像 App 一样打开，体验更好！</p>
                  </div>
                ) : desktopDevice ? (
                  <p className="text-xs text-cloud-500 mt-1 leading-relaxed">
                    安装到桌面后，点击图标即可打开，体验更流畅。
                  </p>
                ) : (
                  <p className="text-xs text-cloud-500 mt-1 leading-relaxed">
                    安装后可以全屏使用，打开更快，更适合日常记录。
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  {!iosDevice && deferredPrompt && !manualMode && (
                    <button
                      type="button"
                      onClick={install}
                      disabled={installing}
                      className="px-3 py-1.5 text-xs text-white bg-gradient-to-r from-sakura-400 to-sakura-500 rounded-lg disabled:opacity-50"
                    >
                      {installing ? '安装中...' : '立即安装'}
                    </button>
                  )}
                  {!manualMode && (
                    <button
                      type="button"
                      onClick={() => setManualMode(true)}
                      className="px-3 py-1.5 text-xs text-sakura-500 hover:bg-sakura-50 rounded-lg transition-colors"
                    >
                      {iosDevice ? '查看步骤' : '手动安装'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={dismiss}
                    className="px-3 py-1.5 text-xs text-cloud-500 hover:bg-cloud-100 rounded-lg transition-colors"
                  >
                    {manualMode ? '关闭' : '暂不'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRefresh && (
        <div
          className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-[60] animate-[fade-in-up_0.3s_ease-out]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
        >
          <div className="bg-white/95 backdrop-blur-md border border-sakura-100 rounded-2xl shadow-lg shadow-sakura-100/40 p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl shrink-0">🔄</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-cloud-800 text-sm">应用已更新</p>
                <p className="text-xs text-cloud-500 mt-1">
                  有新版本可用，点击刷新即可体验新功能。
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={refreshApp}
                    disabled={refreshing}
                    className="px-3 py-1.5 text-xs text-white bg-gradient-to-r from-sakura-400 to-sakura-500 rounded-lg disabled:opacity-50"
                  >
                    {refreshing ? '刷新中...' : '立即刷新'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRefresh(false)}
                    className="px-3 py-1.5 text-xs text-cloud-500 hover:bg-cloud-100 rounded-lg transition-colors"
                  >
                    稍后
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function InstallAppGuide() {
  const [standalone, setStandalone] = useState(false)
  const [iosDevice, setIosDevice] = useState(false)
  const [desktopDevice, setDesktopDevice] = useState(false)

  useEffect(() => {
    setStandalone(isStandalone())
    setIosDevice(isIOS())
    setDesktopDevice(isDesktop())
  }, [])

  if (standalone) {
    return (
      <p className="text-sm text-cloud-500">
        已通过主屏幕安装，当前为独立 App 模式 ✓
      </p>
    )
  }

  return (
    <div className="space-y-3 text-sm text-cloud-600">
      {iosDevice ? (
        <>
          <p>📱 在 iPhone / iPad 的 Safari 中：</p>
          <ol className="list-decimal list-inside space-y-1 text-cloud-500">
            <li>点击底部 ↗ 分享按钮</li>
            <li>向下滑动，选择「添加到主屏幕」</li>
            <li>点击「添加」完成安装</li>
          </ol>
          <p className="text-xs text-cloud-400 mt-2">
            💡 提示：必须使用 Safari 浏览器才能添加到主屏幕
          </p>
        </>
      ) : desktopDevice ? (
        <>
          <p>🖥️ 在桌面浏览器中安装：</p>
          <ol className="list-decimal list-inside space-y-1 text-cloud-500">
            <li>Chrome: 点击地址栏右侧 ➕ 图标安装</li>
            <li>Edge: 点击地址栏右侧 📱 图标安装</li>
            <li>或者：菜单 → 更多工具 → 安装应用</li>
          </ol>
        </>
      ) : (
        <>
          <p>📱 在 Android 手机浏览器中：</p>
          <ol className="list-decimal list-inside space-y-1 text-cloud-500">
            <li>打开浏览器菜单（⋮ 或 ···）</li>
            <li>选择「安装应用」或「添加到主屏幕」</li>
            <li>点击「安装」确认</li>
          </ol>
          <p className="text-xs text-cloud-400 mt-2">
            💡 推荐使用 Chrome 浏览器以获得最佳体验
          </p>
        </>
      )}
    </div>
  )
}
