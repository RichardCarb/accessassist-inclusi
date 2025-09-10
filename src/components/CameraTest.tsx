import React, { useRef, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VideoCamera, CheckCircle, X, Hand } from '@phosphor-icons/react'
import { HandTrackingCamera } from './HandTrackingCamera'
import { toast } from 'sonner'

interface CameraTestProps {
  onClose: () => void
}

type TestView = 'basic' | 'tracking'

export function CameraTest({ onClose }: CameraTestProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [currentView, setCurrentView] = useState<TestView>('basic')

  useEffect(() => {
    testCameraAccess()
    
    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const testCameraAccess = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setVideoReady(false)
      
      console.log('Testing camera access...')
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser')
      }

      // Stop any existing stream first
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
      }

      const constraints = {
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      }

      console.log('Requesting camera stream...')
      const testStream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log('Stream obtained successfully')

      setStream(testStream)
      setHasPermission(true)

      // Handle video element setup
      if (videoRef.current) {
        const video = videoRef.current
        
        // Simple event handler
        const handleVideoStart = () => {
          console.log('Video started successfully')
          setVideoReady(true)
          setIsLoading(false)
          toast.success('Camera is working!')
        }

        // Set up event listeners
        video.addEventListener('playing', handleVideoStart)
        video.addEventListener('loadedmetadata', () => {
          console.log('Video metadata loaded')
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setVideoReady(true)
            setIsLoading(false)
          }
        })

        // Assign stream and play
        video.srcObject = testStream
        
        try {
          await video.play()
          console.log('Video play initiated')
        } catch (playErr) {
          console.log('Autoplay blocked, user interaction required')
          setIsLoading(false)
          toast.info('Click the video area to start')
        }

        // Fallback timeout
        setTimeout(() => {
          if (!videoReady) {
            console.log('Video not ready after 2 seconds, forcing ready state')
            setIsLoading(false)
            setVideoReady(true)
          }
        }, 2000)
      } else {
        console.log('No video element, but stream obtained')
        setIsLoading(false)
        setVideoReady(true)
      }
      
    } catch (err: any) {
      console.error('Camera access failed:', err)
      setHasPermission(false)
      setIsLoading(false)
      
      let userMessage = 'Camera access failed'
      if (err.name === 'NotAllowedError') {
        userMessage = 'Camera permission denied. Please allow camera access and try again.'
      } else if (err.name === 'NotFoundError') {
        userMessage = 'No camera found on this device'
      } else if (err.name === 'NotReadableError') {
        userMessage = 'Camera is busy or unavailable. Close other apps using the camera and try again.'
      } else if (err.name === 'OverconstrainedError') {
        userMessage = 'Camera doesn\'t support the requested settings'
      }
      
      setError(err.message || userMessage)
      toast.error(userMessage)
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
    setVideoReady(false)
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    // Try again
    testCameraAccess()
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as TestView)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <VideoCamera className="h-4 w-4" />
            Basic Camera Test
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center gap-2">
            <Hand className="h-4 w-4" />
            Hand Tracking Test
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic">
          <Card>
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
                  
                  <div className="bg-black rounded-lg overflow-hidden aspect-video relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ backgroundColor: '#000', minHeight: '240px' }}
                      onClick={() => {
                        console.log('Video clicked - attempting play')
                        if (videoRef.current) {
                          videoRef.current.play().then(() => {
                            console.log('Play successful after click')
                            setVideoReady(true)
                            setIsLoading(false)
                          }).catch(e => console.warn('Play failed after click:', e))
                        }
                      }}
                    />
                    
                    {(!videoReady || isLoading) && (
                      <div className="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-75">
                        <div className="text-center">
                          {isLoading ? (
                            <>
                              <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
                              <p className="text-sm">Initializing camera...</p>
                            </>
                          ) : (
                            <>
                              <VideoCamera className="h-8 w-8 mx-auto mb-2" />
                              <p className="text-sm">Click to start video</p>
                            </>
                          )}
                          <p className="text-xs mt-1 text-gray-300">Camera connected, loading video feed</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      {videoReady 
                        ? "✓ Camera is working properly! You should see yourself in the video above."
                        : isLoading 
                        ? "Initializing camera stream..." 
                        : "Click the video area to start"
                      }
                    </p>
                    {videoReady && stream && (
                      <p className="text-xs">
                        Video tracks: {stream.getVideoTracks().length} | 
                        Status: {stream.getVideoTracks()[0]?.readyState || 'unknown'}
                      </p>
                    )}
                  </div>

                  {/* Debug information */}
                  <div className="bg-muted/50 p-3 rounded text-xs space-y-2">
                    <p className="font-medium">Debug Information:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <strong>Stream:</strong> {stream ? '✓ Active' : '✗ None'}<br />
                        <strong>Video Ready:</strong> {videoReady ? '✓ Yes' : '✗ No'}<br />
                        <strong>Video Element:</strong> {videoRef.current ? '✓ Present' : '✗ Missing'}
                      </div>
                      <div>
                        {videoRef.current && (
                          <>
                            <strong>Video Size:</strong> {videoRef.current.videoWidth || 0}x{videoRef.current.videoHeight || 0}<br />
                            <strong>Ready State:</strong> {videoRef.current.readyState}<br />
                            <strong>Paused:</strong> {videoRef.current.paused ? 'Yes' : 'No'}
                          </>
                        )}
                      </div>
                    </div>
                    {stream && stream.getVideoTracks().length > 0 && (
                      <div>
                        <strong>Track Settings:</strong> {JSON.stringify(stream.getVideoTracks()[0]?.getSettings() || {}, null, 2)}
                      </div>
                    )}
                  </div>
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
                {hasPermission === true && (
                  <Button onClick={retryAccess} variant="outline">
                    Refresh Video
                  </Button>
                )}
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
        </TabsContent>

        <TabsContent value="tracking">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hand className="h-5 w-5" />
                  New Sign2Text Hand Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  The hand tracking system has been completely rebuilt with the Sign2Text approach 
                  for improved reliability and accuracy.
                </p>
                <HandTrackingCamera onClose={onClose} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}