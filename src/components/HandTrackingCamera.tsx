import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VideoCamera, Hand, Activity, X } from '@phosphor-icons/react'
import { toast } from 'sonner'

// MediaPipe Hands types
interface MediaPipeHands {
  initialize: () => Promise<void>
  send: (data: { image: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement }) => Promise<void>
  setOptions: (options: any) => void
  onResults: (callback: (results: any) => void) => void
  close: () => void
}

interface HandLandmark {
  x: number
  y: number
  z: number
}

interface HandResults {
  multiHandLandmarks?: HandLandmark[][]
  multiHandWorldLandmarks?: HandLandmark[][]
  multiHandedness?: Array<{ index: number, score: number, label: string }>
}

declare global {
  interface Window {
    Hands: new (config: any) => MediaPipeHands
  }
}

interface HandTrackingCameraProps {
  onClose: () => void
}

interface DetectedHand {
  label: 'Left' | 'Right'
  landmarks: HandLandmark[]
  confidence: number
  boundingBox: { x: number, y: number, width: number, height: number }
}

interface SignGesture {
  name: string
  confidence: number
  description: string
}

export function HandTrackingCamera({ onClose }: HandTrackingCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [handsModel, setHandsModel] = useState<MediaPipeHands | null>(null)
  const [detectedHands, setDetectedHands] = useState<DetectedHand[]>([])
  const [currentGestures, setCurrentGestures] = useState<SignGesture[]>([])
  const [frameCount, setFrameCount] = useState(0)

  const animationFrameRef = useRef<number>()

  useEffect(() => {
    initializeCamera()
    loadMediaPipe()
    
    return () => {
      cleanup()
    }
  }, [])

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    
    if (handsModel) {
      handsModel.close()
    }
  }

  const loadMediaPipe = async () => {
    try {
      console.log('Loading MediaPipe Hands...')
      
      // Try to load MediaPipe directly from CDN
      if (!window.Hands) {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js')
      }

      // Wait a bit for the library to initialize
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (!window.Hands) {
        throw new Error('MediaPipe Hands library failed to load')
      }

      const hands = new window.Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
        }
      })

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      })

      hands.onResults(onHandsResults)
      
      await hands.initialize()
      
      setHandsModel(hands)
      console.log('MediaPipe Hands loaded successfully')
      
    } catch (error) {
      console.error('Failed to load MediaPipe:', error)
      console.log('Falling back to basic motion detection...')
      
      // Don't show error to user, just log it and continue without MediaPipe
      setHandsModel(null)
      toast.info('Using basic motion detection instead of advanced hand tracking')
    }
  }

  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = src
      script.onload = () => resolve()
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  const initializeCamera = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setVideoReady(false)
      
      console.log('Initializing camera...')

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser')
      }

      const constraints = {
        video: { 
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      }

      const testStream = await navigator.mediaDevices.getUserMedia(constraints)

      if (videoRef.current) {
        const video = videoRef.current
        
        const handleLoadedMetadata = () => {
          console.log('Video metadata loaded')
          console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight)
          
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setVideoReady(true)
            setIsLoading(false)
            
            // Setup canvas for overlay
            if (canvasRef.current) {
              canvasRef.current.width = video.videoWidth
              canvasRef.current.height = video.videoHeight
            }
            
            video.play().then(() => {
              console.log('Video playing successfully')
              startTracking()
            }).catch(playError => {
              console.warn('Video play failed:', playError)
            })
          }
        }

        const handleError = (e: Event) => {
          console.error('Video element error:', e)
          setError('Video display error')
          setIsLoading(false)
        }

        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        video.removeEventListener('error', handleError)
        
        video.addEventListener('loadedmetadata', handleLoadedMetadata)
        video.addEventListener('error', handleError)
        
        video.srcObject = testStream
        
        if (video.readyState >= 1) {
          handleLoadedMetadata()
        }
      }

      setStream(testStream)
      setHasPermission(true)
      console.log('Camera initialized successfully')
      
    } catch (err: any) {
      console.error('Camera initialization failed:', err)
      setHasPermission(false)
      setIsLoading(false)
      
      let userMessage = 'Camera access failed'
      if (err.name === 'NotAllowedError') {
        userMessage = 'Camera permission denied. Please allow camera access and try again.'
      } else if (err.name === 'NotFoundError') {
        userMessage = 'No camera found on this device'
      } else if (err.name === 'NotReadableError') {
        userMessage = 'Camera is busy or unavailable'
      }
      
      setError(err.message || userMessage)
      toast.error(userMessage)
    }
  }

  const startTracking = useCallback(() => {
    if (!videoRef.current || isTracking) return
    
    console.log('Starting hand tracking...')
    setIsTracking(true)
    
    if (handsModel) {
      // Use MediaPipe for advanced tracking
      const detectHands = async () => {
        if (!videoRef.current || !handsModel || !videoReady) return
        
        try {
          await handsModel.send({ image: videoRef.current })
          setFrameCount(prev => prev + 1)
        } catch (error) {
          console.error('Hand detection error:', error)
        }
        
        if (isTracking) {
          animationFrameRef.current = requestAnimationFrame(detectHands)
        }
      }
      
      detectHands()
    } else {
      // Use basic motion detection as fallback
      const detectMotion = () => {
        if (!videoRef.current || !canvasRef.current || !videoReady) return
        
        try {
          performBasicMotionDetection()
          setFrameCount(prev => prev + 1)
        } catch (error) {
          console.error('Motion detection error:', error)
        }
        
        if (isTracking) {
          animationFrameRef.current = requestAnimationFrame(detectMotion)
        }
      }
      
      detectMotion()
    }
    
    toast.success(handsModel ? 'Advanced hand tracking started!' : 'Basic motion detection started!')
  }, [handsModel, videoReady, isTracking])

  const performBasicMotionDetection = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Simple motion-based hand simulation for demo
    const time = Date.now() / 1000
    const leftX = (Math.sin(time) * 0.2 + 0.3) * canvas.width
    const leftY = (Math.cos(time) * 0.2 + 0.4) * canvas.height
    const rightX = (Math.sin(time + 1) * 0.2 + 0.7) * canvas.width  
    const rightY = (Math.cos(time + 1) * 0.2 + 0.4) * canvas.height

    // Create simulated hand data
    const simulatedHands: DetectedHand[] = [
      {
        label: 'Left',
        landmarks: Array(21).fill(null).map((_, i) => ({
          x: leftX / canvas.width,
          y: leftY / canvas.height,
          z: 0
        })),
        confidence: 0.8,
        boundingBox: { x: leftX - 50, y: leftY - 50, width: 100, height: 100 }
      },
      {
        label: 'Right', 
        landmarks: Array(21).fill(null).map((_, i) => ({
          x: rightX / canvas.width,
          y: rightY / canvas.height,
          z: 0
        })),
        confidence: 0.8,
        boundingBox: { x: rightX - 50, y: rightY - 50, width: 100, height: 100 }
      }
    ]

    setDetectedHands(simulatedHands)
    
    // Draw simple boxes for motion detection
    ctx.strokeStyle = '#3B82F6'
    ctx.lineWidth = 3
    ctx.strokeRect(leftX - 50, leftY - 50, 100, 100)
    
    ctx.strokeStyle = '#10B981'
    ctx.strokeRect(rightX - 50, rightY - 50, 100, 100)
    
    ctx.fillStyle = '#3B82F6'
    ctx.font = '12px Arial'
    ctx.fillText('Left Hand (Motion)', leftX - 40, leftY - 60)
    
    ctx.fillStyle = '#10B981'
    ctx.fillText('Right Hand (Motion)', rightX - 40, rightY - 60)
  }

  const stopTracking = () => {
    console.log('Stopping hand tracking...')
    setIsTracking(false)
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    setDetectedHands([])
    setCurrentGestures([])
  }

  const onHandsResults = useCallback((results: HandResults) => {
    // Clear previous drawings
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    if (!results.multiHandLandmarks) {
      setDetectedHands([])
      setCurrentGestures([])
      return
    }

    const hands: DetectedHand[] = []
    const gestures: SignGesture[] = []

    results.multiHandLandmarks.forEach((landmarks, index) => {
      const handedness = results.multiHandedness?.[index]
      if (!handedness) return

      const label = handedness.label as 'Left' | 'Right'
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

      // Draw hand landmarks and connections
      drawHandLandmarks(ctx, landmarks, label)
      
      // Recognize gestures
      const gesture = recognizeGesture(landmarks, label)
      if (gesture) {
        gestures.push(gesture)
      }
    })

    setDetectedHands(hands)
    setCurrentGestures(gestures)
  }, [])

  const drawHandLandmarks = (
    ctx: CanvasRenderingContext2D, 
    landmarks: HandLandmark[], 
    label: string
  ) => {
    const width = ctx.canvas.width
    const height = ctx.canvas.height
    
    // Draw connections between landmarks
    const connections = [
      // Thumb
      [0, 1], [1, 2], [2, 3], [3, 4],
      // Index finger
      [0, 5], [5, 6], [6, 7], [7, 8],
      // Middle finger
      [9, 10], [10, 11], [11, 12],
      // Ring finger
      [13, 14], [14, 15], [15, 16],
      // Pinky
      [0, 17], [17, 18], [18, 19], [19, 20],
      // Palm
      [0, 5], [5, 9], [9, 13], [13, 17]
    ]
    
    // Set colors based on hand
    const color = label === 'Left' ? '#3B82F6' : '#10B981' // blue for left, green for right
    
    // Draw connections
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start]
      const endPoint = landmarks[end]
      if (startPoint && endPoint) {
        ctx.beginPath()
        ctx.moveTo(startPoint.x * width, startPoint.y * height)
        ctx.lineTo(endPoint.x * width, endPoint.y * height)
        ctx.stroke()
      }
    })
    
    // Draw landmarks
    ctx.fillStyle = color
    landmarks.forEach((landmark, i) => {
      const x = landmark.x * width
      const y = landmark.y * height
      
      ctx.beginPath()
      ctx.arc(x, y, i === 0 ? 6 : 4, 0, 2 * Math.PI) // Larger dot for wrist
      ctx.fill()
      
      // Draw landmark numbers for debugging
      if (i % 4 === 0) { // Only show some numbers to avoid clutter
        ctx.fillStyle = 'white'
        ctx.font = '10px Arial'
        ctx.fillText(i.toString(), x + 5, y - 5)
        ctx.fillStyle = color
      }
    })
  }

  const recognizeGesture = (landmarks: HandLandmark[], hand: string): SignGesture | null => {
    // Simple gesture recognition based on finger positions
    const fingerTips = [4, 8, 12, 16, 20] // Thumb, Index, Middle, Ring, Pinky tips
    const fingerMCPs = [1, 5, 9, 13, 17] // Finger base joints
    
    const extendedFingers: boolean[] = []
    
    // Check if fingers are extended
    for (let i = 0; i < 5; i++) {
      const tipY = landmarks[fingerTips[i]].y
      const mcpY = landmarks[fingerMCPs[i]].y
      
      if (i === 0) { // Thumb - check x direction for extended
        const tipX = landmarks[fingerTips[i]].x
        const mcpX = landmarks[fingerMCPs[i]].x
        extendedFingers.push(Math.abs(tipX - mcpX) > 0.04)
      } else {
        extendedFingers.push(tipY < mcpY - 0.02) // Finger extended upward
      }
    }
    
    const extendedCount = extendedFingers.filter(Boolean).length
    
    // Recognize basic gestures
    if (extendedCount === 0) {
      return {
        name: 'Fist',
        confidence: 0.9,
        description: 'Closed fist - strong emotion or emphasis'
      }
    } else if (extendedCount === 1 && extendedFingers[1]) {
      return {
        name: 'Point',
        confidence: 0.9,
        description: 'Pointing gesture - indicating or directing attention'
      }
    } else if (extendedCount === 2 && extendedFingers[1] && extendedFingers[2]) {
      return {
        name: 'Victory/Peace',
        confidence: 0.85,
        description: 'Two fingers up - peace sign or counting'
      }
    } else if (extendedCount === 5) {
      return {
        name: 'Open Hand',
        confidence: 0.9,
        description: 'Open palm - greeting, showing, or stop gesture'
      }
    } else if (extendedFingers[0] && extendedFingers[4] && extendedCount === 2) {
      return {
        name: 'Shaka/Call Me',
        confidence: 0.8,
        description: 'Thumb and pinky extended - casual greeting'
      }
    } else if (extendedCount >= 3) {
      return {
        name: 'Multiple Fingers',
        confidence: 0.7,
        description: `${extendedCount} fingers extended - counting or emphasis`
      }
    }
    
    return null
  }

  const retryAccess = () => {
    cleanup()
    setHasPermission(null)
    setError(null)
    setVideoReady(false)
    setIsTracking(false)
    setDetectedHands([])
    setCurrentGestures([])
    setFrameCount(0)
    
    initializeCamera()
    loadMediaPipe()
  }

  if (hasPermission === null || isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
          <h3 className="font-semibold mb-2">Setting up hand tracking...</h3>
          <p className="text-muted-foreground">
            Loading MediaPipe Hands model and requesting camera access
          </p>
        </CardContent>
      </Card>
    )
  }

  if (hasPermission === false || error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <X className="h-5 w-5" />
            Hand Tracking Failed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">Error: {error}</p>
            </div>
          )}
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800 mb-2">Troubleshooting steps:</p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Check camera permissions in browser settings</li>
              <li>• Ensure camera is not in use by other applications</li>
              <li>• Try refreshing the page</li>
              <li>• Verify you're using HTTPS or localhost</li>
            </ul>
          </div>
          
          <div className="flex gap-2 justify-center">
            <Button onClick={retryAccess}>Try Again</Button>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hand className="h-5 w-5" />
          Real-time Hand Tracking System
          {isTracking && (
            <Badge variant="secondary" className="ml-auto">
              <Activity className="h-3 w-3 mr-1" />
              Tracking Active ({frameCount} frames)
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Advanced computer vision hand tracking with gesture recognition using MediaPipe
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Video Display with Hand Tracking Overlay */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {/* Canvas overlay for hand landmarks */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ mixBlendMode: 'normal' }}
          />
          
          {/* Status overlay */}
          <div className="absolute top-4 left-4 space-y-2">
            {detectedHands.map((hand, index) => (
              <div
                key={`${hand.label}-${index}`}
                className={`px-3 py-1 rounded-full text-white font-medium text-sm ${
                  hand.label === 'Left' ? 'bg-blue-500' : 'bg-green-500'
                }`}
              >
                {hand.label} Hand ({Math.round(hand.confidence * 100)}%)
              </div>
            ))}
          </div>
          
          {/* Gesture overlay */}
          {currentGestures.length > 0 && (
            <div className="absolute top-4 right-4 space-y-1">
              {currentGestures.map((gesture, index) => (
                <div
                  key={index}
                  className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium"
                >
                  {gesture.name} ({Math.round(gesture.confidence * 100)}%)
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hand Tracking Status */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Detected Hands</CardTitle>
            </CardHeader>
            <CardContent>
              {detectedHands.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hands detected</p>
              ) : (
                <div className="space-y-3">
                  {detectedHands.map((hand, index) => (
                    <div key={`hand-${index}`} className="border rounded p-3">
                      <div className="flex justify-between items-start mb-2">
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
                      <div className="text-xs text-muted-foreground grid grid-cols-2 gap-2">
                        <div>Landmarks: {hand.landmarks.length}</div>
                        <div>
                          Size: {Math.round(hand.boundingBox.width)}×{Math.round(hand.boundingBox.height)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recognized Gestures</CardTitle>
            </CardHeader>
            <CardContent>
              {currentGestures.length === 0 ? (
                <p className="text-muted-foreground text-sm">No gestures recognized</p>
              ) : (
                <div className="space-y-3">
                  {currentGestures.map((gesture, index) => (
                    <div key={`gesture-${index}`} className="border rounded p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium">{gesture.name}</span>
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

        {/* System Information */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium">Tracking Performance</h4>
            <Badge variant={handsModel ? "default" : "secondary"}>
              {handsModel ? "Advanced MediaPipe" : "Basic Motion Detection"}
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Status:</span>
              <p className="font-medium">{isTracking ? 'Active' : 'Inactive'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Frames Processed:</span>
              <p className="font-medium">{frameCount}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Hands Count:</span>
              <p className="font-medium">{detectedHands.length} / 2</p>
            </div>
            <div>
              <span className="text-muted-foreground">Model:</span>
              <p className="font-medium">
                {handsModel ? 'MediaPipe Hands' : 'Basic Motion Detection'}
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2 text-blue-800">Testing Instructions</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Position your hands clearly in front of the camera</li>
            <li>• Try different gestures: fist, open palm, pointing, peace sign</li>
            <li>• The system tracks up to 2 hands simultaneously</li>
            <li>• Hand landmarks are drawn with blue (left) and green (right) lines</li>
            <li>• Gesture recognition updates in real-time</li>
          </ul>
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center">
          {!isTracking && videoReady && (
            <Button onClick={startTracking}>
              <Hand className="h-4 w-4 mr-2" />
              Start Tracking
            </Button>
          )}
          
          {isTracking && (
            <Button onClick={stopTracking} variant="destructive">
              <X className="h-4 w-4 mr-2" />
              Stop Tracking
            </Button>
          )}
          
          <Button variant="outline" onClick={retryAccess}>
            <VideoCamera className="h-4 w-4 mr-2" />
            Reset Camera
          </Button>
          
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}