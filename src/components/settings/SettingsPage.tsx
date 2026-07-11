import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Card } from '../common/Card'
import { Avatar } from '../common/Avatar'
import { Modal } from '../common/Modal'
import { InstallAppGuide } from '../common/InstallPrompt'

export function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [moodStatus, setMoodStatus] = useState(profile?.mood_status ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)  // 桌面端拖拽 + 移动端相册
  const cameraInputRef = useRef<HTMLInputElement>(null)  // 移动端拍照（预先存在DOM）

  // Keep local form state in sync when profile is loaded/updated
  useEffect(() => {
    setDisplayName(profile?.display_name ?? '')
    setMoodStatus(profile?.mood_status ?? '')
  }, [profile])

  async function handleAvatarFile(file: File | undefined) {
    if (!file || !user) return
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件')
      return
    }
    // 验证文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB')
      return
    }
    setUploading(true)
    const ext = file.name.split('.').pop()?.toLowerCase() || file.type.split('/')[1] || 'jpg'
    const path = `${user.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage.from('photos').upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/jpeg',
    })
    if (uploadError) {
      console.error('Avatar upload failed:', uploadError)
      alert(`头像上传失败: ${uploadError.message}`)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update failed:', updateError)
      alert(`头像保存失败: ${updateError.message}`)
      setUploading(false)
      return
    }

    await refreshProfile(user.id)
    setUploading(false)
    setShowAvatarPicker(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setSaved(false)

    await supabase
      .from('profiles')
      .update({ display_name: displayName, mood_status: moodStatus, updated_at: new Date().toISOString() })
      .eq('id', profile.id)

    // refresh profile in context so other pages reflect changes immediately
    if (profile?.id) {
      try {
        await refreshProfile(profile.id)
      } catch (e) {
        console.error('Failed to refresh profile after save:', e)
      }
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-cloud-800" style={{ fontFamily: "'Quicksand', sans-serif" }}>设置 ⚙️</h1>

      <Card>
        <h2 className="text-lg font-semibold text-cloud-800 mb-4" style={{ fontFamily: "'Quicksand', sans-serif" }}>个人资料</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <Avatar url={profile?.avatar_url} name={displayName || '我'} size="xl" />
            <div>
              <button
                type="button"
                className="text-sm text-sakura-500 hover:text-sakura-600 transition-colors"
                onClick={() => setShowAvatarPicker(true)}
                disabled={uploading}
              >
                {uploading ? '上传中...' : '更换头像'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAvatarFile(e.target.files?.[0])}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-cloud-700 mb-1">昵称</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-cloud-700 mb-1">心情状态</label>
            <input
              value={moodStatus}
              onChange={(e) => setMoodStatus(e.target.value)}
              placeholder="例如：想你了 💕"
              className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 disabled:bg-cloud-300 rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-sakura-200/40"
          >
            {saving ? '保存中...' : saved ? '已保存 ✓' : '保存'}
          </button>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-cloud-800 mb-4" style={{ fontFamily: "'Quicksand', sans-serif" }}>安装到手机</h2>
        <InstallAppGuide />
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-cloud-800 mb-4" style={{ fontFamily: "'Quicksand', sans-serif" }}>账户</h2>
        <button
          onClick={signOut}
          className="w-full py-2.5 text-sm text-red-500 border border-red-200 hover:bg-red-50 rounded-xl transition-colors"
        >
          退出登录
        </button>
      </Card>

      {/* Avatar picker modal */}
      <Modal isOpen={showAvatarPicker} onClose={() => setShowAvatarPicker(false)} title="更换头像">
        {/* 移动端：拍照 / 相册 */}
        <div className="flex gap-3 mb-4">
          <button
            type="button"
            disabled={uploading}
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl bg-gradient-to-br from-sakura-400 to-sakura-500 text-white shadow-sm hover:shadow-md transition-all disabled:opacity-50"
          >
            <span className="text-2xl">📷</span>
            <span className="text-sm font-medium">拍照</span>
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 border-cloud-200 hover:border-sakura-300 hover:bg-sakura-50/30 transition-all disabled:opacity-50"
          >
            <span className="text-2xl">🖼️</span>
            <span className="text-sm font-medium text-cloud-600">从相册选择</span>
          </button>
        </div>

        {/* 桌面端：拖拽区域 */}
        <div
          className="hidden md:block border-2 border-dashed border-cloud-200 rounded-2xl p-8 text-center hover:border-sakura-300 hover:bg-sakura-50/30 transition-all cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleAvatarFile(e.dataTransfer.files[0]) }}
        >
          <div className="text-4xl mb-3 animate-[float-gentle_2s-ease-in-out_infinite]">👤</div>
          <p className="text-cloud-600 mb-2">{uploading ? '上传中...' : '点击或拖拽选择头像图片'}</p>
          <p className="text-xs text-cloud-400">支持 JPG, PNG, WebP（不超过 5MB）</p>
        </div>

        {uploading && (
          <p className="mt-3 text-sm text-sakura-500 text-center">上传中...</p>
        )}

        {/* 移动端拍照专用 input（预先存在DOM以兼容PWA） */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={(e) => handleAvatarFile(e.target.files?.[0])}
          className="md:hidden"
          style={{ display: 'none' }}
        />
      </Modal>
    </div>
  )
}
