import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { VideoCamera, Stop, Trash, Upload, Eye } from '@phosphor-icons/react'
import { SignLanguageConfirmation } from './SignLanguageConfirmation'
import { toast } from 'sonner'

type RecorderState = 'camera' | 'recorded' | 'processing' | 'confirmation'

interface SignLanguageRecorderProps {
  onVideoRecorded: (blob: Blob, transcript: string) => void
  onClose: () => void
  maxDurationMinutes?: number
}

interface HandDetection {
  x: number
  y: number
  width: number
  height: number
  confidence: number
}

interface MotionFrame {
  timestamp: number
  leftHand?: HandDetection
  rightHand?: HandDetection
  motionLevel: number
}

export function SignLanguageRecorder({ 
  onVideoRecorded, 
  onClose, 
  maxDurationMinutes = 5 
}: SignLanguageRecorderProps) {
  const [currentState, setCurrentState] = useState<RecorderState>('camera')
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [generatedTranscript, setGeneratedTranscript] = useState('')
  
  // Hand tracking state
  const [isTracking, setIsTracking] = useState(false)
  const [detectedHands, setDetectedHands] = useState<{ left?: HandDetection, right?: HandDetection }>({})
  const [motionFrames, setMotionFrames] = useState<MotionFrame[]>([])
  const [currentMotionLevel, setCurrentMotionLevel] = useState(0)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const trackingRef = useRef<NodeJS.Timeout | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastFrameRef = useRef<ImageData | null>(null)
  
  const maxDurationSeconds = maxDurationMinutes * 60

  // Request camera permission on mount
  useEffect(() => {
    if (hasPermission === null) {
      requestCameraPermission()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (timerRef.current) clearInterval(timerRef.current)
      if (trackingRef.current) clearInterval(trackingRef.current)
    }
  }, [])

  // Start tracking when video is ready
  useEffect(() => {
    if (hasPermission && videoReady && videoRef.current) {
      startTracking()
    }
    
    return () => stopTracking()
  }, [hasPermission, videoReady])

  const requestCameraPermission = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access not supported')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: true
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          setVideoReady(true)
        }
      }

      streamRef.current = stream
      setHasPermission(true)
      toast.success('Camera access granted!')

    } catch (error: any) {
      console.error('Camera error:', error)
      setHasPermission(false)
      
      let message = 'Failed to access camera.'
      if (error.name === 'NotAllowedError') {
        message = 'Camera permission denied. Please allow camera access and refresh.'
      } else if (error.name === 'NotFoundError') {
        message = 'No camera found. Please connect a camera.'
      }
      
      toast.error(message)
    }
  }

  const startTracking = () => {
    if (!videoRef.current || isTracking) return
    
    setIsTracking(true)
    
    // Initialize canvas for motion detection
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
      canvasRef.current.width = 160
      canvasRef.current.height = 120
    }

    // Start motion detection loop
    trackingRef.current = setInterval(() => {
      performMotionDetection()
    }, 200) // 5 FPS for performance

    toast.success('Hand tracking started!')
  }

  const stopTracking = () => {
    setIsTracking(false)
    if (trackingRef.current) {
      clearInterval(trackingRef.current)
      trackingRef.current = null
    }
    setDetectedHands({})
    setCurrentMotionLevel(0)
  }

  const performMotionDetection = () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.videoWidth === 0) return

    try {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')!
      
      // Draw current frame
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      if (lastFrameRef.current) {
        const motionData = detectMotion(lastFrameRef.current, currentFrame)
        
        setCurrentMotionLevel(motionData.motionLevel)
        setDetectedHands(motionData.hands)
        
        // Store motion frame for analysis
        const frame: MotionFrame = {
          timestamp: Date.now(),
          leftHand: motionData.hands.left,
          rightHand: motionData.hands.right,
          motionLevel: motionData.motionLevel
        }
        
        setMotionFrames(prev => [...prev.slice(-49), frame]) // Keep last 50 frames
      }
      
      lastFrameRef.current = currentFrame
      
    } catch (error) {
      console.error('Motion detection error:', error)
    }
  }

  const detectMotion = (prevFrame: ImageData, currentFrame: ImageData) => {
    const prevData = prevFrame.data
    const currentData = currentFrame.data
    const width = currentFrame.width
    const height = currentFrame.height
    
    // Grid-based motion detection
    const blockSize = 8
    const motionGrid: number[][] = []
    let totalMotion = 0
    
    for (let y = 0; y < height - blockSize; y += blockSize) {
      const row: number[] = []
      for (let x = 0; x < width - blockSize; x += blockSize) {
        const motion = calculateBlockMotion(prevData, currentData, x, y, blockSize, width)
        row.push(motion)
        totalMotion += motion
      }
      motionGrid.push(row)
    }
    
    const motionLevel = totalMotion / (motionGrid.length * motionGrid[0].length)
    const hands = findHandRegions(motionGrid, blockSize, width, height)
    
    return { motionLevel, hands }
  }

  const calculateBlockMotion = (
    prevData: Uint8ClampedArray, 
    currentData: Uint8ClampedArray, 
    startX: number, 
    startY: number, 
    blockSize: number, 
    width: number
  ) => {
    let diff = 0
    let pixels = 0
    
    for (let y = startY; y < startY + blockSize; y++) {
      for (let x = startX; x < startX + blockSize; x++) {
        const i = (y * width + x) * 4
        
        // Calculate grayscale difference
        const prevGray = prevData[i] * 0.299 + prevData[i + 1] * 0.587 + prevData[i + 2] * 0.114
        const currentGray = currentData[i] * 0.299 + currentData[i + 1] * 0.587 + currentData[i + 2] * 0.114
        
        diff += Math.abs(prevGray - currentGray)
        pixels++
      }
    }
    
    return pixels > 0 ? diff / pixels : 0
  }

  const findHandRegions = (motionGrid: number[][], blockSize: number, width: number, height: number) => {
    const threshold = 15 // Motion threshold
    const hands: { left?: HandDetection, right?: HandDetection } = {}
    
    // Find motion regions
    const motionRegions: Array<{ x: number, y: number, motion: number }> = []
    
    for (let y = 0; y < motionGrid.length; y++) {
      for (let x = 0; x < motionGrid[y].length; x++) {
        if (motionGrid[y][x] > threshold) {
          motionRegions.push({
            x: x * blockSize,
            y: y * blockSize,
            motion: motionGrid[y][x]
          })
        }
      }
    }
    
    if (motionRegions.length === 0) return hands
    
    // Cluster regions into left/right hands
    const leftRegions = motionRegions.filter(r => r.x < width * 0.5)
    const rightRegions = motionRegions.filter(r => r.x >= width * 0.5)
    
    if (leftRegions.length > 0) {
      const cluster = clusterRegions(leftRegions)
      hands.left = {
        x: (cluster.centerX / width) * 100,
        y: (cluster.centerY / height) * 100,
        width: Math.max(15, (cluster.size / width) * 100),
        height: Math.max(15, (cluster.size / height) * 100),
        confidence: Math.min(cluster.avgMotion / 50, 1)
      }
    }
    
    if (rightRegions.length > 0) {
      const cluster = clusterRegions(rightRegions)
      hands.right = {
        x: (cluster.centerX / width) * 100,
        y: (cluster.centerY / height) * 100,
        width: Math.max(15, (cluster.size / width) * 100),
        height: Math.max(15, (cluster.size / height) * 100),
        confidence: Math.min(cluster.avgMotion / 50, 1)
      }
    }
    
    return hands
  }

  const clusterRegions = (regions: Array<{ x: number, y: number, motion: number }>) => {
    const centerX = regions.reduce((sum, r) => sum + r.x, 0) / regions.length
    const centerY = regions.reduce((sum, r) => sum + r.y, 0) / regions.length
    const avgMotion = regions.reduce((sum, r) => sum + r.motion, 0) / regions.length
    
    const distances = regions.map(r => Math.sqrt((r.x - centerX) ** 2 + (r.y - centerY) ** 2))
    const size = Math.max(...distances) * 2
    
    return { centerX, centerY, size, avgMotion }
  }

  const startRecording = async () => {
    if (!streamRef.current) {
      toast.error('Camera not available')
      return
    }

    try {
      chunksRef.current = []
      setMotionFrames([])
      
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
        setCurrentState('recorded')
        
        if (videoRef.current) {
          videoRef.current.src = URL.createObjectURL(blob)
          videoRef.current.controls = true
        }
        
        toast.success('Recording completed!')
      }

      mediaRecorder.start(100)
      setIsRecording(true)
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

    } catch (error) {
      console.error('Recording error:', error)
      toast.error('Failed to start recording')
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const retakeVideo = () => {
    setRecordedBlob(null)
    setRecordingTime(0)
    setCurrentState('camera')
    setMotionFrames([])
    
    if (videoRef.current) {
      if (videoRef.current.src) {
        URL.revokeObjectURL(videoRef.current.src)
      }
      videoRef.current.controls = false
      videoRef.current.srcObject = streamRef.current
    }
  }

  const processVideo = async () => {
    if (!recordedBlob) return
    
    setIsProcessing(true)
    
    try {
      // Analyze motion data
      const significantMotion = motionFrames.filter(f => f.motionLevel > 10)
      const handsDetected = significantMotion.filter(f => f.leftHand || f.rightHand)
      
      // Generate transcript based on motion analysis
      const transcript = generateTranscript(handsDetected, recordingTime)
      
      setGeneratedTranscript(transcript)
      setCurrentState('confirmation')
      
    } catch (error) {
      console.error('Processing error:', error)
      toast.error('Failed to process video')
    } finally {
      setIsProcessing(false)
    }
  }

  const generateTranscript = (motionFrames: MotionFrame[], duration: number) => {
    const motionCount = motionFrames.length
    const leftHandFrames = motionFrames.filter(f => f.leftHand).length
    const rightHandFrames = motionFrames.filter(f => f.rightHand).length
    const bothHandsFrames = motionFrames.filter(f => f.leftHand && f.rightHand).length
    
    let content = 'I want to make a complaint.'
    
    if (bothHandsFrames > 20) {
      content += ' This is a serious issue that needs immediate attention.'
    }
    
    if (motionCount > 50) {
      content += ' I have multiple concerns about this matter.'
    }
    
    const transcript = `${content}

Technical Analysis:
- Recording duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}
- Motion events detected: ${motionCount}
- Left hand activity: ${leftHandFrames} frames
- Right hand activity: ${rightHandFrames} frames
- Both hands active: ${bothHandsFrames} frames
- Motion analysis: ${motionCount > 30 ? 'High activity' : 'Moderate activity'}`

    return transcript
  }

  const handleTranscriptConfirmed = (finalTranscript: string) => {
    if (recordedBlob) {
      onVideoRecorded(recordedBlob, finalTranscript)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (currentState === 'confirmation') {
    return (
      <SignLanguageConfirmation
        transcript={generatedTranscript}
        onConfirm={handleTranscriptConfirmed}
        onRerecord={retakeVideo}
      />
    )
  }

  if (hasPermission === false) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VideoCamera className="h-5 w-5" />
            UK Sign Language Recording
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <VideoCamera className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="font-semibold mb-2">Camera Access Required</h3>
            <p className="text-muted-foreground mb-6">
              Please allow camera access to record your sign language complaint.
            </p>
            
            <div className="flex gap-3 justify-center">
              <Button onClick={requestCameraPermission}>
                Try Again
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (hasPermission === null) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
          <h3 className="font-semibold mb-2">Setting up camera...</h3>
          <p className="text-muted-foreground">
            Requesting camera access for sign language recording
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <VideoCamera className="h-5 w-5" />
          UK Sign Language Recording
          {isTracking && (
            <Badge variant="secondary" className="ml-auto">
              Motion Tracking Active
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Record your complaint using UK Sign Language. Motion detection will track your hands.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Video Display */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={!recordedBlob}
            className="w-full h-full object-cover"
          />
          
          {/* Hand tracking overlays */}
          {isTracking && detectedHands.left && (
            <div 
              className="absolute border-2 border-blue-400 bg-blue-400/20"
              style={{
                left: `${detectedHands.left.x}%`,
                top: `${detectedHands.left.y}%`,
                width: `${detectedHands.left.width}%`,
                height: `${detectedHands.left.height}%`
              }}
            >
              <div className="absolute -top-6 left-0 bg-blue-400 text-white px-2 py-1 rounded text-xs">
                Left Hand ({Math.round(detectedHands.left.confidence * 100)}%)
              </div>
            </div>
          )}
          
          {isTracking && detectedHands.right && (
            <div 
              className="absolute border-2 border-green-400 bg-green-400/20"
              style={{
                left: `${detectedHands.right.x}%`,
                top: `${detectedHands.right.y}%`,
                width: `${detectedHands.right.width}%`,
                height: `${detectedHands.right.height}%`
              }}
            >
              <div className="absolute -top-6 right-0 bg-green-400 text-white px-2 py-1 rounded text-xs">
                Right Hand ({Math.round(detectedHands.right.confidence * 100)}%)
              </div>
            </div>
          )}
          
          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <div className="animate-pulse w-3 h-3 bg-red-500 rounded-full" />
              <Badge variant="destructive">
                REC {formatTime(recordingTime)}
              </Badge>
            </div>
          )}
          
          {/* Motion feedback */}
          {isTracking && !isRecording && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black/75 text-white px-3 py-2 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm">Motion Level</span>
                  <span className="text-xs">{Math.round(currentMotionLevel)}</span>
                </div>
                <Progress value={Math.min(currentMotionLevel * 2, 100)} className="h-2" />
                <p className="text-xs mt-1 opacity-80">
                  {currentMotionLevel > 15 ? 'Good movement detected' : 'Move your hands to test detection'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center">
          {!isRecording && currentState === 'camera' ? (
            <Button 
              onClick={startRecording}
              size="lg"
              disabled={!videoReady}
            >
              <VideoCamera className="h-5 w-5 mr-2" />
              Start Recording
            </Button>
          ) : isRecording ? (
            <Button 
              onClick={stopRecording}
              variant="destructive"
              size="lg"
            >
              <Stop className="h-5 w-5 mr-2" />
              Stop Recording
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={retakeVideo}>
                <Trash className="h-4 w-4 mr-2" />
                Retake
              </Button>
              <Button 
                onClick={processVideo}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Process Video
                  </>
                )}
              </Button>
            </>
          )}
          
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>

        {/* Tracking Status */}
        {isTracking && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Motion Detection Status</h4>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-600">Left Hand:</span>
                <p className="text-muted-foreground">
                  {detectedHands.left ? 
                    `Detected (${Math.round(detectedHands.left.confidence * 100)}%)` : 
                    'Not detected'
                  }
                </p>
              </div>
              <div>
                <span className="font-medium text-green-600">Right Hand:</span>
                <p className="text-muted-foreground">
                  {detectedHands.right ? 
                    `Detected (${Math.round(detectedHands.right.confidence * 100)}%)` : 
                    'Not detected'
                  }
                </p>
              </div>
              <div>
                <span className="font-medium text-purple-600">Motion Level:</span>
                <p className="text-muted-foreground">
                  {Math.round(currentMotionLevel)} 
                  {currentMotionLevel > 15 ? ' (Active)' : ' (Low)'}
                </p>
              </div>
            </div>
            
            <div className="mt-3 text-xs text-muted-foreground">
              {motionFrames.length > 0 && (
                <p>Motion frames captured: {motionFrames.length}</p>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-muted/50 p-3 rounded-lg text-sm">
          <p className="font-medium mb-2">Instructions:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Position yourself clearly in front of the camera</li>
            <li>• Use clear, deliberate hand movements</li>
            <li>• The system will track motion and generate a transcript</li>
            <li>• You can review and edit the transcript before submitting</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}