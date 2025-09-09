import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { VideoCamera, Stop, Upload, Trash, Hand, Activity, Camera } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Sign2TextRecorderProps {
  onTranscriptGenerated: (transcript: string) => void
  onClose: () => void
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

type RecordingState = 'setup' | 'recording' | 'playback' | 'processing'

const Sign2TextRecorder: React.FC<Sign2TextRecorderProps> = ({ onTranscriptGenerated, onClose }) => {
  const [currentState, setCurrentState] = useState<RecordingState>('setup')
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [trackingFps, setTrackingFps] = useState(0)
  const [detectedHands, setDetectedHands] = useState<DetectedHand[]>([])
  const [signPredictions, setSignPredictions] = useState<SignPrediction[]>([])
  const [transcript, setTranscript] = useState('')
  const [initializationAttempts, setInitializationAttempts] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const trackingLoopRef = useRef<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const lastFrameTimeRef = useRef(performance.now())
  const maxDurationMinutes = 5
  const maxDurationSeconds = maxDurationMinutes * 60

  // Initialize camera on mount
  useEffect(() => {
    initializeCamera()
    return () => {
      cleanup()
    }
  }, [])

  const initializeCamera = async () => {
    setInitializationAttempts(prev => prev + 1)
    setDebugInfo('Checking camera API support...')
    
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not supported')
      }

      setDebugInfo('Creating camera constraints...')
      const constraints = {
        video: { 
          facingMode: 'user',
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 15, max: 30 }
        },
        audio: false // No audio needed for sign language
      }

      setDebugInfo('Requesting camera stream...')
      console.log('Requesting stream with constraints:', constraints)
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      console.log('Stream acquired:', stream.getTracks().length, 'tracks')
      streamRef.current = stream
      
      if (videoRef.current) {
        console.log('Setting video source...')
        videoRef.current.srcObject = stream
        
        const handleSuccess = () => {
          setHasPermission(true)
          startHandTracking()
          console.log('Video ready!')
          toast.success('Camera ready!')
        }

        // Try multiple events to ensure we catch video ready state
        const handleLoadedMetadata = () => {
          console.log('Metadata loaded, video dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight)
          if (videoRef.current && videoRef.current.videoWidth > 0) {
            handleSuccess()
          }
        }

        const handleCanPlay = () => {
          console.log('Can play event fired')
          handleSuccess()
        }

        const handleLoadedData = () => {
          console.log('Loaded data event fired')
          handleSuccess()
        }

        // Clean up any existing listeners
        videoRef.current.onloadedmetadata = null
        videoRef.current.oncanplay = null
        videoRef.current.onloadeddata = null
        
        // Set up new listeners
        videoRef.current.onloadedmetadata = handleLoadedMetadata
        videoRef.current.oncanplay = handleCanPlay
        videoRef.current.onloadeddata = handleLoadedData
        
        // Force play to trigger events
        videoRef.current.play().catch(e => {
          console.log('Play failed, but that\'s ok:', e.message)
        })

        // Fallback timeout to prevent infinite loading
        setTimeout(() => {
          console.log('Timeout check: hasPermission =', hasPermission, 'stream.active =', stream.active)
          if (hasPermission === null && stream && stream.active) {
            console.log('Fallback: assuming camera is ready after timeout')
            handleSuccess()
          }
        }, 3000)
      }
    } catch (error: any) {
      console.error('Camera initialization failed:', error)
      setHasPermission(false)
      setError(error.message)
      
      let message = 'Camera access failed'
      if (error.name === 'NotAllowedError') {
        message = 'Camera permission denied. Please allow camera access.'
      } else if (error.name === 'NotFoundError') {
        message = 'No camera found'
      } else if (error.name === 'NotReadableError') {
        message = 'Camera is busy or unavailable'
      }
      
      setDebugInfo(`Error: ${message}`)
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
  }

  const startRecording = () => {
    if (!streamRef.current) return
    
    try {
      setIsRecording(true)
      setCurrentState('recording')
      setSignPredictions([])
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
      
      toast.success('Recording started')
    } catch (error) {
      console.error('Failed to start recording:', error)
      toast.error('Failed to start recording')
    }
  }

  const stopRecording = () => {
    setIsRecording(false)
    setCurrentState('playback')
    
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    toast.success('Recording stopped')
  }

  const retakeVideo = () => {
    setCurrentState('setup')
    setSignPredictions([])
    setTranscript('')
    setRecordingTime(0)
  }

  const processVideo = async () => {
    setIsProcessing(true)
    setCurrentState('processing')
    
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const generatedTranscript = generateTranscriptFromSigns(signPredictions)
      setTranscript(generatedTranscript)
      
      // Pass transcript to parent
      onTranscriptGenerated(generatedTranscript)
      
      toast.success('Video processed successfully')
    } catch (error) {
      console.error('Processing error:', error)
      toast.error('Failed to process video')
    } finally {
      setIsProcessing(false)
    }
  }

  const generateTranscriptFromSigns = (predictions: SignPrediction[]): string => {
    if (predictions.length === 0) {
      return "No signs were detected during the recording. Please try again with clearer sign language movements."
    }

    // Group consecutive signs and calculate confidence
    const groupedSigns: { sign: string, count: number, confidence: number }[] = []
    let currentSign = predictions[0].sign
    let currentCount = 1
    let currentConfidenceSum = predictions[0].confidence

    for (let i = 1; i < predictions.length; i++) {
      const prediction = predictions[i]
      if (prediction.sign === currentSign) {
        currentCount++
        currentConfidenceSum += prediction.confidence
      } else {
        groupedSigns.push({
          sign: currentSign,
          count: currentCount,
          confidence: currentConfidenceSum / currentCount
        })
        currentSign = prediction.sign
        currentCount = 1
        currentConfidenceSum = prediction.confidence
      }
    }

    // Add the last sign
    if (currentCount > 0) {
      groupedSigns.push({
        sign: currentSign,
        count: currentCount,
        confidence: currentConfidenceSum / currentCount
      })
    }

    // Generate natural language transcript
    const primarySigns = groupedSigns.filter(s => s.confidence > 0.7 && s.count >= 2)
    let transcript = "I am signing to make a complaint. "

    if (primarySigns.some(s => s.sign === 'PROBLEM')) {
      transcript += "I have a problem "
    }
    if (primarySigns.some(s => s.sign === 'HELP')) {
      transcript += "and I need help "
    }
    if (primarySigns.some(s => s.sign === 'PLEASE')) {
      transcript += "Please "
    }
    if (primarySigns.some(s => s.sign === 'THANK_YOU')) {
      transcript += "Thank you "
    }

    transcript += "for your assistance."

    // Add technical details
    transcript += `\n\nSign Detection Summary:
- Total signs detected: ${predictions.length}
- Unique signs: ${groupedSigns.length}
- Average confidence: ${Math.round(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length * 100)}%`

    if (primarySigns.length > 0) {
      transcript += `\n- Primary signs detected: ${primarySigns.map(s => s.sign.replace('_', ' ')).join(', ')}`
    }

    return transcript
  }

  const cleanup = () => {
    stopHandTracking()
    setIsRecording(false)
    setRecordingTime(0)

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (videoRef.current && streamRef.current) {
      const tracks = streamRef.current.getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
      streamRef.current = null
    }

    console.log('Cleaning up Sign2Text recorder...')
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Permission loading state
  if (hasPermission === null) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <div>
              <p className="text-muted-foreground mb-2">Initializing camera...</p>
              <p className="text-xs text-muted-foreground">
                {debugInfo || `Attempt ${initializationAttempts}: Getting camera access...`}
              </p>
            </div>
            
            {/* Debug information */}
            <div className="bg-muted/50 p-3 rounded text-xs space-y-1 max-w-sm mx-auto">
              <p><strong>Debug Info:</strong></p>
              <p>Browser: {navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Other'}</p>
              <p>HTTPS: {location.protocol === 'https:' ? 'Yes' : 'No'}</p>
              <p>MediaDevices: {!!navigator.mediaDevices ? 'Available' : 'Not available'}</p>
              <p>getUserMedia: {!!navigator.mediaDevices?.getUserMedia ? 'Available' : 'Not available'}</p>
              <p>Attempts: {initializationAttempts}</p>
              {error && <p className="text-destructive">Error: {error}</p>}
            </div>
            
            <div className="pt-4 space-y-2">
              {initializationAttempts > 2 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    console.log('User manually proceeding')
                    setHasPermission(true)
                    startHandTracking()
                    toast.success('Proceeding without full camera initialization')
                  }}
                >
                  Continue Anyway
                </Button>
              )}
              <div className="flex gap-2 justify-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={initializeCamera}
                >
                  Retry
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onClose}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Permission denied state
  if (hasPermission === false) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-destructive flex items-center justify-center gap-2">
            <Camera className="h-5 w-5" />
            Camera Access Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Sign2Text needs camera access to detect and interpret your sign language.
          </p>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-red-800 mb-2">Error Details:</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-800 mb-2">To enable camera access:</p>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>1. Look for a camera icon in your browser's address bar</li>
              <li>2. Click it and select "Allow" for camera permissions</li>
              <li>3. Refresh the page if needed</li>
              <li>4. Make sure no other applications are using your camera</li>
            </ul>
          </div>
          
          {/* Debug information for troubleshooting */}
          <div className="bg-muted/50 p-3 rounded text-xs space-y-1">
            <p><strong>Troubleshooting Info:</strong></p>
            <p>Browser: {navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Other'}</p>
            <p>Secure Context: {location.protocol === 'https:' || location.hostname === 'localhost' ? 'Yes' : 'No (camera requires HTTPS)'}</p>
            <p>MediaDevices API: {!!navigator.mediaDevices ? 'Available' : 'Not available'}</p>
            <p>getUserMedia API: {!!navigator.mediaDevices?.getUserMedia ? 'Available' : 'Not available'}</p>
            <p>Initialization attempts: {initializationAttempts}</p>
          </div>
          
          <div className="flex justify-center gap-3">
            <Button onClick={initializeCamera}>Try Again</Button>
            <Button 
              variant="outline" 
              onClick={() => {
                console.log('Forcing continue without camera')
                setHasPermission(true)
                toast.info('Continuing in demo mode without camera')
              }}
            >
              Demo Mode
            </Button>
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
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="animate-spin w-12 h-12 border-2 border-primary border-t-transparent rounded-full" />
          <h3 className="font-semibold mb-2">Processing Sign Language Video</h3>
          <p className="text-muted-foreground text-center">
            Analyzing {signPredictions.length} detected signs...
          </p>
          <Progress value={66} className="w-64" />
          <p className="text-xs text-muted-foreground">
            This may take a few moments
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <VideoCamera className="h-5 w-5" />
            Sign2Text - UK Sign Language Recognition
          </div>
          <div className="flex items-center gap-2">
            {isTracking && (
              <Badge variant="secondary">
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

export default Sign2TextRecorder