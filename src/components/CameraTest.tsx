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
      console.log('Navigator.mediaDevices:', !!navigator.mediaDevices)
      console.log('getUserMedia:', !!navigator.mediaDevices?.getUserMedia)
      console.log('Location:', location.protocol, location.hostname)
      console.log('Is HTTPS or localhost:', location.protocol === 'https:' || location.hostname === 'localhost')

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
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          facingMode: 'user',
          frameRate: { ideal: 15, max: 30 }
        },
        audio: false
      }

      console.log('Requesting stream with constraints:', constraints)
      const testStream = await navigator.mediaDevices.getUserMedia(constraints)

      console.log('Stream obtained:', testStream)
      console.log('Video tracks:', testStream.getVideoTracks())
      
      const videoTrack = testStream.getVideoTracks()[0]
      if (videoTrack) {
        console.log('Video track settings:', videoTrack.getSettings())
        console.log('Video track state:', videoTrack.readyState)
      }

      if (videoRef.current) {
        const video = videoRef.current
        let timeoutId: NodeJS.Timeout
        
        // Set up event handlers with timeout fallback
        const handleVideoReady = () => {
          console.log('Video ready - clearing timeout and setting state')
          if (timeoutId) clearTimeout(timeoutId)
          setVideoReady(true)
          setIsLoading(false)
          
          // Try to play the video  
          video.play().then(() => {
            console.log('Video playing successfully')
          }).catch(playError => {
            console.warn('Video play failed, but video is ready:', playError)
          })
        }

        const handleLoadedMetadata = () => {
          console.log('Video metadata loaded')
          console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight)
          
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            handleVideoReady()
          }
        }

        const handleCanPlay = () => {
          console.log('Video can play')
          // Fallback if loadedmetadata doesn't fire
          if (!videoReady) {
            handleVideoReady()
          }
        }

        const handleError = (e: Event) => {
          console.error('Video element error:', e)
          if (timeoutId) clearTimeout(timeoutId)
          setError('Video display error')
          setIsLoading(false)
        }

        // Clean up previous handlers
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        video.removeEventListener('error', handleError)
        video.removeEventListener('canplay', handleCanPlay)
        
        // Add new handlers
        video.addEventListener('loadedmetadata', handleLoadedMetadata)
        video.addEventListener('error', handleError)
        video.addEventListener('canplay', handleCanPlay)
        
        // Timeout fallback - if video doesn't load within 1.5 seconds, show manual play
        timeoutId = setTimeout(() => {
          console.log('Video load timeout - showing manual controls')
          setIsLoading(false)
          if (!videoReady) {
            toast.info('Camera connected! Click the button to start video.')
          }
        }, 1500)
        
        // Reset and set the stream with force refresh
        video.srcObject = null
        // Small delay to ensure cleanup
        await new Promise(resolve => setTimeout(resolve, 100))
        video.srcObject = testStream
        
        // Don't call load() with srcObject - it interferes with MediaStream
        // Force play instead
        try {
          await video.play()
          console.log('Video play completed')
        } catch (playErr) {
          console.warn('Video play failed but continuing:', playErr)
          // Try to play anyway after a delay
          setTimeout(() => {
            video.play().catch(e => console.warn('Retry play failed:', e))
          }, 500)
        }
        
        // Manual trigger if metadata is already loaded
        if (video.readyState >= 1) { // HAVE_METADATA
          console.log('Video already has metadata, triggering handler')
          handleLoadedMetadata()
        }
        
        // Additional fallback - check video periodically
        const checkVideo = () => {
          if (video.videoWidth > 0 && video.videoHeight > 0 && !videoReady) {
            console.log('Manual video check - video has dimensions, setting ready')
            handleVideoReady()
          }
        }
        
        // Check immediately and after delays
        setTimeout(checkVideo, 500)
        setTimeout(checkVideo, 1000)
        setTimeout(checkVideo, 2000)
      } else {
        // No video element - still mark as successful since we got the stream
        console.log('No video element, but stream obtained successfully')
        setTimeout(() => {
          setVideoReady(true)
          setIsLoading(false)
        }, 1000)
      }

      setStream(testStream)
      setHasPermission(true)
      console.log('Camera test successful')
      
    } catch (err: any) {
      console.error('Camera test failed:', err)
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
                      controls={false}
                      className="w-full h-full object-cover"
                      style={{ backgroundColor: '#000', minHeight: '240px' }}
                      onLoadStart={() => console.log('Video load started')}
                      onLoadedData={() => console.log('Video data loaded')}
                      onPlaying={() => {
                        console.log('Video is playing')
                        setVideoReady(true)
                        setIsLoading(false)
                      }}
                    />
                    
                    {!videoReady && (
                      <div className="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-75">
                        <div className="text-center">
                          <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
                          <p className="text-sm">Loading video feed...</p>
                          <p className="text-xs mt-1 text-gray-300">Camera light is on, video should appear shortly</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-3 text-black bg-white"
                            onClick={() => {
                              console.log('Manual play button clicked')
                              if (videoRef.current) {
                                videoRef.current.play().then(() => {
                                  console.log('Manual play successful')
                                  setVideoReady(true)
                                  setIsLoading(false)
                                }).catch(e => console.warn('Manual play failed:', e))
                              }
                            }}
                          >
                            Click to Start Video
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      {videoReady 
                        ? "✓ Camera is working properly! You should see yourself in the video above."
                        : "Camera connected, loading video feed..."
                      }
                    </p>
                    {videoReady && stream && (
                      <p className="text-xs">
                        Video tracks: {stream.getVideoTracks().length} | 
                        Status: {stream.getVideoTracks()[0]?.readyState || 'unknown'}
                      </p>
                    )}
                    {videoReady && videoRef.current && videoRef.current.paused && (
                      <div className="mt-2">
                        <Button 
                          size="sm" 
                          onClick={() => videoRef.current?.play()}
                          className="text-xs"
                        >
                          Click to Start Video
                        </Button>
                      </div>
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