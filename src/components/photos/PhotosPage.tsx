import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card } from '../common/Card'
import { Modal } from '../common/Modal'
import { type Photo, type Album } from '../../types/database'

const MAX_FILE_SIZE = 10 * 1024 * 1024

export function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [showAlbumModal, setShowAlbumModal] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null)
  const [albumPhotos, setAlbumPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)

  // Multi-select mode (main page)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showAlbumPicker, setShowAlbumPicker] = useState(false)

  // Multi-select mode (album detail)
  const [albumSelectMode, setAlbumSelectMode] = useState(false)
  const [albumSelectedIds, setAlbumSelectedIds] = useState<Set<string>>(new Set())

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
      if (albumsRes.data) {
        setAlbums(albumsRes.data.map(album => {
          const coverPhoto = photosRes.data?.find(p => p.album_id === album.id)
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

  // ---------- multi-select ----------
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function batchAddToAlbum(albumId: string) {
    for (const id of selectedIds) {
      await supabase.from('photos').update({ album_id: albumId }).eq('id', id)
    }
    setSelectedIds(new Set())
    setSelectMode(false)
    setShowAlbumPicker(false)
    loadData()
  }

  async function batchDeletePhotos() {
    if (!confirm(`确定删除选中的 ${selectedIds.size} 张照片吗？`)) return
    const selected = photos.filter(p => selectedIds.has(p.id))
    for (const photo of selected) {
      await supabase.storage.from('photos').remove([photo.storage_path])
      await supabase.from('photos').delete().eq('id', photo.id)
    }
    setSelectedIds(new Set())
    setSelectMode(false)
    loadData()
  }

  async function removeFromAlbum(photo: Photo) {
    await supabase.from('photos').update({ album_id: null }).eq('id', photo.id)
    if (selectedAlbum) openAlbum(selectedAlbum)
    loadData()
  }

  async function batchRemoveFromAlbum() {
    if (!confirm(`确定从相册移除选中的 ${albumSelectedIds.size} 张照片吗？`)) return
    for (const id of albumSelectedIds) {
      await supabase.from('photos').update({ album_id: null }).eq('id', id)
    }
    setAlbumSelectedIds(new Set())
    setAlbumSelectMode(false)
    if (selectedAlbum) openAlbum(selectedAlbum)
    loadData()
  }

  // ---------- album detail view ----------
  if (selectedAlbum) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelectedAlbum(null); setAlbumPhotos([]); setAlbumSelectMode(false); setAlbumSelectedIds(new Set()) }}
              className="text-cloud-500 hover:text-sakura-500 text-lg transition-colors"
            >
              ← 返回
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-cloud-800" style={{ fontFamily: "'Quicksand', sans-serif" }}>{selectedAlbum.title}</h1>
          </div>
          <div className="flex gap-2">
            <PickerModal
              isOpen={showPicker}
              onClose={() => setShowPicker(false)}
              albumId={selectedAlbum.id}
              onAdded={() => { openAlbum(selectedAlbum); setShowPicker(false) }}
              allPhotos={photos}
              albumPhotoIds={new Set(albumPhotos.map(p => p.id))}
            />
            {albumSelectMode ? (
              <>
                <button
                  onClick={() => { setAlbumSelectMode(false); setAlbumSelectedIds(new Set()) }}
                  className="px-4 py-2 text-sm text-cloud-600 bg-cloud-100 hover:bg-cloud-200 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={batchRemoveFromAlbum}
                  disabled={albumSelectedIds.size === 0}
                  className="px-4 py-2 text-sm text-white bg-sakura-400 hover:bg-sakura-500 disabled:opacity-50 rounded-xl transition-all"
                >
                  移除 ({albumSelectedIds.size})
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`确定删除选中的 ${albumSelectedIds.size} 张照片吗？`)) return
                    for (const id of albumSelectedIds) {
                      const photo = albumPhotos.find(p => p.id === id)
                      if (photo) {
                        await supabase.storage.from('photos').remove([photo.storage_path])
                        await supabase.from('photos').delete().eq('id', id)
                      }
                    }
                    setAlbumSelectedIds(new Set())
                    setAlbumSelectMode(false)
                    if (selectedAlbum) openAlbum(selectedAlbum)
                    loadData()
                  }}
                  disabled={albumSelectedIds.size === 0}
                  className="px-4 py-2 text-sm text-white bg-red-400 hover:bg-red-500 disabled:opacity-50 rounded-xl transition-all"
                >
                  删除 ({albumSelectedIds.size})
                </button>
              </>
            ) : (
              <>
                <UploadModal
                  isOpen={showUpload}
                  onClose={() => setShowUpload(false)}
                  onUploaded={() => { openAlbum(selectedAlbum); setShowUpload(false) }}
                  albumId={selectedAlbum.id}
                />
                <button
                  onClick={() => setShowPicker(true)}
                  className="px-4 py-2 text-sm text-sakura-600 bg-sakura-50 hover:bg-sakura-100 rounded-xl transition-colors"
                >
                  选择照片
                </button>
                <button
                  onClick={() => setShowUpload(true)}
                  className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-sakura-200/40"
                >
                  上传照片
                </button>
                <button
                  onClick={() => setAlbumSelectMode(true)}
                  className="px-4 py-2 text-sm text-sakura-600 bg-sakura-50 hover:bg-sakura-100 rounded-xl transition-colors"
                >
                  管理
                </button>
                <button
                  onClick={() => deleteAlbum(selectedAlbum)}
                  className="text-sm text-cloud-300 hover:text-red-400 transition-colors"
                >
                  删除相册
                </button>
              </>
            )}
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
              <p className="text-cloud-400 text-sm">上传照片或从已有照片中选择</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {albumPhotos.map((photo) => {
              const checked = albumSelectedIds.has(photo.id)
              return (
                <div key={photo.id} className="relative group">
                  <Card onClick={() => albumSelectMode ? (
                    setAlbumSelectedIds(prev => {
                      const next = new Set(prev)
                      if (next.has(photo.id)) next.delete(photo.id)
                      else next.add(photo.id)
                      return next
                    })
                  ) : setSelectedPhoto(photo)} className="p-0 overflow-hidden cursor-pointer">
                    {albumSelectMode && (
                      <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all z-10 ${checked ? 'bg-sakura-500 shadow-sm' : 'bg-white/70 border-2 border-cloud-200'}`}>
                        {checked ? '✓' : ''}
                      </div>
                    )}
                    <img src={photo.url} alt={photo.caption ?? ''} className="w-full h-40 object-cover" />
                    {photo.caption && <p className="p-2 text-sm text-cloud-600 truncate">{photo.caption}</p>}
                  </Card>
                </div>
              )
            })}
          </div>
        )}

        <Modal isOpen={!!selectedPhoto} onClose={() => setSelectedPhoto(null)}>
          {selectedPhoto && (
            <div>
              <img src={selectedPhoto.url} alt={selectedPhoto.caption ?? ''} className="w-full rounded-xl" />
              {selectedPhoto.caption && <p className="mt-3 text-center text-cloud-600">{selectedPhoto.caption}</p>}
              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => { removeFromAlbum(selectedPhoto); setSelectedPhoto(null) }}
                  className="text-sm text-cloud-300 hover:text-sakura-500 transition-colors"
                >
                  从相册移除
                </button>
                <button
                  onClick={() => { deletePhoto(selectedPhoto); setSelectedPhoto(null) }}
                  className="text-sm text-red-400 hover:text-red-500 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    )
  }

  // ---------- main page ----------
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl md:text-2xl font-bold text-cloud-800" style={{ fontFamily: "'Quicksand', sans-serif" }}>照片 📷</h1>
        <div className="flex gap-2">
          {selectMode ? (
            <>
              <button
                onClick={() => { setSelectMode(false); setSelectedIds(new Set()) }}
                className="px-4 py-2 text-sm text-cloud-600 bg-cloud-100 hover:bg-cloud-200 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => setShowAlbumPicker(true)}
                disabled={selectedIds.size === 0}
                className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 disabled:opacity-50 rounded-xl transition-all"
              >
                添加到相册 ({selectedIds.size})
              </button>
              <button
                onClick={batchDeletePhotos}
                disabled={selectedIds.size === 0}
                className="px-4 py-2 text-sm text-white bg-red-400 hover:bg-red-500 disabled:opacity-50 rounded-xl transition-all"
              >
                删除 ({selectedIds.size})
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setSelectMode(true)}
                className="px-4 py-2 text-sm text-sakura-600 bg-sakura-50 hover:bg-sakura-100 rounded-xl transition-colors"
              >
                选择
              </button>
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
            </>
          )}
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
                    <Card onClick={() => openAlbum(album)} className="cursor-pointer">
                      {(album as any).cover_photo_url ? (
                        <div className="-m-5 mb-3">
                          <img src={(album as any).cover_photo_url} alt="" className="w-full h-32 object-cover rounded-t-2xl" />
                        </div>
                      ) : (
                        <div className="-m-5 mb-3 h-32 bg-gradient-to-br from-sakura-200 via-peach-100 to-lilac-100 flex items-center justify-center rounded-t-2xl">
                          <span className="text-2xl opacity-60">💕</span>
                        </div>
                      )}
                      <h3 className="font-medium text-cloud-800 text-sm">{album.title}</h3>
                      {album.description && <p className="text-xs text-cloud-400 truncate mt-0.5">{album.description}</p>}
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}

          {photos.length === 0 && !selectMode ? (
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
              <h2 className="text-lg font-semibold text-cloud-700 mb-3">
                {selectMode ? `选择照片 (已选 ${selectedIds.size})` : '所有照片'}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {photos.map((photo) => {
                  const checked = selectedIds.has(photo.id)
                  return (
                    <div key={photo.id} className="relative group cursor-pointer">
                      <div onClick={() => selectMode ? toggleSelect(photo.id) : setSelectedPhoto(photo)}>
                        <Card className={`p-0 overflow-hidden transition-all ${selectMode ? (checked ? 'ring-2 ring-sakura-500' : 'ring-1 ring-transparent') : ''}`}>
                          <img src={photo.url} alt={photo.caption ?? ''} className="w-full h-40 object-cover" />
                          {photo.caption && <p className="p-2 text-sm text-cloud-600 truncate">{photo.caption}</p>}
                          {selectMode && (
                            <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all ${checked ? 'bg-sakura-500 shadow-sm' : 'bg-white/70 text-cloud-400'}`}>
                              {checked ? '✓' : ''}
                            </div>
                          )}
                        </Card>
                      </div>
                      
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      <UploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} onUploaded={loadData} albumId={null} />

      <Modal isOpen={showAlbumModal} onClose={() => setShowAlbumModal(false)} title="新建相册">
        <AlbumForm onClose={() => setShowAlbumModal(false)} onCreated={() => { setShowAlbumModal(false); loadData() }} />
      </Modal>

      {/* Album picker for batch-add */}
      <Modal isOpen={showAlbumPicker} onClose={() => setShowAlbumPicker(false)} title="选择目标相册">
        {albums.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-cloud-400 mb-3">还没有相册，先创建一个</p>
            <button
              onClick={() => { setShowAlbumPicker(false); setShowAlbumModal(true) }}
              className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 rounded-xl"
            >
              新建相册
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {albums.map(album => (
              <div
                key={album.id}
                onClick={() => batchAddToAlbum(album.id)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-sakura-50 cursor-pointer transition-colors border border-transparent hover:border-sakura-100"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-sakura-200 via-peach-100 to-lilac-100 flex items-center justify-center shrink-0">
                  <span className="text-lg">💕</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cloud-800">{album.title}</p>
                  {album.description && <p className="text-xs text-cloud-400 truncate">{album.description}</p>}
                </div>
                <span className="text-cloud-300 text-lg">→</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal isOpen={!!selectedPhoto} onClose={() => setSelectedPhoto(null)}>
        {selectedPhoto && (
          <div>
            <img src={selectedPhoto.url} alt={selectedPhoto.caption ?? ''} className="w-full rounded-xl" />
            {selectedPhoto.caption && <p className="mt-3 text-center text-cloud-600">{selectedPhoto.caption}</p>}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => { deletePhoto(selectedPhoto); setSelectedPhoto(null) }}
                className="text-sm text-red-400 hover:text-red-500 transition-colors"
              >
                删除
              </button>
            </div>
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
  const [error, setError] = useState('')

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length || !user) return
    setError('')

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`文件 "${file.name}" 超过 10MB 限制`)
        return
      }
    }

    setUploading(true)
    setProgress(0)

    const total = files.length
    let successCount = 0

    for (let i = 0; i < total; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(path, file)

      if (uploadError) {
        setError(`上传失败: ${uploadError.message}`)
        continue
      }

      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)

      const { error: insertError } = await supabase.from('photos').insert({
        user_id: user.id,
        album_id: albumId || null,
        storage_path: path,
        url: urlData.publicUrl,
        caption: file.name.replace(/\.[^.]+$/, ''),
      })

      if (insertError) {
        setError(`保存失败: ${insertError.message}`)
        continue
      }

      successCount++
      setProgress(((i + 1) / total) * 100)
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (successCount > 0) {
      onUploaded()
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="上传照片">
      <label
        className="block border-2 border-dashed border-cloud-200 rounded-2xl p-8 text-center hover:border-sakura-300 hover:bg-sakura-50/30 transition-all cursor-pointer relative overflow-hidden"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
      >
        <div className="text-4xl mb-3 animate-[float-gentle_2s-ease-in-out_infinite]">📤</div>
        <p className="text-cloud-600 mb-2">{uploading ? '上传中...' : '点击选择照片'}</p>
        <p className="text-xs text-cloud-400">支持 JPG, PNG, WebP（单张不超过 10MB）</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ fontSize: '100px' }}
        />
      </label>
      {error && (
        <p className="mt-3 text-xs text-red-500 text-center bg-red-50 p-2 rounded-lg">{error}</p>
      )}
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

function PickerModal({ isOpen, onClose, albumId, onAdded, allPhotos, albumPhotoIds }: {
  isOpen: boolean
  onClose: () => void
  albumId: string
  onAdded: () => void
  allPhotos: Photo[]
  albumPhotoIds: Set<string>
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSelected(new Set())
  }, [isOpen])

  const available = allPhotos.filter(p => !albumPhotoIds.has(p.id))

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function addSelected() {
    if (selected.size === 0) return
    setSaving(true)
    for (const id of selected) {
      await supabase.from('photos').update({ album_id: albumId }).eq('id', id)
    }
    setSaving(false)
    onAdded()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="从已有照片选择">
      {available.length === 0 ? (
        <div className="text-center py-8 text-cloud-400">
          <p>所有照片已在该相册中</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
            {available.map(photo => {
              const isSelected = selected.has(photo.id)
              return (
                <div
                  key={photo.id}
                  onClick={() => toggle(photo.id)}
                  className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                    isSelected ? 'border-sakura-500 shadow-md shadow-sakura-200/50' : 'border-transparent'
                  }`}
                >
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  {isSelected && (
                    <div className="absolute inset-0 bg-sakura-500/20 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold drop-shadow-md">✓</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-cloud-600 hover:bg-cloud-100 rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={addSelected}
              disabled={selected.size === 0 || saving}
              className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 disabled:opacity-50 rounded-xl transition-all"
            >
              {saving ? '添加中...' : `添加 ${selected.size} 张`}
            </button>
          </div>
        </>
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
