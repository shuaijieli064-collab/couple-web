import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card } from '../common/Card'
import { EmptyState } from '../common/EmptyState'
import { Modal } from '../common/Modal'
import { type Photo, type Album } from '../../types/database'

export function PhotosPage() {
  const { user } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [showAlbumModal, setShowAlbumModal] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null)
  const [albumPhotos, setAlbumPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [photosRes, albumsRes] = await Promise.all([
        supabase.from('photos').select('*').order('created_at', { ascending: false }),
        supabase.from('albums').select('*').order('created_at', { ascending: false }),
      ])
      if (photosRes.data) setPhotos(photosRes.data as Photo[])
      if (albumsRes.data) setAlbums(albumsRes.data as Album[])
      if (photosRes.data && albumsRes.data) {
        setAlbums(albumsRes.data.map(album => {
          const coverPhoto = photosRes.data.find(p => p.album_id === album.id)
          return { ...album, cover_photo_url: coverPhoto?.url ?? null }
        }) as Album[])
      }
    } catch (err) {
      console.error('Failed to load photos:', err)
    } finally {
      setLoading(false)
    }
  }

  async function openAlbum(album: Album) {
    setSelectedAlbum(album)
    const { data } = await supabase
      .from('photos')
      .select('*')
      .eq('album_id', album.id)
      .order('created_at', { ascending: false })
    if (data) setAlbumPhotos(data as Photo[])
  }

  async function deleteAlbum(album: Album) {
    if (!confirm(`确定删除相册「${album.title}」吗？`)) return
    await supabase.from('albums').delete().eq('id', album.id)
    loadData()
    if (selectedAlbum?.id === album.id) {
      setSelectedAlbum(null)
      setAlbumPhotos([])
    }
  }

  async function deletePhoto(photo: Photo) {
    if (!confirm('确定删除这张照片吗？')) return
    await supabase.storage.from('photos').remove([photo.storage_path])
    await supabase.from('photos').delete().eq('id', photo.id)
    loadData()
    if (selectedAlbum) openAlbum(selectedAlbum)
  }

  // Album detail view
  if (selectedAlbum) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelectedAlbum(null); setAlbumPhotos([]) }}
              className="text-cloud-500 hover:text-sakura-500 text-lg transition-colors"
            >
              ← 返回
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-cloud-800" style={{ fontFamily: "'Quicksand', sans-serif" }}>{selectedAlbum.title}</h1>
          </div>
          <div className="flex gap-2">
            <UploadModal
              isOpen={showUpload}
              onClose={() => setShowUpload(false)}
              onUploaded={() => { openAlbum(selectedAlbum); setShowUpload(false) }}
              albumId={selectedAlbum.id}
            />
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-sakura-200/40"
            >
              上传照片
            </button>
            <button
              onClick={() => deleteAlbum(selectedAlbum)}
              className="px-4 py-2 text-sm text-red-500 border border-red-200 hover:bg-red-50 rounded-xl transition-colors"
            >
              删除相册
            </button>
          </div>
        </div>

        {albumPhotos.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex justify-center gap-4 mb-6">
              <span className="text-5xl animate-bounce">📷</span>
              <span className="text-5xl animate-bounce" style={{ animationDelay: '0.2s' }}>💕</span>
              <span className="text-5xl animate-bounce" style={{ animationDelay: '0.4s' }}>🌸</span>
            </div>
            <div className="max-w-xs mx-auto p-6 bg-gradient-to-br from-sakura-100 via-peach-50 to-lilac-50 rounded-2xl shadow-inner">
              <p className="text-cloud-600 text-lg font-medium mb-1">相册是空的</p>
              <p className="text-cloud-400 text-sm">上传一些照片到这个相册吧</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {albumPhotos.map((photo) => (
              <div key={photo.id} className="relative group">
                <Card onClick={() => setSelectedPhoto(photo)} className="p-0 overflow-hidden">
                  <img src={photo.url} alt={photo.caption ?? ''} className="w-full h-40 object-cover" />
                  {photo.caption && <p className="p-2 text-sm text-cloud-600 truncate">{photo.caption}</p>}
                </Card>
                <button
                  onClick={() => deletePhoto(photo)}
                  className="absolute top-2 right-2 bg-sakura-500 text-white w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm shadow-sm"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <Modal isOpen={!!selectedPhoto} onClose={() => setSelectedPhoto(null)}>
          {selectedPhoto && (
            <div>
              <img src={selectedPhoto.url} alt={selectedPhoto.caption ?? ''} className="w-full rounded-xl" />
              {selectedPhoto.caption && <p className="mt-3 text-center text-cloud-600">{selectedPhoto.caption}</p>}
            </div>
          )}
        </Modal>
      </div>
    )
  }

  // Main photos page
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl md:text-2xl font-bold text-cloud-800" style={{ fontFamily: "'Quicksand', sans-serif" }}>照片 📷</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAlbumModal(true)}
            className="px-4 py-2 text-sm text-sakura-600 bg-sakura-50 hover:bg-sakura-100 rounded-xl transition-colors"
          >
            新建相册
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-sakura-200/40"
          >
            上传照片
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-cloud-400">加载中...</div>
      ) : (
        <>
          {albums.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-cloud-700 mb-3">相册</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {albums.map((album) => (
                  <div key={album.id} className="relative group">
                    <Card onClick={() => openAlbum(album)}>
                        {loading ? (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-2xl animate-spin">⏳</span>
                      </div>
                    ) : (
                    (album as any).cover_photo_url ? (
                      <img src={(album as any).cover_photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-sakura-200 via-peach-100 to-lilac-100 flex flex-col items-center justify-center gap-1">
                        <span className="text-2xl opacity-60">💕</span>
                        <span className="text-xs text-cloud-400">等待上传</span>
                      </div>
                    )
                    )}
                      <h3 className="font-medium text-cloud-800 text-sm truncate">{album.title}</h3>
                      {album.description && <p className="text-xs text-cloud-400 truncate">{album.description}</p>}
                    </Card>
                    <button
                      onClick={() => deleteAlbum(album)}
                      className="absolute top-2 right-2 bg-sakura-500 text-white w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm shadow-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {photos.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex justify-center gap-4 mb-6">
                <span className="text-5xl animate-bounce">📸</span>
                <span className="text-5xl animate-bounce" style={{ animationDelay: '0.15s' }}>💝</span>
                <span className="text-5xl animate-bounce" style={{ animationDelay: '0.3s' }}>🌸</span>
              </div>
              <div className="max-w-xs mx-auto p-6 bg-gradient-to-br from-sakura-100 via-peach-50 to-lilac-50 rounded-2xl shadow-inner">
                <p className="text-cloud-600 text-lg font-medium mb-1">还没有照片</p>
                <p className="text-cloud-400 text-sm">上传第一张属于你们的照片吧</p>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-semibold text-cloud-700 mb-3">所有照片</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <Card onClick={() => setSelectedPhoto(photo)} className="p-0 overflow-hidden">
                      <img src={photo.url} alt={photo.caption ?? ''} className="w-full h-40 object-cover" />
                      {photo.caption && <p className="p-2 text-sm text-cloud-600 truncate">{photo.caption}</p>}
                    </Card>
                    <button
                      onClick={() => deletePhoto(photo)}
                      className="absolute top-2 right-2 bg-sakura-500 text-white w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm shadow-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <UploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} onUploaded={loadData} />

      <Modal isOpen={showAlbumModal} onClose={() => setShowAlbumModal(false)} title="新建相册">
        <AlbumForm onClose={() => setShowAlbumModal(false)} onCreated={() => { setShowAlbumModal(false); loadData() }} />
      </Modal>

      <Modal isOpen={!!selectedPhoto} onClose={() => setSelectedPhoto(null)}>
        {selectedPhoto && (
          <div>
            <img src={selectedPhoto.url} alt={selectedPhoto.caption ?? ''} className="w-full rounded-xl" />
            {selectedPhoto.caption && <p className="mt-3 text-center text-cloud-600">{selectedPhoto.caption}</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}

function UploadModal({ isOpen, onClose, onUploaded, albumId }: { isOpen: boolean; onClose: () => void; onUploaded: () => void; albumId?: string | null }) {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length || !user) return
    setUploading(true)
    setProgress(0)

    const total = files.length
    for (let i = 0; i < total; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(path, file)

      if (uploadError) {
        console.error('Upload failed:', uploadError)
        continue
      }

      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)

      await supabase.from('photos').insert({
        user_id: user.id,
        album_id: albumId || null,
        storage_path: path,
        url: urlData.publicUrl,
        caption: file.name.replace(/\.[^.]+$/, ''),
      })

      setProgress(((i + 1) / total) * 100)
    }

    setUploading(false)
    onUploaded()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="上传照片">
      <div
        className="border-2 border-dashed border-cloud-200 rounded-2xl p-8 text-center hover:border-sakura-300 hover:bg-sakura-50/30 transition-all cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
      >
        <div className="text-4xl mb-3 animate-[float-gentle_2s_ease-in-out_infinite]">📤</div>
        <p className="text-cloud-600 mb-2">拖拽照片到这里，或点击选择</p>
        <p className="text-xs text-cloud-400">支持 JPG, PNG, WebP</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {uploading && (
        <div className="mt-4">
          <div className="h-2 bg-cloud-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-sakura-400 to-sakura-500 transition-all rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-cloud-400 mt-2 text-center">上传中... {Math.round(progress)}%</p>
        </div>
      )}
    </Modal>
  )
}

function AlbumForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !title) return
    setSubmitting(true)
    setError('')
    const { error } = await supabase.from('albums').insert({ user_id: user.id, title, description: description || null }).select()
    if (error) {
      console.error('Album create error:', error)
      setError(error.message)
      setSubmitting(false)
    } else {
      setSubmitting(false)
      onCreated()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-cloud-700 mb-1">相册名称</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：旅行回忆"
          required
          className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-cloud-700 mb-1">描述（可选）</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="写点什么..."
          rows={3}
          className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none resize-none"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-cloud-600 hover:bg-cloud-100 rounded-xl transition-colors">取消</button>
        <button type="submit" disabled={submitting || !title} className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 disabled:bg-cloud-300 rounded-xl transition-all">
          {submitting ? '创建中...' : '创建'}
        </button>
      </div>
      {error && (
        <div className="mt-2 p-2 bg-sakura-50 text-sakura-700 rounded-lg text-xs border border-sakura-100">{error}</div>
      )}
    </form>
  )
}
