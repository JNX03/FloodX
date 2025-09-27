import React from 'react'
import { apiUrl } from '../lib/api'
import { Camera } from 'lucide-react'

export interface TimelinePhoto {
  id: string
  lat: number
  lng: number
  createdAt: number
  expiresAt: number
}

interface PhotoTimelineProps {
  photos: TimelinePhoto[]
  className?: string
  onUploadClick?: () => void
}

const PhotoTimeline: React.FC<PhotoTimelineProps> = ({ photos, className = '', onUploadClick }) => {
  const sorted = [...photos].sort((a, b) => b.createdAt - a.createdAt)

  if (!sorted.length) {
    return (
      <div className={`h-96 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <Camera className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
          <div className="text-gray-600 dark:text-gray-300 mb-3">No photos yet</div>
          {onUploadClick && (
            <button
              onClick={onUploadClick}
              className="inline-flex items-center px-3 py-1.5 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700"
            >
              Share a photo
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`h-96 overflow-y-auto p-4 ${className}`}>
      <ul className="space-y-4">
        {sorted.map((p) => (
          <li key={p.id} className="flex items-start space-x-3">
            <div className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
              <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {new Date(p.createdAt).toLocaleString()} · {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
              </div>
              <img
                src={apiUrl(`/api/photos/image/${p.id}`)}
                className="w-full max-h-80 object-contain rounded border border-gray-200 dark:border-gray-700"
                alt={`Photo at ${p.lat},${p.lng}`}
              />
              <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                Expires in ~{Math.max(0, Math.round((p.expiresAt - Date.now()) / (60 * 60 * 1000)))}h
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default PhotoTimeline


