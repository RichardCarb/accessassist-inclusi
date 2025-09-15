import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { VideoCamera, Stop, Hand, Activity, AlertCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Sign2TextRecorderProps {
  onVideoRecorded: (blob: Blob, transcript: string) => void
  onClose: () => void
  maxDurationMinutes?: number
}

const Sign2TextRecorder: React.FC<Sign2TextRecorderProps> = ({ 
  onVideoRecorded, 
  onClose, 
  maxDurationMinutes = 5 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const maxDurationSeconds = maxDurationMinutes * 60

  useEffect(() => {
    initializeCamera()
    return () => {
      cleanup()
    }
  }, [])

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  const initializeCamera = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not supported')
      }

      console.log('Requesting camera access...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      })

      console.log('Camera stream obtained')
      streamRef.current = stream
      setHasPermission(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        // Handle video ready state
        const handleVideoReady = () => {
          console.log('Video is ready')
          setVideoReady(true)
          setIsLoading(false)
          toast.success('Camera ready for sign language recording!')
        }

        videoRef.current.addEventListener('canplay', handleVideoReady)
        videoRef.current.addEventListener('loadedmetadata', handleVideoReady)
        
        try {
          await videoRef.current.play()
        } catch (playError) {
          console.log('Autoplay prevented, but camera is ready')
          handleVideoReady()
        }

        // Fallback timeout
        setTimeout(() => {
          if (!videoReady && stream.active) {
            console.log('Timeout fallback - forcing ready state')
            handleVideoReady()
          }
        }, 3000)
      }
    } catch (error: any) {
      console.error('Camera initialization failed:', error)
      setHasPermission(false)
      setIsLoading(false)
      
      let message = 'Camera access failed'
      if (error.name === 'NotAllowedError') {
        message = 'Camera permission denied. Please allow camera access.'
      } else if (error.name === 'NotFoundError') {
        message = 'No camera found on this device'
      } else if (error.name === 'NotReadableError') {
        message = 'Camera is busy or unavailable'
      }
      
      setError(message)
      toast.error(message)
    }
  }

  const startRecording = () => {
    if (!streamRef.current || !videoRef.current) {
      toast.error('Camera not ready')
      return
    }

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9'
      })
      
      const chunks: Blob[] = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        const transcript = 'Sign language detected (processing coming soon)'
        onVideoRecorded(blob, transcript)
        toast.success('Recording completed!')
      }
      
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(1000) // Collect data every second
      
      setIsRecording(true)
      setRecordingTime(0)
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1
          if (newTime >= maxDurationSeconds) {
            stopRecording()
          }
          return newTime
        })
      }, 1000)
      
      toast.success('Recording started!')
    } catch (error) {
      console.error('Failed to start recording:', error)
      toast.error('Failed to start recording')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    setIsRecording(false)
  }

  const handleVideoClick = async () => {
    if (videoRef.current && videoRef.current.paused) {
      try {
        await videoRef.current.play()
        if (!videoReady) {
          setVideoReady(true)
          setIsLoading(false)
        }
      } catch (err) {
        console.warn('Video play failed after click:', err)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hand className="h-5 w-5" />
          Sign Language Recording
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && hasPermission !== false && (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-lg font-medium">Setting up camera...</p>
            <p className="text-sm text-muted-foreground">This may take a few seconds</p>
          </div>
        )}

        {hasPermission === true && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={videoReady ? "default" : "secondary"}>
                  {videoReady ? "Camera Ready" : "Initializing"}
                </Badge>
                {isRecording && (
                  <Badge variant="destructive" className="animate-pulse">
                    Recording {formatTime(recordingTime)}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span>Max: {maxDurationMinutes} minutes</span>
              </div>
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
                    <p className="text-lg font-medium">Click to start camera</p>
                  </div>
                </div>
              )}
              
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-75">
                  <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-lg font-medium">Loading camera...</p>
                  </div>
                </div>
              )}

              {isRecording && (
                <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                  ● REC {formatTime(recordingTime)}
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Hand className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Sign Language Recording</p>
                  <p className="text-sm text-blue-700">
                    Position yourself clearly in the camera view. Make sure your hands are visible 
                    and well-lit for the best sign language recognition.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              {!isRecording ? (
                <Button 
                  onClick={startRecording} 
                  disabled={!videoReady}
                  className="flex items-center gap-2"
                >
                  <VideoCamera className="h-4 w-4" />
                  Start Recording
                </Button>
              ) : (
                <Button 
                  onClick={stopRecording}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Stop className="h-4 w-4" />
                  Stop Recording
                </Button>
              )}
              
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}

        {hasPermission === false && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Camera access failed</span>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium">Error:</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-800 mb-2">To enable sign language recording:</p>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal ml-4">
                <li>Look for the camera icon in your browser's address bar</li>
                <li>Click it and select "Allow" for camera access</li>
                <li>Refresh the page and try again</li>
                <li>Make sure no other apps are using your camera</li>
              </ol>
            </div>

            <div className="flex gap-2 justify-center">
              <Button onClick={initializeCamera}>
                Try Again
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default Sign2TextRecorder
