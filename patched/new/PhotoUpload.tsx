import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Wrapper, Status } from '@googlemaps/react-wrapper'
import * as exifr from 'exifr'
import { apiUrl } from '../lib/api'
import { Upload } from 'lucide-react'

interface PhotoUploadProps {
  onClose: () => void
  onUploaded?: () => void
}

const PickerMap: React.FC<{ value: { lat: number, lng: number } | null, onChange: (lat: number, lng: number) => void }>
  = ({ value, onChange }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map>()
  const [marker, setMarker] = useState<google.maps.Marker>()

  useEffect(() => {
    if (ref.current && !map) {
      const center = value || { lat: 18.7883, lng: 98.9853 }
      const m = new google.maps.Map(ref.current, {
        center,
        zoom: value ? 16 : 13,
        mapTypeId: 'roadmap'
      })
      setMap(m)
    }
  }, [ref, map])

  useEffect(() => {
    if (!map) return
    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return
      const lat = e.latLng.lat()
      const lng = e.latLng.lng()
      onChange(lat, lng)
    })
    return () => { listener && listener.remove() }
  }, [map, onChange])

  useEffect(() => {
    if (!map) return
    if (!value) {
      if (marker) marker.setMap(null)
      setMarker(undefined)
      return
    }
    if (!marker) {
      const mk = new google.maps.Marker({ position: value, map })
      setMarker(mk)
      map.setCenter(value)
      map.setZoom(16)
      return
    }
    marker.setPosition(value)
    map.setCenter(value)
  }, [map, value])

  return <div ref={ref} style={{ width: '100%', height: 280 }} />
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ onClose, onUploaded }) => {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null)
  const [parsing, setParsing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const readBlobAsDataUrl = useCallback((blob: Blob) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  }, [])

  // No HEIC conversion retained

  const onFileChange = useCallback(async (f: File | null) => {
    setError(null)
    setFile(f)
    setCoords(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (!f) return
    // Reject HEIC/HEIF formats
    if (f.type === 'image/heic' || f.type === 'image/heif' || /\.heic$/i.test(f.name) || /\.heif$/i.test(f.name)) {
      setError('HEIC/HEIF is not supported. Please upload JPG, PNG, WebP, or GIF.')
      setFile(null)
      return
    }
    try {
      setParsing(true)
      const gps = await exifr.gps(f)
      if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
        setCoords({ lat: gps.latitude, lng: gps.longitude })
      }
      // Prepare preview; convert HEIC/HEIF to JPEG for browser preview
      {
        // Use data URL to maximize preview compatibility
        const dataUrl = await readBlobAsDataUrl(f)
        setPreviewUrl(dataUrl)
        setError(null)
      }
    } catch {
      // ignore
    } finally {
      setParsing(false)
    }
  }, [previewUrl, readBlobAsDataUrl])

  const canUpload = useMemo(() => !!file && !!coords && !uploading, [file, coords, uploading])

  const handleUpload = useCallback(async () => {
    if (!file || !coords) return
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('lat', String(coords.lat))
      form.append('lng', String(coords.lng))
      // For HEIC, convert to JPEG before uploading to ensure it displays everywhere
      let uploadFile: File = file
      // HEIC/HEIF not supported: do not attempt conversion, block upload
      if (file.type === 'image/heic' || file.type === 'image/heif' || /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name)) {
        setError('HEIC/HEIF is not supported. Please upload JPG, PNG, WebP, or GIF.')
        setUploading(false)
        return
      }
      form.append('file', uploadFile)
      const res = await fetch(apiUrl('/api/photos/upload'), { method: 'POST', body: form })
      if (!res.ok) throw new Error('Upload failed')
      onUploaded && onUploaded()
      onClose()
    } catch (e) {
      setError('Failed to upload. Please try again.')
    } finally {
      setUploading(false)
    }
  }, [file, coords, onUploaded, onClose])

  const render = (status: Status) => {
    if (status === Status.LOADING) return <div className="h-72 flex items-center justify-center text-sm text-gray-600">Loading map…</div>
    if (status === Status.FAILURE) return <div className="h-72 flex items-center justify-center text-sm text-red-600">Failed to load map</div>
    return <div></div>
  }

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  return (
    <div className="w-full max-w-xl">
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">Select image</label>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => onFileChange(e.target.files?.[0] || null)} />
        {parsing && <div className="text-xs text-gray-500 mt-1">Reading GPS from photo…</div>}
      </div>
      {previewUrl && (
        <div className="mb-3">
          <img
            src={previewUrl}
            alt="preview"
            className="max-h-48 rounded"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement
              target.style.display = 'none'
              setError('Preview not supported for this image. It will still upload correctly.')
            }}
          />
        </div>
      )}
      <div className="mb-2 text-xs text-gray-600 dark:text-gray-300">Pick location (auto-filled from photo if available)</div>
      <div className="rounded border border-gray-200 dark:border-gray-700 overflow-hidden mb-3">
        <Wrapper apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''} render={render}>
          <PickerMap value={coords} onChange={(lat, lng) => setCoords({ lat, lng })} />
        </Wrapper>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-600 dark:text-gray-300">
          {coords ? (
            <span>Selected: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
          ) : (
            <span>No location selected</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={onClose} className="px-3 py-1 text-sm rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">Cancel</button>
          <button onClick={handleUpload} disabled={!canUpload} className={`px-3 py-1 text-sm rounded-md flex items-center space-x-1 ${canUpload ? 'bg-blue-600 text-white' : 'bg-blue-200 text-white'}`}>
            <Upload className="h-4 w-4" />
            <span>{uploading ? 'Uploading…' : 'Upload'}</span>
          </button>
        </div>
      </div>
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      <div className="mt-2 text-xs text-gray-500">Photos expire after 8 hours.</div>
    </div>
  )
}

export default PhotoUpload


