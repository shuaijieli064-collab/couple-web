import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

export function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true)
      },
    })
    setUpdateSW(() => update)
  }, [])

  if (!needRefresh) return null

  async function doUpdate() {
    try {
      if (updateSW) {
        await updateSW(true)
        // ensure the new service worker takes control
        window.location.reload()
      }
    } catch (e) {
      console.error('Failed to apply update:', e)
      window.location.reload()
    }
  }

  return (
    <div
      className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-[70] animate-[fade-in-up_0.3s_ease-out]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <div className="bg-white/95 backdrop-blur-md border border-sakura-100 rounded-2xl shadow-lg shadow-sakura-100/40 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">🔄</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-cloud-800 text-sm">发现新版本</p>
            <p className="text-xs text-cloud-500 mt-1">为了获取最新功能，请更新并重载页面。</p>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={doUpdate}
                className="px-3 py-1.5 text-xs text-white bg-gradient-to-r from-sakura-400 to-sakura-500 rounded-lg"
              >
                立即更新
              </button>
              <button
                type="button"
                onClick={() => setNeedRefresh(false)}
                className="px-3 py-1.5 text-xs text-cloud-500 hover:bg-cloud-100 rounded-lg transition-colors"
              >
                稍后
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
