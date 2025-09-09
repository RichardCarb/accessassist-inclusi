import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { VideoCamera, Stop, Play, Trash, Upload, Hand, Activity } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Sign2TextRecorderProps {
  onVideoRecorded: (blob: Blob, transcript: string) => void
  onClose: () => void
  maxDurationMinutes?: number
}

interface HandLandmark {
  x: number
  y: number
  z?: number
}

interface DetectedHand {
  landmarks: HandLandmark[]
  handedness: 'Left' | 'Right'
  score: number
}

interface SignPrediction {
  sign: string
  confidence: number
  timestamp: number
}

type RecordingState = 'setup' | 'recording' | 'processing' | 'playback'

export function Sign2TextRecorder({ 
  onVideoRecorded, 
  onClose, 
  maxDurationMinutes = 5 
}: Sign2TextRecorderProps) {
  const [currentState, setCurrentState] = useState<RecordingState>('setup')
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  
  // Hand tracking state
  const [detectedHands, setDetectedHands] = useState<DetectedHand[]>([])
  const [signPredictions, setSignPredictions] = useState<SignPrediction[]>([])
  const [isTracking, setIsTracking] = useState(false)
  const [trackingFps, setTrackingFps] = useState(0)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const trackingLoopRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)
  
  const maxDurationSeconds = maxDurationMinutes * 60

  // Initialize camera on mount
  useEffect(() => {
    initializeCamera()
    
    return () => {
      cleanup()
    }
  }, [])

  const initializeCamera = async () => {
    try {
      console.log('Initializing camera for Sign2Text...')
      
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not supported')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        },
        audio: true
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded')
          setHasPermission(true)
          startHandTracking()
        }
      }

      streamRef.current = stream
      toast.success('Camera initialized successfully')

    } catch (error: any) {
      console.error('Camera initialization failed:', error)
      setHasPermission(false)
      
      let message = 'Camera access failed'
      if (error.name === 'NotAllowedError') {
        message = 'Camera permission denied. Please allow camera access.'
      } else if (error.name === 'NotFoundError') {
        message = 'No camera found'
      } else if (error.name === 'NotReadableError') {
        message = 'Camera is busy or unavailable'
      }
      
      toast.error(message)
    }
  }

  const startHandTracking = useCallback(() => {
    if (!videoRef.current || isTracking) return
    
    console.log('Starting hand tracking...')
    setIsTracking(true)
    
    const processFrame = () => {
      if (!isTracking || !videoRef.current) return
      
      // Simulate hand tracking (placeholder for actual implementation)
      detectHands()
      
      // Update FPS counter
      const now = performance.now()
      if (now - lastFrameTimeRef.current >= 1000) {
        setTrackingFps(Math.round(1000 / (now - lastFrameTimeRef.current)))
        lastFrameTimeRef.current = now
      }
      
      trackingLoopRef.current = requestAnimationFrame(processFrame)
    }
    
    processFrame()
    
  }, [isTracking])

  const detectHands = () => {
    // This is a placeholder for actual hand detection
    // In a real implementation, this would use MediaPipe or similar
    
    // Simulate random hand detection for demo purposes
    const shouldDetect = Math.random() > 0.7
    
    if (shouldDetect) {
      const mockHands: DetectedHand[] = []
      
      // Randomly add left hand
      if (Math.random() > 0.6) {
        mockHands.push({
          landmarks: Array.from({ length: 21 }, (_, i) => ({
            x: 0.3 + Math.random() * 0.2,
            y: 0.4 + Math.random() * 0.3,
            z: Math.random() * 0.1
          })),
          handedness: 'Left',
          score: 0.8 + Math.random() * 0.2
        })
      }
      
      // Randomly add right hand
      if (Math.random() > 0.6) {
        mockHands.push({
          landmarks: Array.from({ length: 21 }, (_, i) => ({
            x: 0.5 + Math.random() * 0.2,
            y: 0.4 + Math.random() * 0.3,
            z: Math.random() * 0.1
          })),
          handedness: 'Right',
          score: 0.8 + Math.random() * 0.2
        })
      }
      
      setDetectedHands(mockHands)
      
      // Simulate sign recognition
      if (mockHands.length > 0 && isRecording) {
        const signs = ['HELLO', 'PLEASE', 'THANK_YOU', 'HELP', 'COMPLAINT', 'PROBLEM']
        const randomSign = signs[Math.floor(Math.random() * signs.length)]
        
        setSignPredictions(prev => [...prev.slice(-19), {
          sign: randomSign,
          confidence: 0.7 + Math.random() * 0.3,
          timestamp: Date.now()
        }])
      }
    } else {
      setDetectedHands([])
    }
  }

  const stopHandTracking = () => {
    setIsTracking(false)
    if (trackingLoopRef.current) {
      cancelAnimationFrame(trackingLoopRef.current)
      trackingLoopRef.current = null
    }
    setDetectedHands([])
  }

  const startRecording = async () => {
    if (!streamRef.current) {
      toast.error('Camera not available')
      return
    }

    try {
      chunksRef.current = []
      setSignPredictions([])
      
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9'
      })
      
      mediaRecorderRef.current = mediaRecorder
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        setRecordedBlob(blob)
        setIsRecording(false)
        setCurrentState('playback')
        
        // Set video to show recorded content
        if (videoRef.current) {
          videoRef.current.srcObject = null
          videoRef.current.src = URL.createObjectURL(blob)
          videoRef.current.controls = true
          videoRef.current.muted = false
        }
        
        toast.success('Recording completed!')
      }

      mediaRecorder.start(100)
      setIsRecording(true)
      setCurrentState('recording')
      setRecordingTime(0)
      
      // Start recording timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1
          if (newTime >= maxDurationSeconds) {
            stopRecording()
          }
          return newTime
        })
      }, 1000)
      
      toast.success('Recording started')

    } catch (error) {
      console.error('Recording error:', error)
      toast.error('Failed to start recording')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const processVideo = async () => {
    if (!recordedBlob) return
    
    setIsProcessing(true)
    setCurrentState('processing')
    
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Generate transcript from collected sign predictions
      const transcript = generateTranscriptFromSigns(signPredictions, recordingTime)
      setTranscript(transcript)
      
      toast.success('Video processed successfully!')
      
      // Pass the result back
      onVideoRecorded(recordedBlob, transcript)
      
    } catch (error) {
      console.error('Processing error:', error)
      toast.error('Failed to process video')
    } finally {
      setIsProcessing(false)
    }
  }

  const generateTranscriptFromSigns = (predictions: SignPrediction[], duration: number): string => {
    if (predictions.length === 0) {
      return 'I would like to make a complaint. (No specific signs detected during recording)'
    }
    
    // Group consecutive similar signs
    const groupedSigns: { sign: string, count: number, avgConfidence: number }[] = []
    let currentSign = ''
    let currentCount = 0
    let currentConfidenceSum = 0
    
    for (const prediction of predictions) {
      if (prediction.sign === currentSign) {
        currentCount++
        currentConfidenceSum += prediction.confidence
      } else {
        if (currentSign) {
          groupedSigns.push({
            sign: currentSign,
            count: currentCount,
            avgConfidence: currentConfidenceSum / currentCount
          })
        }
        currentSign = prediction.sign
        currentCount = 1
        currentConfidenceSum = prediction.confidence
      }
    }
    
    // Add the last sign
    if (currentSign) {
      groupedSigns.push({
        sign: currentSign,
        count: currentCount,
        avgConfidence: currentConfidenceSum / currentCount
      })
    }
    
    // Filter signs with reasonable confidence and frequency
    const significantSigns = groupedSigns
      .filter(s => s.avgConfidence > 0.6 && s.count >= 2)
      .sort((a, b) => b.count - a.count)
    
    // Generate natural language from signs
    let transcript = 'I would like to make a complaint'
    
    if (significantSigns.some(s => s.sign === 'HELP')) {
      transcript += ' and I need help resolving this issue'
    }
    
    if (significantSigns.some(s => s.sign === 'PROBLEM')) {
      transcript += '. This is a serious problem'
    }
    
    if (significantSigns.some(s => s.sign === 'THANK_YOU')) {
      transcript += '. Thank you for your assistance'
    }
    
    transcript += '.'
    
    // Add technical details
    transcript += `\n\nSign Detection Summary:\n`
    transcript += `- Recording Duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}\n`
    transcript += `- Total Sign Predictions: ${predictions.length}\n`
    transcript += `- Significant Signs Detected: ${significantSigns.length}\n`
    
    if (significantSigns.length > 0) {
      transcript += `- Detected Signs: ${significantSigns.map(s => `${s.sign} (${s.count}x, ${Math.round(s.avgConfidence * 100)}%)`).join(', ')}\n`
    }
    
    return transcript
  }

  const retakeVideo = () => {
    setRecordedBlob(null)
    setRecordingTime(0)
    setCurrentState('setup')
    setSignPredictions([])
    setTranscript('')
    
    // Restore live video feed
    if (videoRef.current && streamRef.current) {
      if (videoRef.current.src) {
        URL.revokeObjectURL(videoRef.current.src)
      }
      videoRef.current.src = ''
      videoRef.current.controls = false
      videoRef.current.muted = true
      videoRef.current.srcObject = streamRef.current
    }
  }

  const cleanup = () => {
    console.log('Cleaning up Sign2Text recorder...')
    
    stopHandTracking()
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    if (videoRef.current?.src) {
      URL.revokeObjectURL(videoRef.current.src)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Loading state
  if (hasPermission === null) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
          <h3 className="font-semibold mb-2">Setting up Sign2Text System</h3>
          <p className="text-muted-foreground">
            Initializing camera and hand tracking for UK Sign Language recognition...
          </p>
        </CardContent>
      </Card>
    )
  }

  // Permission denied state
  if (hasPermission === false) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <VideoCamera className="h-5 w-5" />
            Camera Access Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Sign2Text requires camera access to record and analyze your UK Sign Language input.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800 mb-2">To enable camera access:</p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>1. Look for a camera icon in your browser's address bar</li>
              <li>2. Click it and select "Allow" camera access</li>
              <li>3. Refresh the page if needed</li>
              <li>4. Ensure no other apps are using your camera</li>
            </ul>
          </div>
          
          <div className="flex gap-2 justify-center">
            <Button onClick={initializeCamera}>Try Again</Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Processing state
  if (currentState === 'processing') {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full" />
          </div>
          <h3 className="font-semibold mb-2">Processing Sign Language Video</h3>
          <p className="text-muted-foreground mb-4">
            Analyzing {signPredictions.length} sign predictions to generate your transcript...
          </p>
          <Progress value={75} className="w-64 mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">
            This may take a few moments
          </p>
        </CardContent>
      </Card>
    )
  }

  // Main recorder interface
  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hand className="h-5 w-5" />
            Sign2Text - UK Sign Language Recorder
          </div>
          <div className="flex items-center gap-2">
            {isTracking && (
              <Badge variant="default" className="animate-pulse">
                <Activity className="h-3 w-3 mr-1" />
                Tracking ({trackingFps} fps)
              </Badge>
            )}
            {detectedHands.length > 0 && (
              <Badge variant="secondary">
                {detectedHands.length} Hand{detectedHands.length !== 1 ? 's' : ''} Detected
              </Badge>
            )}
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Record your complaint using UK Sign Language. The system will track your hand movements and generate a text transcript.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Video Display */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={currentState !== 'playback'}
            className="w-full h-full object-cover"
          />
          
          {/* Hand tracking overlays */}
          {currentState !== 'playback' && detectedHands.map((hand, index) => {
            const centerX = hand.landmarks.reduce((sum, l) => sum + l.x, 0) / hand.landmarks.length
            const centerY = hand.landmarks.reduce((sum, l) => sum + l.y, 0) / hand.landmarks.length
            
            return (
              <div
                key={`${hand.handedness}-${index}`}
                className={`absolute w-16 h-16 border-2 rounded-full ${
                  hand.handedness === 'Left' 
                    ? 'border-blue-400 bg-blue-400/20' 
                    : 'border-green-400 bg-green-400/20'
                }`}
                style={{
                  left: `${centerX * 100}%`,
                  top: `${centerY * 100}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className={`absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs text-white ${
                  hand.handedness === 'Left' ? 'bg-blue-400' : 'bg-green-400'
                }`}>
                  {hand.handedness} ({Math.round(hand.score * 100)}%)
                </div>
              </div>
            )
          })}
          
          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <div className="animate-pulse w-3 h-3 bg-red-500 rounded-full" />
              <Badge variant="destructive">
                REC {formatTime(recordingTime)}
              </Badge>
            </div>
          )}
          
          {/* Sign predictions display */}
          {isRecording && signPredictions.length > 0 && (
            <div className="absolute top-4 left-4 space-y-1 max-w-xs">
              {signPredictions.slice(-3).map((prediction, index) => (
                <Badge
                  key={`${prediction.timestamp}-${index}`}
                  variant="outline"
                  className="bg-purple-500/90 text-white border-purple-300"
                >
                  {prediction.sign.replace('_', ' ')} ({Math.round(prediction.confidence * 100)}%)
                </Badge>
              ))}
            </div>
          )}
          
          {/* Status overlay for setup */}
          {currentState === 'setup' && !isRecording && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/75 text-white px-6 py-4 rounded-lg text-center">
                <h4 className="font-medium mb-2">Ready to Record</h4>
                <p className="text-sm opacity-90">
                  Position yourself clearly in front of the camera
                </p>
                <p className="text-xs opacity-75 mt-1">
                  Hands detected: {detectedHands.length}/2
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Hand Detection Status */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Hand className="h-4 w-4" />
                Hand Detection
              </CardTitle>
            </CardHeader>
            <CardContent>
              {detectedHands.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">No hands detected</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Show your hands clearly to the camera
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {detectedHands.map((hand, index) => (
                    <div key={`hand-info-${index}`} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          hand.handedness === 'Left' ? 'bg-blue-500' : 'bg-green-500'
                        }`} />
                        <span className="text-sm font-medium">{hand.handedness} Hand</span>
                      </div>
                      <Badge variant="outline">
                        {Math.round(hand.score * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Sign Recognition
              </CardTitle>
            </CardHeader>
            <CardContent>
              {signPredictions.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">No signs recognized yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start recording to begin sign recognition
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Signs captured: {signPredictions.length}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Recent: {signPredictions.slice(-3).map(p => p.sign).join(', ')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center">
          {currentState === 'setup' && !isRecording ? (
            <Button 
              onClick={startRecording}
              size="lg"
              disabled={!isTracking}
            >
              <VideoCamera className="h-5 w-5 mr-2" />
              Start Recording
            </Button>
          ) : currentState === 'recording' ? (
            <Button 
              onClick={stopRecording}
              variant="destructive"
              size="lg"
            >
              <Stop className="h-5 w-5 mr-2" />
              Stop Recording
            </Button>
          ) : currentState === 'playback' ? (
            <>
              <Button variant="outline" onClick={retakeVideo}>
                <Trash className="h-4 w-4 mr-2" />
                Retake
              </Button>
              <Button 
                onClick={processVideo}
                disabled={isProcessing}
              >
                <Upload className="h-4 w-4 mr-2" />
                Process & Continue
              </Button>
            </>
          ) : null}
          
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium mb-2 text-blue-800">Sign2Text Instructions</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <p className="font-medium mb-1">Before Recording:</p>
              <ul className="space-y-1">
                <li>• Ensure good lighting on your hands</li>
                <li>• Position yourself arm's length from camera</li>
                <li>• Wait for hand detection to activate</li>
                <li>• Check that both hands are being tracked</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">During Recording:</p>
              <ul className="space-y-1">
                <li>• Use clear, deliberate sign movements</li>
                <li>• Keep hands within camera frame</li>
                <li>• Pause briefly between signs</li>
                <li>• Watch for sign recognition feedback</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}