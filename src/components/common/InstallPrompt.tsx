import { useEffect, useState } from 'react'

const DISMISS_KEY = 'couple-web-pwa-install-dismissed'

// Module-level deferredPrompt — captured at import time, before React mounts
let deferredPrompt: BeforeInstallPromptEvent | null = null
let promptCaptured = false

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768
}

// Register listener at module level so it fires even before auth completes
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

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) || !isMobile()) return

    const ios = isIOS()
    setIosDevice(ios)

    if (ios) {
      setVisible(true)
      return
    }

    // Check if the event was captured at module level
    if (deferredPrompt) {
      setVisible(true)
      return
    }

    // Fallback: listen on component mount too (for late-loaded events)
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
    setVisible(false)
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-[60] animate-[fade-in-up_0.3s_ease-out]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <div className="bg-white/95 backdrop-blur-md border border-sakura-100 rounded-2xl shadow-lg shadow-sakura-100/40 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">📲</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-cloud-800 text-sm">安装到主屏幕</p>
            {iosDevice ? (
              <p className="text-xs text-cloud-500 mt-1 leading-relaxed">
                在 Safari 中点击底部分享按钮，选择「添加到主屏幕」，像 App 一样打开。
              </p>
            ) : (
              <p className="text-xs text-cloud-500 mt-1 leading-relaxed">
                安装后可以全屏使用，打开更快，更适合日常记录。
              </p>
            )}
            <div className="flex gap-2 mt-3">
              {!iosDevice && deferredPrompt && (
                <button
                  type="button"
                  onClick={install}
                  className="px-3 py-1.5 text-xs text-white bg-gradient-to-r from-sakura-400 to-sakura-500 rounded-lg"
                >
                  立即安装
                </button>
              )}
              <button
                type="button"
                onClick={dismiss}
                className="px-3 py-1.5 text-xs text-cloud-500 hover:bg-cloud-100 rounded-lg transition-colors"
              >
                暂不
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function InstallAppGuide() {
  const [standalone, setStandalone] = useState(false)
  const [iosDevice, setIosDevice] = useState(false)

  useEffect(() => {
    setStandalone(isStandalone())
    setIosDevice(isIOS())
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
          <p>在 iPhone / iPad 的 Safari 中：</p>
          <ol className="list-decimal list-inside space-y-1 text-cloud-500">
            <li>点击底部分享按钮</li>
            <li>向下滑动，选择「添加到主屏幕」</li>
            <li>点击「添加」</li>
          </ol>
        </>
      ) : (
        <>
          <p>在 Chrome / Edge 手机浏览器中：</p>
          <ol className="list-decimal list-inside space-y-1 text-cloud-500">
            <li>打开浏览器菜单（⋮ 或 ···）</li>
            <li>选择「安装应用」或「添加到主屏幕」</li>
          </ol>
          <p className="text-xs text-cloud-400">
            若首页出现安装提示条，也可以直接点击「立即安装」。
          </p>
        </>
      )}
    </div>
  )
}
