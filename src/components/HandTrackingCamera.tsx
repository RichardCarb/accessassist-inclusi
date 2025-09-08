import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VideoCamera, Hand, Activity, X, Play, Square } from '@phosphor-icons/react'
import { toast } from 'sonner'

// MediaPipe Hand tracking types
interface HandLandmark {
  x: number
  y: number
  z: number
}

interface HandResults {
  multiHandLandmarks?: HandLandmark[][]
  multiHandedness?: Array<{ 
    index: number
    score: number
    label: 'Left' | 'Right' 
  }>
}

interface DetectedHand {
  label: 'Left' | 'Right'
  landmarks: HandLandmark[]
  confidence: number
  boundingBox: { x: number, y: number, width: number, height: number }
}

interface RecognizedGesture {
  name: string
  confidence: number
  hand: 'Left' | 'Right'
  description: string
}

// MediaPipe instance interface
interface MediaPipeHands {
  initialize(): Promise<void>
  send(data: { image: HTMLVideoElement }): Promise<void>
  setOptions(options: any): void
  onResults(callback: (results: HandResults) => void): void
  close(): void
}

declare global {
  interface Window {
    Hands: new (config: { locateFile: (file: string) => string }) => MediaPipeHands
  }
}

interface HandTrackingCameraProps {
  onClose: () => void
}

export function HandTrackingCamera({ onClose }: HandTrackingCameraProps) {
  // Video and canvas refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // Camera state
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  
  // Tracking state
  const [handsModel, setHandsModel] = useState<MediaPipeHands | null>(null)
  const [modelLoading, setModelLoading] = useState(true)
  const [modelError, setModelError] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  
  // Detection results
  const [detectedHands, setDetectedHands] = useState<DetectedHand[]>([])
  const [recognizedGestures, setRecognizedGestures] = useState<RecognizedGesture[]>([])
  const [frameCount, setFrameCount] = useState(0)
  const [processingFps, setProcessingFps] = useState(0)
  
  // Animation frame ref
  const animationFrameRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)
  const fpsCounterRef = useRef<number>(0)

  // Initialize everything on mount
  useEffect(() => {
    initializeSystem()
    
    return () => {
      cleanup()
    }
  }, [])

  const initializeSystem = async () => {
    try {
      await initializeCamera()
      await loadMediaPipeModel()
    } catch (error) {
      console.error('System initialization failed:', error)
    }
  }

  const initializeCamera = async () => {
    try {
      console.log('🎥 Initializing camera...')
      setCameraError(null)
      
      // Check for browser support
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not supported in this browser')
      }

      // Request camera access
      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      }

      console.log('📱 Requesting camera with constraints:', constraints)
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // Set up video element
      if (videoRef.current) {
        const video = videoRef.current
        
        const onLoadedMetadata = () => {
          console.log(`📺 Video loaded: ${video.videoWidth}x${video.videoHeight}`)
          
          // Configure canvas to match video dimensions
          if (canvasRef.current) {
            canvasRef.current.width = video.videoWidth
            canvasRef.current.height = video.videoHeight
          }
          
          setCameraReady(true)
          setHasPermission(true)
        }

        const onVideoError = (e: Event) => {
          console.error('❌ Video error:', e)
          setCameraError('Video playback failed')
        }

        video.addEventListener('loadedmetadata', onLoadedMetadata)
        video.addEventListener('error', onVideoError)
        
        video.srcObject = mediaStream
        video.play()
      }
      
      setStream(mediaStream)
      toast.success('Camera initialized successfully')
      
    } catch (error: any) {
      console.error('❌ Camera initialization failed:', error)
      setHasPermission(false)
      
      let errorMessage = 'Camera access failed'
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is busy or unavailable'
      }
      
      setCameraError(errorMessage)
      toast.error(errorMessage)
    }
  }

  const loadMediaPipeModel = async () => {
    try {
      console.log('🧠 Loading MediaPipe Hands model...')
      setModelLoading(true)
      setModelError(null)

      // Load MediaPipe script
      if (!window.Hands) {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1696508789/hands.js')
        
        // Wait for script to initialize
        let attempts = 0
        while (!window.Hands && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }
        
        if (!window.Hands) {
          throw new Error('MediaPipe Hands library failed to load')
        }
      }

      // Initialize MediaPipe Hands
      const hands = new window.Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1696508789/${file}`
        }
      })

      // Configure MediaPipe options
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      })

      // Set up results callback
      hands.onResults(onHandsResults)
      
      // Initialize the model
      await hands.initialize()
      
      setHandsModel(hands)
      setModelLoading(false)
      
      console.log('✅ MediaPipe Hands model loaded successfully')
      toast.success('Hand tracking model loaded')
      
    } catch (error: any) {
      console.error('❌ MediaPipe model loading failed:', error)
      setModelError(error.message || 'Failed to load hand tracking model')
      setModelLoading(false)
      toast.error('Hand tracking model failed to load')
    }
  }

  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
      
      document.head.appendChild(script)
    })
  }

  const startTracking = useCallback(() => {
    if (!handsModel || !cameraReady || isTracking) {
      return
    }

    console.log('🔍 Starting hand tracking...')
    setIsTracking(true)
    setFrameCount(0)
    setProcessingFps(0)
    
    lastFrameTimeRef.current = performance.now()
    fpsCounterRef.current = 0
    
    const processFrame = async () => {
      if (!videoRef.current || !handsModel || !isTracking) {
        return
      }

      try {
        // Send frame to MediaPipe
        await handsModel.send({ image: videoRef.current })
        
        // Update frame counter and FPS
        const currentTime = performance.now()
        const deltaTime = currentTime - lastFrameTimeRef.current
        
        if (deltaTime >= 1000) { // Update FPS every second
          setProcessingFps(Math.round((fpsCounterRef.current * 1000) / deltaTime))
          fpsCounterRef.current = 0
          lastFrameTimeRef.current = currentTime
        } else {
          fpsCounterRef.current++
        }
        
        setFrameCount(prev => prev + 1)
        
      } catch (error) {
        console.error('Frame processing error:', error)
      }

      // Schedule next frame
      if (isTracking) {
        animationFrameRef.current = requestAnimationFrame(processFrame)
      }
    }

    processFrame()
    toast.success('Hand tracking started')
  }, [handsModel, cameraReady, isTracking])

  const stopTracking = useCallback(() => {
    console.log('⏹️ Stopping hand tracking...')
    setIsTracking(false)
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    // Clear detection results
    setDetectedHands([])
    setRecognizedGestures([])
    clearCanvas()
    
    toast.success('Hand tracking stopped')
  }, [])

  const onHandsResults = useCallback((results: HandResults) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      setDetectedHands([])
      setRecognizedGestures([])
      return
    }

    const hands: DetectedHand[] = []
    const gestures: RecognizedGesture[] = []

    // Process each detected hand
    results.multiHandLandmarks.forEach((landmarks, index) => {
      const handedness = results.multiHandedness?.[index]
      if (!handedness) return

      const label = handedness.label
      const confidence = handedness.score

      // Calculate bounding box
      const xs = landmarks.map(l => l.x)
      const ys = landmarks.map(l => l.y)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)

      const boundingBox = {
        x: minX * canvas.width,
        y: minY * canvas.height,
        width: (maxX - minX) * canvas.width,
        height: (maxY - minY) * canvas.height
      }

      hands.push({
        label,
        landmarks,
        confidence,
        boundingBox
      })

      // Draw hand visualization
      drawHandLandmarks(ctx, landmarks, label, canvas.width, canvas.height)
      
      // Recognize gestures
      const gesture = recognizeHandGesture(landmarks, label)
      if (gesture) {
        gestures.push(gesture)
      }
    })

    setDetectedHands(hands)
    setRecognizedGestures(gestures)
  }, [])

  const drawHandLandmarks = (
    ctx: CanvasRenderingContext2D,
    landmarks: HandLandmark[],
    handLabel: 'Left' | 'Right',
    canvasWidth: number,
    canvasHeight: number
  ) => {
    // Hand colors
    const colors = {
      Left: { primary: '#3B82F6', secondary: '#93C5FD' },
      Right: { primary: '#10B981', secondary: '#6EE7B7' }
    }
    const color = colors[handLabel]

    // MediaPipe hand connections
    const connections = [
      // Thumb
      [0, 1], [1, 2], [2, 3], [3, 4],
      // Index finger
      [0, 5], [5, 6], [6, 7], [7, 8],
      // Middle finger
      [0, 9], [9, 10], [10, 11], [11, 12],
      // Ring finger
      [0, 13], [13, 14], [14, 15], [15, 16],
      // Pinky
      [0, 17], [17, 18], [18, 19], [19, 20],
      // Palm connections
      [5, 9], [9, 13], [13, 17]
    ]

    // Draw connections
    ctx.strokeStyle = color.primary
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.8

    connections.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx]
      const end = landmarks[endIdx]
      
      if (start && end) {
        ctx.beginPath()
        ctx.moveTo(start.x * canvasWidth, start.y * canvasHeight)
        ctx.lineTo(end.x * canvasWidth, end.y * canvasHeight)
        ctx.stroke()
      }
    })

    // Draw landmarks
    ctx.globalAlpha = 1
    landmarks.forEach((landmark, index) => {
      const x = landmark.x * canvasWidth
      const y = landmark.y * canvasHeight
      
      // Different sizes for different landmark types
      let radius = 3
      if (index === 0) radius = 6 // Wrist
      else if ([4, 8, 12, 16, 20].includes(index)) radius = 5 // Fingertips
      
      // Draw landmark
      ctx.fillStyle = color.primary
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, 2 * Math.PI)
      ctx.fill()
      
      // Draw white center for better visibility
      ctx.fillStyle = 'white'
      ctx.beginPath()
      ctx.arc(x, y, radius - 1, 0, 2 * Math.PI)
      ctx.fill()
    })

    // Draw hand label
    const wrist = landmarks[0]
    if (wrist) {
      const labelX = wrist.x * canvasWidth
      const labelY = wrist.y * canvasHeight - 20
      
      ctx.fillStyle = color.primary
      ctx.font = 'bold 14px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(`${handLabel} Hand`, labelX, labelY)
    }
  }

  const recognizeHandGesture = (
    landmarks: HandLandmark[], 
    hand: 'Left' | 'Right'
  ): RecognizedGesture | null => {
    // Finger tip and pip (proximal interphalangeal joint) indices
    const fingerTips = [4, 8, 12, 16, 20] // Thumb, Index, Middle, Ring, Pinky
    const fingerPips = [3, 6, 10, 14, 18] // Finger pip joints
    
    const extendedFingers: boolean[] = []
    
    // Check which fingers are extended
    fingerTips.forEach((tipIndex, fingerIndex) => {
      if (fingerIndex === 0) {
        // Thumb: check horizontal distance
        const tip = landmarks[tipIndex]
        const pip = landmarks[fingerPips[fingerIndex]]
        const isExtended = Math.abs(tip.x - pip.x) > 0.04
        extendedFingers.push(isExtended)
      } else {
        // Other fingers: check vertical distance
        const tip = landmarks[tipIndex]
        const pip = landmarks[fingerPips[fingerIndex]]
        const isExtended = tip.y < pip.y - 0.02
        extendedFingers.push(isExtended)
      }
    })
    
    const extendedCount = extendedFingers.filter(Boolean).length
    
    // Gesture recognition logic
    if (extendedCount === 0) {
      return {
        name: 'Closed Fist',
        confidence: 0.95,
        hand,
        description: 'All fingers closed - strong gesture or emphasis'
      }
    }
    
    if (extendedCount === 1) {
      if (extendedFingers[1]) { // Index finger
        return {
          name: 'Point',
          confidence: 0.9,
          hand,
          description: 'Index finger pointing - directing attention'
        }
      }
      if (extendedFingers[0]) { // Thumb
        return {
          name: 'Thumbs Up',
          confidence: 0.85,
          hand,
          description: 'Thumb up - approval or positive gesture'
        }
      }
    }
    
    if (extendedCount === 2) {
      if (extendedFingers[1] && extendedFingers[2]) { // Index + Middle
        return {
          name: 'Peace Sign',
          confidence: 0.9,
          hand,
          description: 'Victory or peace gesture'
        }
      }
      if (extendedFingers[0] && extendedFingers[4]) { // Thumb + Pinky
        return {
          name: 'Shaka/Call Me',
          confidence: 0.85,
          hand,
          description: 'Hang loose or call me gesture'
        }
      }
    }
    
    if (extendedCount === 5) {
      return {
        name: 'Open Hand',
        confidence: 0.95,
        hand,
        description: 'Open palm - greeting, stop, or showing gesture'
      }
    }
    
    if (extendedCount >= 3) {
      return {
        name: `${extendedCount} Fingers`,
        confidence: 0.8,
        hand,
        description: `${extendedCount} fingers extended - counting or emphasis`
      }
    }
    
    return null
  }

  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
  }

  const cleanup = () => {
    console.log('🧹 Cleaning up hand tracking system...')
    
    // Stop tracking
    setIsTracking(false)
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    // Close MediaPipe model
    if (handsModel) {
      handsModel.close()
      setHandsModel(null)
    }
    
    // Stop camera stream
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop()
        console.log('📷 Camera track stopped')
      })
      setStream(null)
    }
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    // Clear detection results
    setDetectedHands([])
    setRecognizedGestures([])
    clearCanvas()
  }

  const retryInitialization = () => {
    cleanup()
    
    // Reset state
    setHasPermission(null)
    setCameraReady(false)
    setCameraError(null)
    setModelLoading(true)
    setModelError(null)
    setFrameCount(0)
    setProcessingFps(0)
    
    // Reinitialize
    initializeSystem()
  }

  // Loading state
  if (hasPermission === null || modelLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
          <h3 className="font-semibold mb-2">Initializing Hand Tracking System</h3>
          <p className="text-muted-foreground mb-4">
            Setting up MediaPipe Hands model and camera access...
          </p>
          <div className="text-sm space-y-1">
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${hasPermission ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span>Camera: {hasPermission ? 'Ready' : 'Initializing...'}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${!modelLoading ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span>MediaPipe: {!modelLoading ? 'Ready' : 'Loading...'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (hasPermission === false || cameraError || modelError) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <X className="h-5 w-5" />
            Hand Tracking System Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cameraError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-red-800">Camera Error:</p>
              <p className="text-sm text-red-700">{cameraError}</p>
            </div>
          )}
          
          {modelError && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm font-medium text-orange-800">MediaPipe Error:</p>
              <p className="text-sm text-orange-700">{modelError}</p>
            </div>
          )}
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800 mb-2">Troubleshooting:</p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Check camera permissions in your browser</li>
              <li>• Ensure no other apps are using the camera</li>
              <li>• Verify you're using HTTPS or localhost</li>
              <li>• Try refreshing the page</li>
              <li>• Check your internet connection for MediaPipe model</li>
            </ul>
          </div>
          
          <div className="flex gap-2 justify-center">
            <Button onClick={retryInitialization}>
              <VideoCamera className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Main tracking interface
  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hand className="h-5 w-5" />
            MediaPipe Hand Tracking System
          </div>
          <div className="flex items-center gap-2">
            {isTracking && (
              <Badge variant="default" className="animate-pulse">
                <Activity className="h-3 w-3 mr-1" />
                Live ({processingFps} fps)
              </Badge>
            )}
            <Badge variant="secondary">
              {detectedHands.length}/2 Hands
            </Badge>
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Real-time computer vision hand tracking with gesture recognition using Google's MediaPipe
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Video Display with Overlay */}
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-video object-cover"
          />
          
          {/* Hand tracking overlay canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
          
          {/* Status indicators */}
          <div className="absolute top-4 left-4 space-y-2">
            {detectedHands.map((hand, index) => (
              <Badge
                key={`${hand.label}-${index}`}
                variant="default"
                className={`${
                  hand.label === 'Left' 
                    ? 'bg-blue-500 hover:bg-blue-600' 
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {hand.label} Hand ({Math.round(hand.confidence * 100)}%)
              </Badge>
            ))}
          </div>
          
          {/* Gesture indicators */}
          {recognizedGestures.length > 0 && (
            <div className="absolute top-4 right-4 space-y-1">
              {recognizedGestures.map((gesture, index) => (
                <Badge
                  key={`${gesture.hand}-${gesture.name}-${index}`}
                  variant="outline"
                  className="bg-purple-500 text-white border-purple-400"
                >
                  {gesture.name} ({Math.round(gesture.confidence * 100)}%)
                </Badge>
              ))}
            </div>
          )}
          
          {/* Frame counter */}
          <div className="absolute bottom-4 left-4">
            <Badge variant="outline" className="bg-black/50 text-white border-white/20">
              Frame: {frameCount}
            </Badge>
          </div>
        </div>

        {/* Detection Results Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Detected Hands Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Hand className="h-4 w-4" />
                Detected Hands
              </CardTitle>
            </CardHeader>
            <CardContent>
              {detectedHands.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">No hands detected</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Show your hands to the camera
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {detectedHands.map((hand, index) => (
                    <div key={`hand-${index}`} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            hand.label === 'Left' ? 'bg-blue-500' : 'bg-green-500'
                          }`} />
                          <span className="font-medium">{hand.label} Hand</span>
                        </div>
                        <Badge variant="outline">
                          {Math.round(hand.confidence * 100)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>Landmarks: {hand.landmarks.length}</div>
                        <div>
                          Size: {Math.round(hand.boundingBox.width)}×{Math.round(hand.boundingBox.height)}px
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Recognized Gestures Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Recognized Gestures
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recognizedGestures.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">No gestures recognized</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try making gestures like peace sign, thumbs up, or pointing
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recognizedGestures.map((gesture, index) => (
                    <div key={`gesture-${index}`} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            gesture.hand === 'Left' ? 'bg-blue-500' : 'bg-green-500'
                          }`} />
                          <span className="font-medium">{gesture.name}</span>
                          <span className="text-xs text-muted-foreground">({gesture.hand})</span>
                        </div>
                        <Badge variant="outline">
                          {Math.round(gesture.confidence * 100)}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {gesture.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* System Performance Panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">System Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className="font-medium flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500' : 'bg-gray-400'}`} />
                  {isTracking ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Processing FPS:</span>
                <p className="font-medium">{processingFps}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Frames Processed:</span>
                <p className="font-medium">{frameCount.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Hands Tracked:</span>
                <p className="font-medium">{detectedHands.length} / 2</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium mb-2 text-blue-800">How to Test Hand Tracking</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <p className="font-medium mb-1">Basic Gestures:</p>
              <ul className="space-y-1">
                <li>• Closed fist</li>
                <li>• Open palm</li>
                <li>• Pointing (index finger)</li>
                <li>• Thumbs up</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">Advanced Gestures:</p>
              <ul className="space-y-1">
                <li>• Peace sign (V)</li>
                <li>• Shaka/Call me (thumb + pinky)</li>
                <li>• Counting (multiple fingers)</li>
                <li>• Try both hands simultaneously</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center">
          {!isTracking ? (
            <Button onClick={startTracking} disabled={!cameraReady || !handsModel}>
              <Play className="h-4 w-4 mr-2" />
              Start Tracking
            </Button>
          ) : (
            <Button onClick={stopTracking} variant="destructive">
              <Square className="h-4 w-4 mr-2" />
              Stop Tracking
            </Button>
          )}
          
          <Button variant="outline" onClick={retryInitialization}>
            <VideoCamera className="h-4 w-4 mr-2" />
            Reset System
          </Button>
          
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}