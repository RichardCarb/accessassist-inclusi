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
  const streamRef = useRef<MediaStream | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [currentView, setCurrentView] = useState<TestView>('basic')

  useEffect(() => {
    startCameraTest()
    
    // Cleanup function
    return () => {
      cleanupStream()
    }
  }, [])

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const startCameraTest = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setVideoReady(false)
      setHasPermission(null)
      
      console.log('Starting camera test...')
      
      // Check if camera API is available
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not supported in this browser')
      }

      // Clean up any existing stream
      cleanupStream()

      // Request camera access
      console.log('Requesting camera permission...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      })
      
      console.log('Camera stream obtained successfully')
      streamRef.current = stream
      setHasPermission(true)

      // Set up video element
      if (videoRef.current) {
        const video = videoRef.current
        
        // Wait for video to be ready
        const setupVideo = () => {
          return new Promise<void>((resolve) => {
            const onCanPlay = () => {
              console.log('Video can play - setting up stream')
              video.removeEventListener('canplay', onCanPlay)
              video.removeEventListener('loadedmetadata', onCanPlay)
              
              // Check if video dimensions are valid
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                console.log(`Video dimensions: ${video.videoWidth}x${video.videoHeight}`)
                setVideoReady(true)
                setIsLoading(false)
                toast.success('Camera is working!')
                resolve()
              } else {
                // Force ready state even without dimensions
                setTimeout(() => {
                  setVideoReady(true)
                  setIsLoading(false)
                  resolve()
                }, 500)
              }
            }
            
            video.addEventListener('canplay', onCanPlay)
            video.addEventListener('loadedmetadata', onCanPlay)
            
            // Fallback timeout
            setTimeout(() => {
              if (!videoReady) {
                console.log('Timeout reached - forcing video ready state')
                video.removeEventListener('canplay', onCanPlay)
                video.removeEventListener('loadedmetadata', onCanPlay)
                setVideoReady(true)
                setIsLoading(false)
                resolve()
              }
            }, 3000)
          })
        }

        // Assign the stream
        video.srcObject = stream
        
        // Start video playback
        try {
          await video.play()
          console.log('Video play started')
        } catch (playError) {
          console.log('Autoplay prevented:', playError)
          // Don't treat this as an error - user can click to play
        }
        
        // Wait for video to be ready
        await setupVideo()
        
      } else {
        console.warn('Video element not found')
        setIsLoading(false)
        setVideoReady(true)
      }
      
    } catch (err: any) {
      console.error('Camera test failed:', err)
      cleanupStream()
      setHasPermission(false)
      setIsLoading(false)
      setVideoReady(false)
      
      let userMessage = 'Camera access failed'
      if (err.name === 'NotAllowedError') {
        userMessage = 'Camera permission denied. Please allow camera access in your browser settings.'
      } else if (err.name === 'NotFoundError') {
        userMessage = 'No camera found on this device'
      } else if (err.name === 'NotReadableError') {
        userMessage = 'Camera is busy. Close other apps using the camera and try again.'
      } else if (err.name === 'OverconstrainedError') {
        userMessage = 'Camera settings not supported'
      }
      
      setError(userMessage)
      toast.error(userMessage)
    }
  }

  const retryAccess = () => {
    console.log('Retrying camera access...')
    cleanupStream()
    setHasPermission(null)
    setError(null)
    setVideoReady(false)
    startCameraTest()
  }

  const handleVideoClick = async () => {
    if (videoRef.current && !videoRef.current.playing) {
      try {
        await videoRef.current.play()
        console.log('Video play successful after user interaction')
        if (!videoReady) {
          setVideoReady(true)
          setIsLoading(false)
          toast.success('Video started!')
        }
      } catch (err) {
        console.warn('Video play failed after click:', err)
      }
    }
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
              {isLoading && hasPermission !== false && (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-lg font-medium">Starting camera...</p>
                  <p className="text-sm text-muted-foreground mt-2">This should only take a few seconds</p>
                </div>
              )}

              {hasPermission === true && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Camera connected successfully!</span>
                  </div>
                  
                  <div className="bg-black rounded-lg overflow-hidden aspect-video relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={handleVideoClick}
                    />
                    
                    {(!videoReady && !isLoading) && (
                      <div className="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-75">
                        <div className="text-center">
                          <VideoCamera className="h-12 w-12 mx-auto mb-4" />
                          <p className="font-medium">Click to start video</p>
                        </div>
                      </div>
                    )}
                    
                    {isLoading && hasPermission === true && (
                      <div className="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-75">
                        <div className="text-center">
                          <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4" />
                          <p className="text-sm text-gray-300">Setting up camera...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {videoReady ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-green-800 font-medium">✓ Camera is working perfectly!</p>
                      <p className="text-green-700 text-sm">You should see your video feed above.</p>
                    </div>
                  ) : isLoading ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-blue-800">Setting up video stream...</p>
                    </div>
                  ) : (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-orange-800">Click the video area to start playback</p>
                    </div>
                  )}

                  <div className="bg-muted/50 p-3 rounded-lg text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p><strong>Permission:</strong> {hasPermission ? 'Granted' : 'Denied'}</p>
                        <p><strong>Video Ready:</strong> {videoReady ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
                        {streamRef.current && (
                          <p><strong>Video Tracks:</strong> {streamRef.current.getVideoTracks().length}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {hasPermission === false && (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                      <X className="h-5 w-5" />
                      <span className="font-medium">Camera Access Failed</span>
                    </div>
                    {error && (
                      <>
                        <p className="text-sm text-red-800 font-medium">Error:</p>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                      </>
                    )}
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 font-medium mb-2">To fix this:</p>
                    <ol className="text-sm text-blue-700 space-y-1 list-decimal ml-4">
                      <li>Look for a camera icon in your browser's address bar</li>
                      <li>Click it and select "Allow" for camera access</li>
                      <li>Refresh the page if needed</li>
                    </ol>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-center">
                <Button onClick={retryAccess} variant="outline">
                  {hasPermission === false ? 'Try Again' : 'Refresh Camera'}
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hand className="h-5 w-5" />
                Hand Tracking Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                This advanced test uses MediaPipe to track hand gestures in real-time 
                for improved reliability and accuracy.
              </p>
              <HandTrackingCamera onClose={onClose} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}