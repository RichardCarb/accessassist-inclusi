import React, { useRef, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VideoCamera, CheckCircle, X } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface CameraTestProps {
  onClose: () => void
}

export function CameraTest({ onClose }: CameraTestProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    testCameraAccess()
  }, []) // Only run once on mount

  // Separate effect for cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const testCameraAccess = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      console.log('Testing camera access...')
      console.log('Navigator.mediaDevices:', !!navigator.mediaDevices)
      console.log('getUserMedia:', !!navigator.mediaDevices?.getUserMedia)
      console.log('Location:', location.protocol, location.hostname)

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser')
      }

      const testStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      })

      console.log('Stream obtained:', testStream)
      console.log('Video tracks:', testStream.getVideoTracks().length)

      if (videoRef.current) {
        videoRef.current.srcObject = testStream
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play()
            console.log('Video playing, dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight)
          }
        }
      }

      setStream(testStream)
      setHasPermission(true)
      console.log('Camera test successful')
      
    } catch (err: any) {
      console.error('Camera test failed:', err)
      setHasPermission(false)
      setError(err.message)
      
      let userMessage = 'Camera access failed'
      if (err.name === 'NotAllowedError') {
        userMessage = 'Camera permission denied'
      } else if (err.name === 'NotFoundError') {
        userMessage = 'No camera found'
      } else if (err.name === 'NotReadableError') {
        userMessage = 'Camera busy or unavailable'
      }
      
      toast.error(userMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const retryAccess = () => {
    // Clean up existing stream first
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    
    // Reset state
    setHasPermission(null)
    setError(null)
    
    // Try again
    testCameraAccess()
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <VideoCamera className="h-5 w-5" />
          Camera Access Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p>Testing camera access...</p>
          </div>
        )}

        {hasPermission === true && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Camera access successful!</span>
            </div>
            
            <div className="bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
            
            <p className="text-sm text-muted-foreground">
              If you can see yourself in the video above, camera access is working properly.
            </p>
          </div>
        )}

        {hasPermission === false && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <X className="h-5 w-5" />
              <span className="font-medium">Camera access failed</span>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">Error: {error}</p>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-800 mb-2">Try these steps:</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>1. Look for a camera icon in your browser's address bar</li>
                <li>2. Click it and select "Always allow" camera access</li>
                <li>3. Refresh the page if needed</li>
                <li>4. Make sure no other apps are using your camera</li>
              </ul>
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-center">
          {hasPermission === false && (
            <Button onClick={retryAccess}>
              Try Again
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}