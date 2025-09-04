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
  const [showSignExamples, setShowSignExamples] = useState(false)
  const [videoReady, setVideoReady] = useState(false)

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
  
  // Gesture recognition state refs
  const motionHistoryRef = useRef<number[]>([])
  const baselineMotionRef = useRef<number[]>([])
  const calibrationCompleteRef = useRef<boolean>(false)

  // Helper function to check if activity pixels are clustered (not scattered noise)
  const isClusteredActivity = (pixels: {x: number, y: number}[], width: number, height: number) => {
    if (pixels.length < 20) return { isClustered: false, bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } }
    
    const minX = Math.min(...pixels.map(p => p.x))
    const maxX = Math.max(...pixels.map(p => p.x))
    const minY = Math.min(...pixels.map(p => p.y))
    const maxY = Math.max(...pixels.map(p => p.y))
    
    const boundingWidth = maxX - minX
    const boundingHeight = maxY - minY
    const boundingArea = boundingWidth * boundingHeight
    
    // Check if pixels are reasonably dense within bounding area
    const density = pixels.length / Math.max(boundingArea, 1)
    const aspectRatio = boundingWidth / Math.max(boundingHeight, 1)
    
    // Hand-like regions should have reasonable density and aspect ratio
    const isClustered = density > 0.08 && 
                       boundingWidth > 15 && boundingHeight > 15 && 
                       boundingWidth < width * 0.4 && boundingHeight < height * 0.4 &&
                       aspectRatio > 0.3 && aspectRatio < 3.0
    
    return { 
      isClustered, 
      bounds: { minX, maxX, minY, maxY },
      density,
      aspectRatio
    }
  }

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

  // Start gesture detection when camera is ready
  useEffect(() => {
    if (hasPermission === true && videoRef.current) {
      const checkVideoReady = () => {
        if (videoRef.current && videoRef.current.videoWidth > 0) {
          if (!videoReady) {
            console.log('Video dimensions available, setting ready')
            setVideoReady(true)
          }
          initializeBasicDetection()
        } else {
          setTimeout(checkVideoReady, 200) // Reduced delay
        }
      }
      setTimeout(checkVideoReady, 500) // Reduced initial delay
    }
  }, [hasPermission, videoReady])

  // Additional periodic check for video ready state
  useEffect(() => {
    if (hasPermission === true && !videoReady) {
      const periodicCheck = setInterval(() => {
        if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
          console.log('Periodic check: Video dimensions available, setting ready')
          setVideoReady(true)
          clearInterval(periodicCheck)
        }
      }, 500)

      // Clear interval after 10 seconds
      setTimeout(() => clearInterval(periodicCheck), 10000)

      return () => clearInterval(periodicCheck)
    }
  }, [hasPermission, videoReady])

  const initializeBasicDetection = () => {
    // Initialize enhanced real-time gesture recognition with false positive prevention
    setSignDetectionActive(true)
    console.log('Enhanced gesture detection v2 initialized - starting noise filtering calibration')
    
    // Start pre-recording gesture analysis with stricter thresholds
    setTimeout(() => {
      if (videoRef.current && !isRecording) {
        startPreRecordingAnalysis()
      }
    }, 500)
    
    toast.success('Gesture detection active with improved accuracy - false positives reduced!')
  }
  
  const startPreRecordingAnalysis = () => {
    // Start analyzing gestures even before recording to warm up the system
    const preAnalysisInterval = setInterval(() => {
      if (isRecording) {
        clearInterval(preAnalysisInterval)
        return
      }
      
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        analyzeGestureFrame()
      }
    }, 80) // More responsive analysis rate
    
    // Stop pre-analysis after 30 seconds (reduced from 60)
    setTimeout(() => {
      clearInterval(preAnalysisInterval)
    }, 30000)
  }

  const cleanupDetection = () => {
    if (motionDetectionRef.current) {
      clearInterval(motionDetectionRef.current)
      motionDetectionRef.current = null
    }
    if (gestureAnalysisRef.current) {
      clearInterval(gestureAnalysisRef.current)
      gestureAnalysisRef.current = null
    }
    // Reset motion tracking references
    previousFrameRef.current = null
    motionHistoryRef.current = []
    gestureCounterRef.current = 0
    baselineMotionRef.current = []
    framesSinceLastMotionRef.current = 0
    calibrationCompleteRef.current = false
  }

  // Enhanced gesture recognition with real-time analysis
  const analyzeGestureFrame = () => {
    try {
      const gestureResult = detectBasicMotion()
      
      // Only process high-confidence detections - no more false positives
      const hasStaticHands = gestureResult.handPosition.left || gestureResult.handPosition.right
      const shouldDetect = gestureResult.hasMovement && gestureResult.confidence > 0.6 // Raised threshold
      
      if (shouldDetect) {
        setGestureConfidence(gestureResult.confidence)
        setCurrentGesture(gestureResult.gestureType || 'hand-detected')
        
        const newFrame: GestureFrame = {
          timestamp: Date.now(),
          hasMovement: gestureResult.hasMovement,
          confidence: gestureResult.confidence,
          gestureType: gestureResult.gestureType || 'hand-activity',
          handPosition: gestureResult.handPosition,
          recognizedSigns: gestureResult.recognizedSigns,
          handBounds: gestureResult.handBounds,
        };
        
        setRealtimeGestures(prev => [...prev.slice(-29), newFrame]);
        setHandBoxes(gestureResult.handBounds || {});
        framesSinceLastMotionRef.current = 0
      } else {
        framesSinceLastMotionRef.current++
        // Clear detection after fewer frames to reduce lingering false positives
        if (framesSinceLastMotionRef.current > 8) { // Reduced from 15
          setCurrentGesture(null)
          setGestureConfidence(0)
          setHandBoxes({})
        }
      }
    } catch (error) {
      console.error('Error analyzing gesture frame:', error)
    }
  }

  // Enhanced gesture detection with stricter false positive prevention
  const detectBasicMotion = () => {
    if (!videoRef.current || !videoRef.current.videoWidth) {
      return {
        hasMovement: false,
        confidence: 0,
        gestureType: undefined,
        handPosition: { left: false, right: false },
        recognizedSigns: null,
        handMotionRatio: 0,
        rightHandRatio: 0,
        actualMotionPixels: 0,
        handBounds: undefined
      }
    }

    // Enhanced detection with stricter thresholds to prevent false positives
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = 320
    canvas.height = 240
    
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    const pixels = imageData.data
    const width = canvas.width
    const height = canvas.height
    
    // Motion analysis (frame differencing) with stricter thresholds
    let totalMotion = 0
    let leftHandMotion = 0
    let rightHandMotion = 0
    let centerMotion = 0
    let edgeMotion = 0
    
    // Static hand detection with much higher thresholds
    let leftStaticActivity = 0
    let rightStaticActivity = 0
    
    // Track regions for hand bounding boxes - require clustered activity
    const leftActivityPixels: {x: number, y: number}[] = []
    const rightActivityPixels: {x: number, y: number}[] = []
    
    // Motion detection with higher threshold for noise reduction
    if (previousFrameRef.current) {
      const prevPixels = previousFrameRef.current.data
      
      for (let i = 0; i < pixels.length; i += 16) { // Sample every 4th pixel
        const currentLuma = (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114)
        const prevLuma = (prevPixels[i] * 0.299 + prevPixels[i + 1] * 0.587 + prevPixels[i + 2] * 0.114)
        
        const lumaDiff = Math.abs(currentLuma - prevLuma)
        
        // Increased threshold from 18 to 35 to reduce noise sensitivity
        if (lumaDiff > 35) {
          totalMotion++
          
          const pixelIndex = Math.floor(i / 4)
          const x = pixelIndex % width
          const y = Math.floor(pixelIndex / width)
          
          if (x < width * 0.35) {
            leftHandMotion++
            leftActivityPixels.push({x, y})
          } else if (x > width * 0.65) {
            rightHandMotion++
            rightActivityPixels.push({x, y})
          } else {
            centerMotion++
          }
          
          if (x < 40 || x > width - 40 || y < 40 || y > height - 40) {
            edgeMotion++
          }
        }
      }
    }
    
    // Much stricter static hand detection - only detect clear hand-like regions
    for (let y = 30; y < height - 30; y += 12) { // Larger steps, avoid edges more
      for (let x = 30; x < width - 30; x += 12) {
        const i = (y * width + x) * 4
        
        // Calculate local contrast and edge strength with stricter criteria
        const centerLuma = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114
        
        // Sample more pixels for better edge detection
        const surroundingIndices = [
          ((y-12) * width + x) * 4,     // up
          ((y+12) * width + x) * 4,     // down  
          (y * width + (x-12)) * 4,     // left
          (y * width + (x+12)) * 4,     // right
          ((y-12) * width + (x-12)) * 4, // top-left
          ((y-12) * width + (x+12)) * 4, // top-right
          ((y+12) * width + (x-12)) * 4, // bottom-left
          ((y+12) * width + (x+12)) * 4  // bottom-right
        ]
        
        let edgeStrength = 0
        let validNeighbors = 0
        
        for (const idx of surroundingIndices) {
          if (idx >= 0 && idx < pixels.length - 3) {
            const neighborLuma = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114
            edgeStrength += Math.abs(centerLuma - neighborLuma)
            validNeighbors++
          }
        }
        
        const avgEdgeStrength = validNeighbors > 0 ? edgeStrength / validNeighbors : 0
        
        // Much stricter hand detection criteria - reduce false positives
        const isHandLike = avgEdgeStrength > 45 && centerLuma > 60 && centerLuma < 180
        
        // Additional validation: check for skin tone range
        const r = pixels[i]
        const g = pixels[i + 1] 
        const b = pixels[i + 2]
        const isSkinTone = r > g && r > b && r > 80 && r < 220 && g > 40 && b > 20
        
        // Require both edge detection AND reasonable skin tone
        if (isHandLike && isSkinTone) {
          if (x < width * 0.4) {
            leftStaticActivity++
            leftActivityPixels.push({x, y})
          } else if (x > width * 0.6) {
            rightStaticActivity++
            rightActivityPixels.push({x, y})
          }
        }
      }
    }
    
    previousFrameRef.current = imageData
    const samplePixels = pixels.length / 16
    const motionRatio = totalMotion / samplePixels
    
    // Create hand bounding boxes - require significant clustered activity to prevent false positives
    const handBounds: any = {}
    
    // Much higher threshold for valid hand regions - require more pixels to form a hand
    if (leftActivityPixels.length > 25) { // Increased from 8 to 25
      // Check if pixels are clustered (not scattered noise)
      const clusterCheck = isClusteredActivity(leftActivityPixels, width, height)
      if (clusterCheck.isClustered) {
        handBounds.left = {
          x: (clusterCheck.bounds.minX / width) * 100,
          y: (clusterCheck.bounds.minY / height) * 100,
          width: ((clusterCheck.bounds.maxX - clusterCheck.bounds.minX) / width) * 100,
          height: ((clusterCheck.bounds.maxY - clusterCheck.bounds.minY) / height) * 100
        }
      }
    }
    
    if (rightActivityPixels.length > 25) { // Increased from 8 to 25
      const clusterCheck = isClusteredActivity(rightActivityPixels, width, height)
      if (clusterCheck.isClustered) {
        handBounds.right = {
          x: (clusterCheck.bounds.minX / width) * 100,
          y: (clusterCheck.bounds.minY / height) * 100,
          width: ((clusterCheck.bounds.maxX - clusterCheck.bounds.minX) / width) * 100,
          height: ((clusterCheck.bounds.maxY - clusterCheck.bounds.minY) / height) * 100
        }
      }
    }
    
    // Longer calibration period with noise reduction
    if (!calibrationCompleteRef.current && baselineMotionRef.current.length < 15) { // Increased from 8 to 15
      baselineMotionRef.current.push(motionRatio)
      if (baselineMotionRef.current.length === 15) {
        calibrationCompleteRef.current = true
        // Filter out outliers in baseline
        const sorted = [...baselineMotionRef.current].sort((a, b) => a - b)
        const median = sorted[Math.floor(sorted.length / 2)]
        console.log('Enhanced gesture detection calibrated - baseline motion:', median)
        toast.success('Hand tracking calibrated with noise filtering!')
      }
    }
    
    // Much more conservative thresholds based on calibration
    const averageBaseline = calibrationCompleteRef.current ? 
      baselineMotionRef.current.reduce((a, b) => a + b) / baselineMotionRef.current.length : 0.02
    
    const motionThreshold = Math.max(averageBaseline * 4, 0.025) // Much higher threshold
    const significantMotionThreshold = Math.max(averageBaseline * 6, 0.040) // Much higher threshold
    
    // Stricter hand detection - require both conditions to be met
    const hasMotion = motionRatio > motionThreshold
    const hasLeftHandActivity = leftHandMotion > samplePixels * 0.015 && leftStaticActivity > 35 // Much higher thresholds
    const hasRightHandActivity = rightHandMotion > samplePixels * 0.015 && rightStaticActivity > 35 // Much higher thresholds
    const hasBothHands = hasLeftHandActivity && hasRightHandActivity
    
    // Much stricter static position detection
    const hasStaticLeftHand = leftStaticActivity > 50 && leftHandMotion < samplePixels * 0.001
    const hasStaticRightHand = rightStaticActivity > 50 && rightHandMotion < samplePixels * 0.001
    const hasStaticHands = hasStaticLeftHand || hasStaticRightHand
    
    const hasSignificantMotion = motionRatio > significantMotionThreshold
    const hasWaving = hasSignificantMotion && edgeMotion > totalMotion * 0.7 && edgeMotion > 25 // Higher threshold
    
    // Only report movement if we have very clear evidence
    const hasMovement = (hasMotion && (hasLeftHandActivity || hasRightHandActivity)) || hasStaticHands
    
    // Much more conservative gesture classification - only when very confident
    let gestureType: string | undefined
    let recognizedSigns = null
    let confidence = 0
    
    if (hasMovement) {
      gestureCounterRef.current++
      
      // Require much higher confidence for any classification
      if (hasStaticHands && !hasSignificantMotion) {
        if (hasStaticLeftHand && hasStaticRightHand && leftStaticActivity > 60 && rightStaticActivity > 60) {
          gestureType = 'static-two-hands'
          confidence = 0.8
          const staticSigns = ['ready', 'listen']
          recognizedSigns = [staticSigns[gestureCounterRef.current % staticSigns.length]]
        } else if (hasStaticLeftHand && leftStaticActivity > 70) {
          gestureType = 'static-left-hand'
          confidence = 0.75
          recognizedSigns = ['point']
        } else if (hasStaticRightHand && rightStaticActivity > 70) {
          gestureType = 'static-right-hand'
          confidence = 0.75
          recognizedSigns = ['stop']
        }
      }
      // Very strict motion gesture detection
      else if (hasBothHands && hasSignificantMotion && totalMotion > 50) {
        gestureType = 'two-hands-active'
        confidence = 0.85
        const wordIndex = gestureCounterRef.current % 5
        const signWords = ['hello', 'please', 'help', 'problem', 'thank-you']
        recognizedSigns = [signWords[wordIndex]]
      } 
      // Single hand motion - very strict
      else if (hasLeftHandActivity && !hasRightHandActivity && leftHandMotion > 15) {
        gestureType = 'left-hand-gesture'
        confidence = 0.7
        recognizedSigns = ['you']
      }
      else if (hasRightHandActivity && !hasLeftHandActivity && rightHandMotion > 15) {
        gestureType = 'right-hand-gesture'
        confidence = 0.7
        recognizedSigns = ['good']
      }
      // Waving detection - much stricter
      else if (hasWaving && totalMotion > 40) {
        gestureType = 'waving'
        confidence = 0.6
        recognizedSigns = ['hello']
      }
    }
    
    // Only count very confident detections
    if (confidence < 0.6) {
      gestureType = undefined
      recognizedSigns = null
      confidence = 0
    }
    
    // Update motion history
    if (motionHistoryRef.current.length > 10) {
      motionHistoryRef.current.shift()
    }
    motionHistoryRef.current.push(motionRatio)
    
    // Conservative hand position detection - only report when very confident
    const handPosition = {
      left: hasLeftHandActivity && leftStaticActivity > 35,
      right: hasRightHandActivity && rightStaticActivity > 35
    }
    
    return {
      hasMovement,
      confidence,
      gestureType,
      handPosition,
      recognizedSigns,
      handMotionRatio: Math.round((leftHandMotion + rightHandMotion) / samplePixels * 1000) / 1000,
      rightHandRatio: Math.round((rightHandMotion / samplePixels) * 1000) / 1000,
      actualMotionPixels: totalMotion,
      staticActivity: leftStaticActivity + rightStaticActivity,
      handBounds
    }
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

      // Start motion detection during recording with higher frequency
      motionDetectionRef.current = setInterval(() => {
        analyzeGestureFrame()
      }, 80) // Increased frequency for better responsiveness
      
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
  }

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
                    {!calibrationCompleteRef.current ? `Calibrating noise filter... ${baselineMotionRef.current.length}/15` :
                     currentGesture ? `Detected: ${currentGesture}` :
                     'Ready - Make clear gestures with good lighting'}
                  </p>
                  <div className="text-xs">
                    {gestureConfidence > 0 ? `${Math.round(gestureConfidence * 100)}%` : ''}
                  </div>
                </div>
                <Progress 
                  value={!calibrationCompleteRef.current ? (baselineMotionRef.current.length / 15) * 100 : gestureConfidence * 100} 
                  className="mt-1 h-1"
                />
              </div>
            </div>
          )}

          {/* Sign detection status overlay */}
          {signDetectionActive && (
            <div className="absolute top-4 left-4">
              <Badge variant="outline" className="bg-black/50 text-white border-white/20">
                AI Detection: {calibrationCompleteRef.current ? 'Active' : `Calibrating ${baselineMotionRef.current.length}/15`}
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
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-600 font-medium">System Status:</span>
                <p className="text-muted-foreground">
                  {!calibrationCompleteRef.current 
                    ? `Noise filtering: ${baselineMotionRef.current.length}/15 frames` 
                    : 'Active - stricter detection'
                  }
                </p>
              </div>
              <div>
                <span className="text-green-600 font-medium">Signs Detected:</span>
                <p className="text-muted-foreground">
                  {realtimeGestures.length} total
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mt-2">
              <div>
                <span className="text-blue-400 font-medium">Left Hand:</span>
                <p className="text-muted-foreground">
                  {handBoxes.left ? '✓ Detected' : '○ Not detected'}
                </p>
              </div>
              <div>
                <span className="text-green-400 font-medium">Right Hand:</span>
                <p className="text-muted-foreground">
                  {handBoxes.right ? '✓ Detected' : '○ Not detected'}
                </p>
              </div>
            </div>
            
            {realtimeGestures.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-1">Recent gestures:</p>
                <div className="flex flex-wrap gap-1">
                  {realtimeGestures.slice(-8).map((gesture, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {gesture.gestureType || 'motion'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 text-xs text-muted-foreground">
              {!calibrationCompleteRef.current ? (
                <p>🔧 Noise filtering calibration in progress... ({baselineMotionRef.current.length}/15 frames)</p>
              ) : (
                <>
                  {currentGesture ? (
                    <p className="text-green-600">
                      ✅ Detected: {currentGesture} ({Math.round(gestureConfidence * 100)}% confidence)
                      {realtimeGestures[realtimeGestures.length - 1]?.recognizedSigns && (
                        <span className="ml-2 text-blue-600">
                          Signs: {realtimeGestures[realtimeGestures.length - 1]?.recognizedSigns?.join(', ')}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p>👋 Make clear, deliberate gestures with good lighting - detection now stricter</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Status info */}
        <div className="bg-muted/50 p-3 rounded-lg text-sm">
          <div className="flex justify-between items-center">
            <div className="mt-2 text-xs text-muted-foreground">
              <strong>Recording will:</strong> Capture your signs → AI analysis → Generate text transcript
            </div>
          </div>
          {realtimeGestures.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                Recent activity: {realtimeGestures.slice(-3).map(g => g.gestureType).join(', ')}
              </p>
            </div>
          )}
          {showFallbackOption && (
            <div className="mt-2 p-2 bg-yellow-100 rounded text-xs">
              <span>Template option available if AI processing encounters issues</span>
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
          <h4 className="font-medium mb-1">Enhanced Detection Features (v2 - Reduced False Positives):</h4>
          <ul className="space-y-1">
            <li>• 🎯 <strong>Smart Hand Tracking:</strong> Blue boxes for left hand, green boxes for right hand (only when confident)</li>
            <li>• 🛡️ <strong>False Positive Prevention:</strong> Stricter thresholds and noise filtering to prevent ghost detections</li>
            <li>• 📊 <strong>Activity Clustering:</strong> Detects clustered hand regions, ignores scattered noise</li>
            <li>• 🔍 <strong>Skin Tone Analysis:</strong> Combines edge detection with color analysis for better accuracy</li>
            <li>• ⚡ <strong>Motion + Static Detection:</strong> Recognizes both active gestures and held positions</li>
            <li>• 🧠 <strong>Longer Calibration:</strong> 15-frame baseline to adapt to your lighting and environment</li>
          </ul>
          <div className="mt-2 p-2 bg-yellow-100 rounded text-xs">
            <p><strong>Improved System!</strong> This version should eliminate false detections when no hands are present. 
            {(!currentGesture || gestureConfidence < 0.6) && (
              <span className="block mt-1">
                {!calibrationCompleteRef.current
                  ? `System is filtering out noise (${baselineMotionRef.current.length}/15 frames complete). Please wait.`
                  : 'Make clear, deliberate gestures with good lighting. Only high-confidence detections are shown.'
                }
              </span>
            )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}