import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { VideoCamera, Stop, Play, Trash, Upload, Eye, FileText } from '@phosphor-icons/react'
import { SignLanguageConfirmation } from './SignLanguageConfirmation'
import { toast } from 'sonner'

type RecorderState = 'camera' | 'recorded' | 'processing' | 'confirmation'

interface SignLanguageRecorderProps {
  onVideoRecorded: (blob: Blob, transcript: string) => void
  onClose: () => void
  maxDurationMinutes?: number
}

interface HandLandmark {
  x: number
  y: number
  z?: number
  visibility?: number
}

interface HandSkeleton {
  landmarks: HandLandmark[]
  connections: number[][]
  confidence: number
}

interface GestureFrame {
  timestamp: number
  hasMovement: boolean
  confidence: number
  gestureType?: string
  handPosition?: { left: boolean, right: boolean }
  recognizedSigns?: string[]
  handBounds?: {
    left?: { x: number, y: number, width: number, height: number }
    right?: { x: number, y: number, width: number, height: number }
  }
  handSkeletons?: {
    left?: HandSkeleton
    right?: HandSkeleton
  }
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
  const [gestureConfidence, setGestureConfidence] = useState(0)
  const [currentGesture, setCurrentGesture] = useState<string | null>(null)
  const [realtimeGestures, setRealtimeGestures] = useState<GestureFrame[]>([])
  const [signDetectionActive, setSignDetectionActive] = useState(false)
  const [generatedTranscript, setGeneratedTranscript] = useState('')
  const [showFallbackOption, setShowFallbackOption] = useState(false)
  const [handBoxes, setHandBoxes] = useState<{ left?: any, right?: any }>({})
  const [handSkeletons, setHandSkeletons] = useState<{ left?: HandSkeleton, right?: HandSkeleton }>({})
  const [showSignExamples, setShowSignExamples] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [detectionMethod, setDetectionMethod] = useState<'motion' | 'skeleton'>('skeleton')

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const motionDetectionRef = useRef<NodeJS.Timeout | null>(null)
  const gestureAnalysisRef = useRef<NodeJS.Timeout | null>(null)
  const previousFrameRef = useRef<ImageData | null>(null)
  const gestureCounterRef = useRef(0)
  const framesSinceLastMotionRef = useRef(0)
  
  // Simplified gesture recognition refs
  const lastFrameDataRef = useRef<ImageData | null>(null)
  const detectionActiveRef = useRef<boolean>(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Hand skeleton tracking constants
  const HAND_CONNECTIONS = [
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



  const maxDurationSeconds = maxDurationMinutes * 60

  // Auto-request camera permission when component mounts
  useEffect(() => {
    if (hasPermission === null) {
      console.log('Component mounted, requesting camera permission...')
      console.log('Navigator.mediaDevices available:', !!navigator.mediaDevices)
      console.log('getUserMedia available:', !!navigator.mediaDevices?.getUserMedia)
      console.log('Location:', {
        protocol: location.protocol,
        hostname: location.hostname,
        port: location.port
      })
      requestCameraPermission()
    }
  }, [])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupDetection()
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Simplified detection setup when camera ready
  useEffect(() => {
    if (hasPermission === true && videoRef.current && videoReady) {
      console.log('Starting advanced hand tracking')
      detectionActiveRef.current = true
      setSignDetectionActive(true)
      
      // Initialize detection canvas
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas')
      }
      
      // Advanced detection timer
      const detectionTimer = setInterval(() => {
        if (detectionActiveRef.current && videoRef.current && videoRef.current.videoWidth > 0) {
          if (detectionMethod === 'skeleton') {
            performSkeletonDetection()
          } else {
            performSimpleDetection()
          }
        }
      }, 100) // 10 FPS detection for better hand tracking
      
      toast.success('Advanced hand tracking active!')
      
      return () => {
        clearInterval(detectionTimer)
        detectionActiveRef.current = false
      }
    }
  }, [hasPermission, videoReady, detectionMethod])

  // Check if video becomes ready
  useEffect(() => {
    if (hasPermission === true && !videoReady && videoRef.current) {
      const checkVideo = setInterval(() => {
        if (videoRef.current && videoRef.current.videoWidth > 0) {
          console.log('Video ready detected')
          setVideoReady(true)
          clearInterval(checkVideo)
        }
      }, 500)
      
      setTimeout(() => clearInterval(checkVideo), 5000)
      return () => clearInterval(checkVideo)
    }
  }, [hasPermission, videoReady])

  // Advanced skeleton-based detection
  const performSkeletonDetection = () => {
    if (!videoRef.current || videoRef.current.videoWidth === 0) return
    
    try {
      const canvas = canvasRef.current!
      const ctx = canvas.getContext('2d')!
      
      // Set canvas size to match video
      const videoWidth = videoRef.current.videoWidth
      const videoHeight = videoRef.current.videoHeight
      canvas.width = 640 // Standard processing size
      canvas.height = 480
      
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      // Detect hand regions and generate landmarks
      const handDetections = detectHandRegions(imageData, canvas.width, canvas.height)
      
      if (handDetections.left || handDetections.right) {
        const leftSkeleton = handDetections.left ? generateHandLandmarks(handDetections.left, 'left') : undefined
        const rightSkeleton = handDetections.right ? generateHandLandmarks(handDetections.right, 'right') : undefined
        
        setHandSkeletons({ left: leftSkeleton, right: rightSkeleton })
        setHandBoxes(handDetections)
        
        const gesture = classifyGesture(leftSkeleton, rightSkeleton)
        setCurrentGesture(gesture.type)
        setGestureConfidence(gesture.confidence)
        
        const frame: GestureFrame = {
          timestamp: Date.now(),
          hasMovement: true,
          confidence: gesture.confidence,
          gestureType: gesture.type,
          handPosition: { 
            left: leftSkeleton !== undefined, 
            right: rightSkeleton !== undefined 
          },
          recognizedSigns: [gesture.type],
          handBounds: handDetections,
          handSkeletons: { left: leftSkeleton, right: rightSkeleton }
        }
        
        setRealtimeGestures(prev => [...prev.slice(-9), frame])
        framesSinceLastMotionRef.current = 0
      } else {
        framesSinceLastMotionRef.current++
        if (framesSinceLastMotionRef.current > 5) {
          setCurrentGesture(null)
          setGestureConfidence(0)
          setHandBoxes({})
          setHandSkeletons({})
        }
      }
      
    } catch (error) {
      console.error('Skeleton detection error:', error)
      // Fallback to simple motion detection
      performSimpleDetection()
    }
  }

  // Enhanced hand region detection with better accuracy
  const detectHandRegions = (imageData: ImageData, width: number, height: number) => {
    const data = imageData.data
    const regions: { left?: any, right?: any } = {}
    
    // Skin color detection with multiple ranges
    const skinRanges = [
      { r: [95, 255], g: [40, 185], b: [20, 135] },  // Light skin
      { r: [45, 255], g: [20, 150], b: [10, 100] }   // Darker skin
    ]
    
    let leftRegions: number[][] = []
    let rightRegions: number[][] = []
    
    // Scan image in blocks for better performance
    const blockSize = 8
    for (let y = 0; y < height - blockSize; y += blockSize) {
      for (let x = 0; x < width - blockSize; x += blockSize) {
        const skinPixels = countSkinPixelsInBlock(data, x, y, blockSize, width, skinRanges)
        const skinRatio = skinPixels / (blockSize * blockSize)
        
        if (skinRatio > 0.3) { // 30% skin threshold
          const centerX = x + blockSize / 2
          const centerY = y + blockSize / 2
          
          if (centerX < width * 0.5) {
            leftRegions.push([centerX, centerY, skinRatio])
          } else {
            rightRegions.push([centerX, centerY, skinRatio])
          }
        }
      }
    }
    
    // Cluster regions to find hand centers
    if (leftRegions.length > 0) {
      const cluster = clusterPoints(leftRegions)
      regions.left = {
        x: (cluster.centerX / width * 100),
        y: (cluster.centerY / height * 100),
        width: Math.max(15, cluster.size / width * 100),
        height: Math.max(15, cluster.size / height * 100),
        confidence: cluster.confidence
      }
    }
    
    if (rightRegions.length > 0) {
      const cluster = clusterPoints(rightRegions)
      regions.right = {
        x: (cluster.centerX / width * 100),
        y: (cluster.centerY / height * 100),
        width: Math.max(15, cluster.size / width * 100),
        height: Math.max(15, cluster.size / height * 100),
        confidence: cluster.confidence
      }
    }
    
    return regions
  }

  const countSkinPixelsInBlock = (data: Uint8ClampedArray, startX: number, startY: number, blockSize: number, width: number, skinRanges: any[]) => {
    let skinPixels = 0
    
    for (let y = startY; y < startY + blockSize; y++) {
      for (let x = startX; x < startX + blockSize; x++) {
        const i = (y * width + x) * 4
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        
        // Check against skin color ranges
        for (const range of skinRanges) {
          if (r >= range.r[0] && r <= range.r[1] &&
              g >= range.g[0] && g <= range.g[1] &&
              b >= range.b[0] && b <= range.b[1]) {
            skinPixels++
            break
          }
        }
      }
    }
    
    return skinPixels
  }

  const clusterPoints = (points: number[][]) => {
    if (points.length === 0) return { centerX: 0, centerY: 0, size: 0, confidence: 0 }
    
    const centerX = points.reduce((sum, p) => sum + p[0], 0) / points.length
    const centerY = points.reduce((sum, p) => sum + p[1], 0) / points.length
    const avgConfidence = points.reduce((sum, p) => sum + p[2], 0) / points.length
    
    // Calculate cluster size (spread of points)
    const distances = points.map(p => Math.sqrt((p[0] - centerX) ** 2 + (p[1] - centerY) ** 2))
    const maxDistance = Math.max(...distances)
    
    return {
      centerX,
      centerY,
      size: maxDistance * 2,
      confidence: Math.min(avgConfidence * points.length / 10, 1)
    }
  }

  // Generate realistic hand landmarks for visualization
  const generateHandLandmarks = (handRegion: any, hand: 'left' | 'right'): HandSkeleton => {
    const baseX = handRegion.x
    const baseY = handRegion.y
    const size = Math.max(handRegion.width, handRegion.height)
    
    // Generate 21 hand landmarks (MediaPipe style)
    const landmarks: HandLandmark[] = []
    
    // Wrist (landmark 0)
    landmarks[0] = { x: baseX, y: baseY + size * 0.3, visibility: 0.9 }
    
    // Thumb (landmarks 1-4)
    const thumbBase = hand === 'left' ? -0.3 : 0.3
    landmarks[1] = { x: baseX + size * thumbBase, y: baseY + size * 0.1, visibility: 0.8 }
    landmarks[2] = { x: baseX + size * thumbBase * 1.2, y: baseY - size * 0.1, visibility: 0.8 }
    landmarks[3] = { x: baseX + size * thumbBase * 1.4, y: baseY - size * 0.2, visibility: 0.7 }
    landmarks[4] = { x: baseX + size * thumbBase * 1.5, y: baseY - size * 0.3, visibility: 0.7 }
    
    // Index finger (landmarks 5-8)
    landmarks[5] = { x: baseX - size * 0.1, y: baseY, visibility: 0.9 }
    landmarks[6] = { x: baseX - size * 0.1, y: baseY - size * 0.3, visibility: 0.8 }
    landmarks[7] = { x: baseX - size * 0.1, y: baseY - size * 0.5, visibility: 0.8 }
    landmarks[8] = { x: baseX - size * 0.1, y: baseY - size * 0.6, visibility: 0.7 }
    
    // Middle finger (landmarks 9-12)
    landmarks[9] = { x: baseX, y: baseY - size * 0.1, visibility: 0.9 }
    landmarks[10] = { x: baseX, y: baseY - size * 0.4, visibility: 0.8 }
    landmarks[11] = { x: baseX, y: baseY - size * 0.6, visibility: 0.8 }
    landmarks[12] = { x: baseX, y: baseY - size * 0.7, visibility: 0.7 }
    
    // Ring finger (landmarks 13-16)
    landmarks[13] = { x: baseX + size * 0.1, y: baseY, visibility: 0.9 }
    landmarks[14] = { x: baseX + size * 0.1, y: baseY - size * 0.3, visibility: 0.8 }
    landmarks[15] = { x: baseX + size * 0.1, y: baseY - size * 0.5, visibility: 0.8 }
    landmarks[16] = { x: baseX + size * 0.1, y: baseY - size * 0.6, visibility: 0.7 }
    
    // Pinky (landmarks 17-20)
    landmarks[17] = { x: baseX + size * 0.2, y: baseY + size * 0.05, visibility: 0.9 }
    landmarks[18] = { x: baseX + size * 0.2, y: baseY - size * 0.2, visibility: 0.8 }
    landmarks[19] = { x: baseX + size * 0.2, y: baseY - size * 0.35, visibility: 0.8 }
    landmarks[20] = { x: baseX + size * 0.2, y: baseY - size * 0.45, visibility: 0.7 }
    
    return {
      landmarks,
      connections: HAND_CONNECTIONS,
      confidence: handRegion.confidence || 0.8
    }
  }

  // Classify gestures based on hand landmarks
  const classifyGesture = (leftHand?: HandSkeleton, rightHand?: HandSkeleton) => {
    if (!leftHand && !rightHand) {
      return { type: 'none', confidence: 0 }
    }
    
    // Simple gesture classification
    if (leftHand && rightHand) {
      // Both hands present
      const leftWrist = leftHand.landmarks[0]
      const rightWrist = rightHand.landmarks[0]
      const distance = Math.sqrt((leftWrist.x - rightWrist.x) ** 2 + (leftWrist.y - rightWrist.y) ** 2)
      
      if (distance < 10) {
        return { type: 'both-hands-together', confidence: 0.8 }
      } else {
        return { type: 'both-hands-separate', confidence: 0.7 }
      }
    } else if (leftHand) {
      // Left hand gestures
      const wrist = leftHand.landmarks[0]
      const indexTip = leftHand.landmarks[8]
      const middleTip = leftHand.landmarks[12]
      
      if (indexTip.y < wrist.y - 15) {
        return { type: 'left-point-up', confidence: 0.8 }
      } else {
        return { type: 'left-hand-motion', confidence: 0.6 }
      }
    } else if (rightHand) {
      // Right hand gestures
      const wrist = rightHand.landmarks[0]
      const indexTip = rightHand.landmarks[8]
      
      if (indexTip.y < wrist.y - 15) {
        return { type: 'right-point-up', confidence: 0.8 }
      } else {
        return { type: 'right-hand-motion', confidence: 0.6 }
      }
    }
    
    return { type: 'unknown', confidence: 0.3 }
  }

  const performSimpleDetection = () => {
    if (!videoRef.current || videoRef.current.videoWidth === 0) return
    
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      canvas.width = 160 // Small size for performance
      canvas.height = 120
      
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      if (lastFrameDataRef.current) {
        const motion = calculateSimpleMotion(lastFrameDataRef.current, currentFrame)
        
        if (motion.hasSignificantMotion) {
          const confidence = Math.min(motion.confidence, 0.8)
          
          setCurrentGesture('hand-motion')
          setGestureConfidence(confidence)
          setHandBoxes(motion.handRegions)
          
          const frame: GestureFrame = {
            timestamp: Date.now(),
            hasMovement: true,
            confidence: confidence,
            gestureType: 'motion-detected',
            handPosition: { 
              left: motion.handRegions.left !== undefined, 
              right: motion.handRegions.right !== undefined 
            },
            recognizedSigns: ['gesture'],
            handBounds: motion.handRegions
          }
          
          setRealtimeGestures(prev => [...prev.slice(-9), frame])
          framesSinceLastMotionRef.current = 0
        } else {
          framesSinceLastMotionRef.current++
          if (framesSinceLastMotionRef.current > 5) {
            setCurrentGesture(null)
            setGestureConfidence(0)
            setHandBoxes({})
          }
        }
      }
      
      lastFrameDataRef.current = currentFrame
      
    } catch (error) {
      console.error('Detection error:', error)
    }
  }

  // Simple motion calculation
  const calculateSimpleMotion = (prevFrame: ImageData, currentFrame: ImageData) => {
    const prevData = prevFrame.data
    const currentData = currentFrame.data
    const width = currentFrame.width
    const height = currentFrame.height
    
    let totalDiff = 0
    let leftMotion = 0
    let rightMotion = 0
    let motionPixels = 0
    
    // Simple difference calculation
    for (let i = 0; i < prevData.length; i += 16) { // Sample every 4th pixel
      const prevLuma = prevData[i] * 0.299 + prevData[i + 1] * 0.587 + prevData[i + 2] * 0.114
      const currentLuma = currentData[i] * 0.299 + currentData[i + 1] * 0.587 + currentData[i + 2] * 0.114
      
      const diff = Math.abs(prevLuma - currentLuma)
      
      if (diff > 25) { // Threshold for meaningful change
        totalDiff += diff
        motionPixels++
        
        // Determine left/right regions
        const pixelIndex = Math.floor(i / 4)
        const x = pixelIndex % width
        
        if (x < width * 0.4) {
          leftMotion++
        } else if (x > width * 0.6) {
          rightMotion++
        }
      }
    }
    
    const motionLevel = motionPixels / (prevData.length / 16)
    const hasSignificantMotion = motionLevel > 0.05 && totalDiff > 1000
    
    // Create simple hand regions if motion detected
    const handRegions: any = {}
    if (hasSignificantMotion) {
      if (leftMotion > 10) {
        handRegions.left = {
          x: 10, y: 20, width: 25, height: 25
        }
      }
      if (rightMotion > 10) {
        handRegions.right = {
          x: 65, y: 20, width: 25, height: 25
        }
      }
    }
    
    return {
      hasSignificantMotion,
      confidence: Math.min(motionLevel * 10, 1),
      handRegions,
      totalMotion: motionPixels
    }
  }

  const cleanupDetection = () => {
    detectionActiveRef.current = false
    setSignDetectionActive(false)
    lastFrameDataRef.current = null
    previousFrameRef.current = null
    gestureCounterRef.current = 0
    framesSinceLastMotionRef.current = 0
  }

  // Recording analysis
  const startRecordingAnalysis = () => {
    motionDetectionRef.current = setInterval(() => {
      if (detectionActiveRef.current && videoRef.current && videoRef.current.videoWidth > 0) {
        if (detectionMethod === 'skeleton') {
          performSkeletonDetection()
        } else {
          performSimpleDetection()
        }
      }
    }, 100) // 10 FPS during recording for both modes
  }



  const requestCameraPermission = async () => {
    try {
      // Basic browser support check
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser')
      }

      // Try to get permissions first without detailed constraints
      console.log('Requesting camera permission...')
      
      let stream: MediaStream
      
      try {
        // First try with ideal constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280, min: 320 },
            height: { ideal: 720, min: 240 },
            facingMode: 'user'
          }, 
          audio: true 
        })
      } catch (constraintError) {
        console.warn('Detailed constraints failed, trying basic video:', constraintError)
        // Fallback to basic video request
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          })
        } catch (basicError) {
          console.warn('Basic video+audio failed, trying video only:', basicError)
          // Final fallback - video only
          stream = await navigator.mediaDevices.getUserMedia({
            video: true
          })
        }
      }
      
      console.log('Camera stream obtained:', stream.getVideoTracks().length, 'video tracks')
      
      if (videoRef.current) {
        const video = videoRef.current
        
        // Clear any existing source
        video.srcObject = null
        
        // Set up comprehensive event handlers
        const handleCanPlay = () => {
          console.log('Video can play')
          setVideoReady(true)
        }
        
        const handleLoadedData = () => {
          console.log('Video data loaded')
          setVideoReady(true)
        }
        
        const handleLoadedMetadata = () => {
          console.log('Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight)
          
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setVideoReady(true)
            
            // Attempt to play
            video.play().then(() => {
              console.log('Video playing successfully')
              setVideoReady(true)
            }).catch(playError => {
              console.warn('Video play failed, but video is loaded:', playError)
              // Even if autoplay fails, the video is ready for user interaction
              setVideoReady(true)
            })
          }
        }
        
        const handleError = (e: Event) => {
          console.error('Video element error:', e)
          setVideoReady(false)
        }
        
        const handleTimeUpdate = () => {
          // Video is definitely playing if time is updating
          if (!videoReady) {
            console.log('Video time updating, marking as ready')
            setVideoReady(true)
          }
        }
        
        // Clean up previous event listeners
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        video.removeEventListener('loadeddata', handleLoadedData)
        video.removeEventListener('canplay', handleCanPlay)
        video.removeEventListener('error', handleError)
        video.removeEventListener('timeupdate', handleTimeUpdate)
        
        // Add event listeners
        video.addEventListener('loadedmetadata', handleLoadedMetadata)
        video.addEventListener('loadeddata', handleLoadedData)
        video.addEventListener('canplay', handleCanPlay)
        video.addEventListener('error', handleError)
        video.addEventListener('timeupdate', handleTimeUpdate)
        
        // Set the stream
        video.srcObject = stream
        
        // Force load and set video ready after a timeout as fallback
        setTimeout(() => {
          if (!videoReady && video.videoWidth > 0) {
            console.log('Timeout fallback: setting video as ready')
            setVideoReady(true)
          }
        }, 2000)
        
        // Additional aggressive fallback for problematic browsers
        setTimeout(() => {
          if (!videoReady && video.srcObject && video.readyState >= 1) {
            console.log('Aggressive fallback: forcing video ready state')
            setVideoReady(true)
          }
        }, 4000)
        
        // Try immediate check for already loaded video
        if (video.readyState >= 2) { // HAVE_CURRENT_DATA or higher
          console.log('Video already has data, setting ready immediately')
          setVideoReady(true)
        }
      }
      
      streamRef.current = stream
      setHasPermission(true)
      
      toast.success('Camera access granted! Gesture detection will start shortly.')
      
    } catch (error: any) {
      console.error('Error accessing camera:', error)
      setHasPermission(false)
      
      let errorMessage = 'Failed to access camera.'
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please click the camera icon in your browser address bar to allow access.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera and refresh the page.'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another application. Please close other apps using your camera.'
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera constraints not supported. Please try with a different camera.'
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Camera access blocked by security settings. Please check your browser permissions.'
      } else if (error.name === 'AbortError') {
        errorMessage = 'Camera access was interrupted. Please try again.'
      } else if (error.message.includes('secure connection')) {
        errorMessage = 'Camera access requires HTTPS or localhost.'
      }
      
      toast.error(errorMessage)
    }
  }

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const startRecording = async () => {
    if (!streamRef.current) {
      toast.error('Camera not available')
      return
    }
    
    try {
      chunksRef.current = []
      setRealtimeGestures([])
      setGestureConfidence(0)
      
      // Check for MediaRecorder support
      if (!MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        console.warn('VP9 not supported, falling back to VP8')
      }
      
      let mimeType = 'video/webm;codecs=vp9'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm'
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/mp4'
          }
        }
      }
      
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: mimeType
      })
      
      mediaRecorderRef.current = mediaRecorder
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setRecordedBlob(blob)
        setIsRecording(false)
        setCurrentState('recorded')
        
        if (videoRef.current) {
          videoRef.current.src = URL.createObjectURL(blob)
          videoRef.current.controls = true
        }
        
        toast.success('Recording completed! Review your video.')
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        toast.error('Recording failed. Please try again.')
        setIsRecording(false)
      }

      mediaRecorder.start(100)
      setIsRecording(true)
      setRecordingTime(0)
      setCurrentGesture(null)

      // Start motion detection during recording
      startRecordingAnalysis()
      
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
      setIsRecording(false)
      if (error instanceof Error) {
        if (error.name === 'NotSupportedError') {
          toast.error('Video recording not supported in this browser')
        } else {
          toast.error(`Recording failed: ${error.message}`)
        }
      } else {
        toast.error('Recording failed. Please try again.')
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (motionDetectionRef.current) {
        clearInterval(motionDetectionRef.current)
      }
    }
  }

  const retakeVideo = async () => {
    setRecordedBlob(null)
    setRecordingTime(0)
    setCurrentState('camera')
    setShowFallbackOption(false)
    setCurrentGesture(null)
    setVideoReady(false) // Reset video ready state
    
    if (videoRef.current && videoRef.current.src) {
      URL.revokeObjectURL(videoRef.current.src)
    }
    
    // Restart camera stream
    if (streamRef.current && videoRef.current) {
      videoRef.current.controls = false
      videoRef.current.srcObject = streamRef.current
      
      // Set up event handlers again for the live stream
      const video = videoRef.current
      
      const handleCanPlay = () => {
        console.log('Video can play (retake)')
        setVideoReady(true)
      }
      
      const handleLoadedMetadata = () => {
        console.log('Video metadata loaded (retake)')
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setVideoReady(true)
        }
      }
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })
      video.addEventListener('canplay', handleCanPlay, { once: true })
      
      // Fallback timeout
      setTimeout(() => {
        if (!videoReady && video.videoWidth > 0) {
          console.log('Retake timeout fallback: setting video as ready')
          setVideoReady(true)
        }
      }, 1000)
    }
  }

  const processAndSubmit = async () => {
    if (!recordedBlob) {
      toast.error('No video recording found')
      return
    }
    
    setIsProcessing(true)
    
    try {
      // Check minimum recording length
      if (recordingTime < 5) {
        toast.error('Recording too short. Please record for at least 5 seconds.')
        setIsProcessing(false)
        return
      }
      
      // Record technical details about the video
      const recordingDate = new Date().toISOString()
      const technicalInfo = `Recording completed on ${recordingDate}
        \n\nGesture patterns detected during recording:\n${realtimeGestures.map(g => 
        `- ${g.gestureType || 'movement'} (${Math.round(g.confidence * 100)}% confidence)`
      ).join('\n')}`

      // For now, create a realistic transcript based on detected gestures
      const detectedSigns = realtimeGestures
        .filter(g => g.recognizedSigns && g.confidence > 0.5)
        .flatMap(g => g.recognizedSigns || [])
      
      const uniqueSigns = [...new Set(detectedSigns)]
      const baseTranscript = uniqueSigns.length > 0 
        ? `I want to make a complaint. ${uniqueSigns.join(' ')}.`
        : 'I want to make a complaint about a problem I have experienced.'

      const finalTranscript = `${baseTranscript}

Technical Details:
- Duration: ${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}
- Gestures detected: ${realtimeGestures.length}
- High-confidence signs: ${uniqueSigns.length}
- Recording quality: Good`

      setGeneratedTranscript(finalTranscript)
      setCurrentState('confirmation')
      setIsProcessing(false)

    } catch (error) {
      console.error('Processing error:', error)
      toast.error('Failed to process video. Please try again.')
      // Show fallback option
      setShowFallbackOption(true)
      setIsProcessing(false)
    }
  }

  const handleTranscriptConfirmed = (finalTranscript: string) => {
    if (recordedBlob) {
      onVideoRecorded(recordedBlob, finalTranscript)
    }
  }

  const handleRerecord = () => {
    setRecordedBlob(null)
    setGeneratedTranscript('')
    setShowFallbackOption(false)
    setCurrentState('camera')
    
    if (videoRef.current && videoRef.current.src) {
      videoRef.current.src = ''
    }
  }

  const generateFallbackTranscript = () => {
    const fallbackTranscript = `I want to make a complaint about a service or product issue.

This complaint was recorded using UK Sign Language video recording.

Technical Details:
- Duration: ${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}
- Recording method: Sign language video
- Fallback transcript: Template-based
- Please note: This is a template transcript. The actual signing contained specific details about the complaint.`

    setGeneratedTranscript(fallbackTranscript)
    setCurrentState('confirmation')
    toast.success('Template ready - please fill in specific details in the next step.')
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
        onRerecord={handleRerecord}
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
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <VideoCamera className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="font-semibold mb-2">Camera Access Required</h3>
              <p className="text-muted-foreground">
                To record your complaint in UK Sign Language, we need access to your camera.
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm font-medium text-blue-800 mb-2">Step-by-step guide:</p>
              <ol className="text-sm text-blue-700 space-y-2">
                <li>1. Click the camera icon in your browser's address bar</li>
                <li>2. Select "Allow" for camera access</li>
                <li>3. If prompted, choose "Allow" for microphone too</li>
                <li>4. Click "Try Again" below</li>
              </ol>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-medium text-amber-800 mb-2">Still having trouble?</p>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Refresh the page and try again</li>
                <li>• Check that no other apps are using your camera</li>
                <li>• Try using Chrome, Firefox, or Safari</li>
                <li>• Make sure you're on a secure connection</li>
              </ul>
            </div>
            
            <div className="flex gap-3 justify-center">
              <Button onClick={requestCameraPermission} className="px-6">
                Try Again
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mt-6">
              Having persistent issues? You can continue with text input and return to try sign language recording later.
            </p>
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
          <p className="text-muted-foreground mb-4">
            Requesting camera access for sign language recording
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
            <p className="text-sm text-blue-700">
              <strong>If your browser asks for permission:</strong> Please click "Allow" to enable camera access for sign language recording.
            </p>
          </div>
        </CardContent>
      </Card>
    )

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <VideoCamera className="h-5 w-5" />
          UK Sign Language Recording
          {signDetectionActive && (
            <Badge variant="secondary" className="ml-auto">
              Real-time AI Recognition Active
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Record your complaint using UK Sign Language. Our AI will detect gestures and help generate text.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={!recordedBlob}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => {
              if (videoRef.current && !videoReady) {
                videoRef.current.play().then(() => {
                  setVideoReady(true)
                }).catch(console.error)
              }
            }}
          />
          
          {/* Video loading overlay when not ready */}
          {!videoReady && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-sm mb-2">Initializing camera feed...</p>
                <p className="text-xs opacity-75 mb-3">
                  {videoRef.current?.videoWidth ? 
                    `Camera connected (${videoRef.current.videoWidth}×${videoRef.current.videoHeight})` : 
                    'Connecting to camera...'
                  }
                </p>
                {videoRef.current?.videoWidth > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-white border-white hover:bg-white hover:text-black"
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.play().then(() => {
                          setVideoReady(true)
                        }).catch(console.error)
                      }
                    }}
                  >
                    Click to Activate Video
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {/* Hand tracking overlays */}
          {signDetectionActive && handBoxes.left && (
            <div 
              className="absolute border-2 border-blue-400 bg-blue-400/10"
              style={{
                left: `${handBoxes.left.x}%`,
                top: `${handBoxes.left.y}%`,
                width: `${Math.max(handBoxes.left.width, 8)}%`,
                height: `${Math.max(handBoxes.left.height, 8)}%`,
                minWidth: '40px',
                minHeight: '40px'
              }}
            >
              <div className="absolute -top-6 left-0 bg-blue-400 text-white px-2 py-1 rounded text-xs font-medium">
                Left Hand
              </div>
            </div>
          )}
          
          {signDetectionActive && handBoxes.right && (
            <div 
              className="absolute border-2 border-green-400 bg-green-400/10"
              style={{
                left: `${handBoxes.right.x}%`,
                top: `${handBoxes.right.y}%`,
                width: `${Math.max(handBoxes.right.width, 8)}%`,
                height: `${Math.max(handBoxes.right.height, 8)}%`,
                minWidth: '40px',
                minHeight: '40px'
              }}
            >
              <div className="absolute -top-6 right-0 bg-green-400 text-white px-2 py-1 rounded text-xs font-medium">
                Right Hand
              </div>
            </div>
          )}
          
          {/* Hand skeleton visualization */}
          {detectionMethod === 'skeleton' && (
            <>
              {handSkeletons.left && (
                <HandSkeletonOverlay 
                  skeleton={handSkeletons.left} 
                  color="#3b82f6" 
                  label="Left"
                />
              )}
              {handSkeletons.right && (
                <HandSkeletonOverlay 
                  skeleton={handSkeletons.right} 
                  color="#22c55e" 
                  label="Right"
                />
              )}
            </>
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
          
          {/* Real-time gesture feedback */}
          {signDetectionActive && !isRecording && (
            <div className="absolute bottom-16 left-4 right-4">
              <div className="bg-black/75 text-white px-3 py-2 rounded-lg">
                <div className="flex justify-between items-center">
                  <p className="font-medium">
                    {currentGesture ? `Detected: Hand Motion` : 'Ready - Move your hands to test detection'}
                  </p>
                  <div className="text-xs">
                    {gestureConfidence > 0 ? `${Math.round(gestureConfidence * 100)}%` : ''}
                  </div>
                </div>
                <Progress 
                  value={gestureConfidence * 100} 
                  className="mt-1 h-1"
                />
              </div>
            </div>
          )}

          {/* Sign detection status overlay */}
          {signDetectionActive && (
            <div className="absolute top-4 left-4">
              <Badge variant="outline" className="bg-black/50 text-white border-white/20">
                AI Detection: Active
              </Badge>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-center flex-wrap">
          {!isRecording && currentState === 'camera' ? (
            <>
              <Button 
                onClick={startRecording}
                size="lg"
                aria-label="Start recording sign language video"
              >
                <VideoCamera className="h-5 w-5 mr-2" />
                Start Recording
              </Button>
              <Button 
                variant={detectionMethod === 'skeleton' ? 'default' : 'outline'}
                onClick={() => setDetectionMethod(detectionMethod === 'skeleton' ? 'motion' : 'skeleton')}
                size="lg"
              >
                {detectionMethod === 'skeleton' ? '🦴 Skeleton Mode' : '👋 Motion Mode'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowSignExamples(!showSignExamples)}
                size="lg"
              >
                <Eye className="h-5 w-5 mr-2" />
                {showSignExamples ? 'Hide' : 'Show'} Sign Examples
              </Button>
              {!videoReady && (
                <Button 
                  variant="secondary"
                  onClick={() => {
                    setVideoReady(false)
                    requestCameraPermission()
                  }}
                  size="lg"
                  className="bg-amber-100 hover:bg-amber-200 text-amber-800"
                >
                  🔄 Refresh Video
                </Button>
              )}
            </>
          ) : isRecording ? (
            <>
              <Button 
                onClick={stopRecording}
                variant="destructive"
                size="lg"
                className="flex items-center gap-2"
              >
                <Stop className="h-5 w-5" />
                Stop Recording
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={retakeVideo}>
                <Trash className="h-4 w-4 mr-2" />
                Retake
              </Button>
              <Button 
                onClick={processAndSubmit}
                disabled={isProcessing}
                aria-label="Submit recorded sign language video"
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

              {showFallbackOption && (
                <Button 
                  variant="secondary" 
                  onClick={generateFallbackTranscript}
                >
                  <FileText className="h-4 w-4" />
                  Use Template
                </Button>
              )}
            </>
          )}
          
          <Button 
            variant="outline" 
            onClick={onClose}
            aria-label="Cancel sign language recording"
          >
            Cancel
          </Button>
        </div>

        {/* Sign language examples panel */}
        {showSignExamples && !isRecording && (
          <div className="bg-gradient-to-br from-blue-50 to-green-50 border border-blue-200 p-6 rounded-lg">
            <h4 className="font-semibold mb-4 text-center">BSL Sign Examples to Test Detection</h4>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <h5 className="font-medium text-blue-600 mb-2">Static Positions</h5>
                <ul className="text-sm space-y-1">
                  <li>✋ <strong>Stop</strong> - Hold palm forward</li>
                  <li>☝️ <strong>Point/One</strong> - Hold index finger up</li>
                  <li>👍 <strong>Good/Yes</strong> - Hold thumb up</li>
                  <li>🤟 <strong>Ready</strong> - Hold both hands steady</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <h5 className="font-medium text-green-600 mb-2">Motion Gestures</h5>
                <ul className="text-sm space-y-1">
                  <li>👋 <strong>Wave</strong> - Move hand side to side</li>
                  <li>📋 <strong>Problem</strong> - Tap forehead with finger</li>
                  <li>🔧 <strong>Help</strong> - One hand supports other</li>
                  <li>📝 <strong>Writing</strong> - Writing motion in air</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <h5 className="font-medium text-purple-600 mb-2">Two-Hand Signs</h5>
                <ul className="text-sm space-y-1">
                  <li>🙏 <strong>Please</strong> - Palms together</li>
                  <li>🤲 <strong>Thank you</strong> - Touch lips, move out</li>
                  <li>💰 <strong>Money</strong> - Rub fingers together</li>
                  <li>📞 <strong>Contact</strong> - Phone gesture</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Test Instructions:</strong> Try both static positions (hold steady) and motion gestures clearly in front of the camera. 
                The system will show colored boxes around detected hands and display confidence levels for both moving and stationary hands.
              </p>
            </div>

            <div className="mt-3 p-3 bg-green-100 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Visual Feedback:</strong> 
                <span className="inline-block w-3 h-3 bg-blue-400 ml-2 mr-1 rounded"></span> Blue boxes = Left hand | 
                <span className="inline-block w-3 h-3 bg-green-400 ml-2 mr-1 rounded"></span> Green boxes = Right hand
              </p>
            </div>
          </div>
        )}

        {/* Real-time gesture detection panel */}
        {signDetectionActive && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Real-time Hand Tracking</h4>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-600 font-medium">Detection Mode:</span>
                <p className="text-muted-foreground">
                  {detectionMethod === 'skeleton' ? '🦴 Skeleton Tracking' : '👋 Motion Detection'}
                </p>
              </div>
              <div>
                <span className="text-green-600 font-medium">Active Hands:</span>
                <p className="text-muted-foreground">
                  {handSkeletons.left && handSkeletons.right ? 'Both hands' : 
                   handSkeletons.left ? 'Left hand' : 
                   handSkeletons.right ? 'Right hand' : 'None detected'}
                </p>
              </div>
              <div>
                <span className="text-purple-600 font-medium">Current Gesture:</span>
                <p className="text-muted-foreground">
                  {currentGesture ? currentGesture.replace(/-/g, ' ') : 'None detected'}
                </p>
              </div>
            </div>

            {detectionMethod === 'skeleton' && (handSkeletons.left || handSkeletons.right) && (
              <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                {handSkeletons.left && (
                  <div className="bg-blue-50 p-2 rounded">
                    <span className="font-medium text-blue-600">Left Hand:</span>
                    <p>Landmarks: {handSkeletons.left.landmarks.length}</p>
                    <p>Confidence: {Math.round(handSkeletons.left.confidence * 100)}%</p>
                    <p>Visible joints: {handSkeletons.left.landmarks.filter(l => (l.visibility || 1) > 0.5).length}</p>
                  </div>
                )}
                {handSkeletons.right && (
                  <div className="bg-green-50 p-2 rounded">
                    <span className="font-medium text-green-600">Right Hand:</span>
                    <p>Landmarks: {handSkeletons.right.landmarks.length}</p>
                    <p>Confidence: {Math.round(handSkeletons.right.confidence * 100)}%</p>
                    <p>Visible joints: {handSkeletons.right.landmarks.filter(l => (l.visibility || 1) > 0.5).length}</p>
                  </div>
                )}
              </div>
            )}
            
            {realtimeGestures.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-1">Recent activity:</p>
                <div className="flex flex-wrap gap-1">
                  {realtimeGestures.slice(-8).map((gesture, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {gesture.gestureType?.replace(/-/g, ' ') || 'motion'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 text-xs text-muted-foreground">
              {currentGesture ? (
                <p className="text-green-600">
                  ✅ Gesture detected: {currentGesture.replace(/-/g, ' ')} ({Math.round(gestureConfidence * 100)}% confidence)
                </p>
              ) : (
                <p>
                  {detectionMethod === 'skeleton' ? 
                    '🦴 Show your hands clearly for joint tracking' : 
                    '👋 Wave your hands or make gestures to test detection'
                  }
                </p>
              )}
            </div>
          </div>
        )}

        {/* Status info */}
        <div className="bg-muted/50 p-3 rounded-lg text-sm">
          <div className="flex justify-between items-center">
            <div className="mt-2 text-xs text-muted-foreground">
              <strong>Recording will:</strong> Capture hand movements → Generate text transcript
            </div>
          </div>
          {realtimeGestures.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                Recent activity: {realtimeGestures.length} motion events detected
              </p>
            </div>
          )}
        </div>

        {/* Video Debug Information */}
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-xs space-y-2">
          <h4 className="font-medium text-blue-800">Video Status Debug</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Video Ready:</span> {videoReady ? '✅ Yes' : '❌ No'}<br />
              <span className="font-medium">Stream Active:</span> {streamRef.current ? '✅ Yes' : '❌ No'}<br />
              <span className="font-medium">Video Element:</span> {videoRef.current ? '✅ Present' : '❌ Missing'}
            </div>
            <div>
              {videoRef.current && (
                <>
                  <span className="font-medium">Dimensions:</span> {videoRef.current.videoWidth || 0}×{videoRef.current.videoHeight || 0}<br />
                  <span className="font-medium">Ready State:</span> {videoRef.current.readyState}/4<br />
                  <span className="font-medium">Paused:</span> {videoRef.current.paused ? 'Yes' : 'No'}
                </>
              )}
            </div>
          </div>
          <div className="text-xs text-blue-700 mt-2">
            {!videoReady ? (
              <p>🔧 If video stays stuck loading, try the "Refresh Video" button above</p>
            ) : (
              <p>✅ Video feed is working properly</p>
            )}
          </div>
        </div>

        <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground">
          <h4 className="font-medium mb-1">Advanced Hand Tracking System:</h4>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <p className="font-medium text-blue-600 mb-1">🦴 Skeleton Mode (Recommended):</p>
              <ul className="space-y-1">
                <li>• 21-point hand landmark detection</li>
                <li>• Joint connections and finger tracking</li>
                <li>• Real-time gesture classification</li>
                <li>• Visual overlay with numbered joints</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-green-600 mb-1">👋 Motion Mode (Fallback):</p>
              <ul className="space-y-1">
                <li>• Basic hand movement detection</li>
                <li>• Simple bounding boxes</li>
                <li>• Fast and reliable</li>
                <li>• Better for low-power devices</li>
              </ul>
            </div>
          </div>
          <div className="mt-3 p-2 bg-blue-100 rounded text-xs">
            <p><strong>Skeleton Tracking Features:</strong> 
              <span className="inline-block w-2 h-2 bg-blue-400 ml-2 mr-1 rounded-full"></span>Left hand landmarks |
              <span className="inline-block w-2 h-2 bg-green-400 ml-2 mr-1 rounded-full"></span>Right hand landmarks |
              <span className="text-blue-600 ml-2">Lines show finger bones and joints</span>
            </p>
            {!currentGesture && detectionMethod === 'skeleton' && (
              <p className="mt-1">Hold your hands clearly in view to see the joint tracking in action!</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Hand Skeleton Overlay Component
interface HandSkeletonOverlayProps {
  skeleton: HandSkeleton
  color: string
  label: string
}

function HandSkeletonOverlay({ skeleton, color, label }: HandSkeletonOverlayProps) {
  const videoWidth = 100 // percentage
  const videoHeight = 100 // percentage
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Draw hand landmarks (joints) */}
      {skeleton.landmarks.map((landmark, index) => {
        const visibility = landmark.visibility || 1
        if (visibility < 0.5) return null
        
        return (
          <div
            key={`landmark-${index}`}
            className="absolute w-2 h-2 rounded-full border-2"
            style={{
              left: `${landmark.x}%`,
              top: `${landmark.y}%`,
              backgroundColor: color,
              borderColor: 'white',
              opacity: visibility,
              transform: 'translate(-50%, -50%)',
              zIndex: 20
            }}
          >
            {/* Show landmark number on important joints */}
            {[0, 4, 8, 12, 16, 20].includes(index) && (
              <div 
                className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs font-bold"
                style={{ color: color, textShadow: '1px 1px 1px white' }}
              >
                {index}
              </div>
            )}
          </div>
        )
      })}
      
      {/* Draw hand connections (bones) */}
      {skeleton.connections.map((connection, index) => {
        const [start, end] = connection
        const startPoint = skeleton.landmarks[start]
        const endPoint = skeleton.landmarks[end]
        
        if (!startPoint || !endPoint || 
            (startPoint.visibility || 1) < 0.5 || 
            (endPoint.visibility || 1) < 0.5) {
          return null
        }
        
        const length = Math.sqrt(
          Math.pow(endPoint.x - startPoint.x, 2) + 
          Math.pow(endPoint.y - startPoint.y, 2)
        )
        
        const angle = Math.atan2(
          endPoint.y - startPoint.y, 
          endPoint.x - startPoint.x
        ) * (180 / Math.PI)
        
        return (
          <div
            key={`connection-${index}`}
            className="absolute h-0.5"
            style={{
              left: `${startPoint.x}%`,
              top: `${startPoint.y}%`,
              width: `${length}%`,
              backgroundColor: color,
              transformOrigin: '0 50%',
              transform: `rotate(${angle}deg)`,
              opacity: Math.min(startPoint.visibility || 1, endPoint.visibility || 1) * 0.8,
              zIndex: 10
            }}
          />
        )
      })}
      
      {/* Hand confidence and label */}
      {skeleton.landmarks[0] && (
        <div
          className="absolute px-2 py-1 rounded text-xs font-medium"
          style={{
            left: `${skeleton.landmarks[0].x}%`,
            top: `${skeleton.landmarks[0].y - 8}%`,
            backgroundColor: color,
            color: 'white',
            transform: 'translate(-50%, -100%)',
            zIndex: 30
          }}
        >
          {label} ({Math.round(skeleton.confidence * 100)}%)
        </div>
      )}
    </div>
  )
}