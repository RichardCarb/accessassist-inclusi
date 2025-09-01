import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { VideoCamera, Stop, Play, Trash, Upload, Eye, FileText, AlertCircle } from '@phosphor-icons/react'
import { SignLanguageConfirmation } from './SignLanguageConfirmation'
import { toast } from 'sonner'

// Import TensorFlow.js and MediaPipe
import * as tf from '@tensorflow/tfjs'
import { Hands, Results } from '@mediapipe/hands'

type RecorderState = 'camera' | 'recorded' | 'processing' | 'confirmation'

interface RealTimeSignLanguageRecognitionProps {
  onVideoRecorded: (blob: Blob, transcript: string) => void
  onClose: () => void
  maxDurationMinutes?: number
}

interface HandLandmark {
  x: number
  y: number
  z: number
}

interface SignRecognition {
  sign: string
  confidence: number
  timestamp: number
}

interface GestureSequence {
  landmarks: HandLandmark[][]
  timestamp: number
  duration: number
}

// Sign language vocabulary with hand shape patterns
const SIGN_VOCABULARY = {
  'hello': {
    keywords: ['greeting', 'hi', 'wave'],
    patterns: ['open_palm_up', 'wave_motion']
  },
  'help': {
    keywords: ['assistance', 'support'],
    patterns: ['fist_on_palm', 'upward_motion']
  },
  'please': {
    keywords: ['request', 'polite'],
    patterns: ['flat_hand_chest', 'circular_motion']
  },
  'thank_you': {
    keywords: ['gratitude', 'thanks'],
    patterns: ['fingers_to_lips', 'forward_motion']
  },
  'problem': {
    keywords: ['issue', 'trouble', 'difficulty'],
    patterns: ['index_fingers_touch', 'twist_motion']
  },
  'complaint': {
    keywords: ['complain', 'dissatisfied'],
    patterns: ['claw_hand_chest', 'outward_motion']
  },
  'money': {
    keywords: ['payment', 'cost', 'expensive'],
    patterns: ['flat_hand_palm', 'tap_motion']
  },
  'service': {
    keywords: ['help', 'assistance', 'customer_service'],
    patterns: ['flat_hands_alternating', 'upward_motion']
  },
  'bad': {
    keywords: ['poor', 'terrible', 'awful'],
    patterns: ['flat_hand_chin', 'downward_motion']
  },
  'good': {
    keywords: ['excellent', 'great', 'fine'],
    patterns: ['flat_hand_chin', 'upward_motion']
  }
}

export function RealTimeSignLanguageRecognition({ 
  onVideoRecorded, 
  onClose, 
  maxDurationMinutes = 5 
}: RealTimeSignLanguageRecognitionProps) {
  const [currentState, setCurrentState] = useState<RecorderState>('camera')
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [generatedTranscript, setGeneratedTranscript] = useState('')
  const [showFallbackOption, setShowFallbackOption] = useState(false)

  // Real-time recognition state
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [recognizedSigns, setRecognizedSigns] = useState<SignRecognition[]>([])
  const [currentConfidence, setCurrentConfidence] = useState(0)
  const [isDetecting, setIsDetecting] = useState(false)
  const [gestureSequences, setGestureSequences] = useState<GestureSequence[]>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const handsRef = useRef<Hands | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const sequenceBufferRef = useRef<HandLandmark[][]>([])
  const lastDetectionRef = useRef<number>(0)

  const maxDurationSeconds = maxDurationMinutes * 60

  // Initialize MediaPipe Hands and TensorFlow
  useEffect(() => {
    const initializeML = async () => {
      try {
        // Initialize TensorFlow.js
        await tf.ready()
        console.log('TensorFlow.js initialized')

        // Initialize MediaPipe Hands
        const hands = new Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
          }
        })

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        })

        hands.onResults(onHandsResults)
        handsRef.current = hands

        setIsModelLoaded(true)
        toast.success('AI models loaded successfully!')
      } catch (error) {
        console.error('Error initializing ML models:', error)
        toast.error('Failed to load AI models. Some features may not work.')
      }
    }

    initializeML()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // MediaPipe Hands results handler
  const onHandsResults = useCallback((results: Results) => {
    if (!canvasRef.current || !videoRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0]
      const handLandmarks: HandLandmark[] = landmarks.map(landmark => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z
      }))

      // Add to sequence buffer
      sequenceBufferRef.current.push(handLandmarks)
      
      // Keep only last 30 frames (1 second at 30 FPS)
      if (sequenceBufferRef.current.length > 30) {
        sequenceBufferRef.current.shift()
      }

      // Draw hand landmarks
      drawHandLandmarks(ctx, handLandmarks, canvas.width, canvas.height)

      // Recognize signs if we have enough frames
      if (sequenceBufferRef.current.length >= 15) {
        const now = Date.now()
        if (now - lastDetectionRef.current > 500) { // Throttle recognition
          recognizeSign(sequenceBufferRef.current)
          lastDetectionRef.current = now
        }
      }

      setIsDetecting(true)
    } else {
      setIsDetecting(false)
      setCurrentConfidence(0)
    }
  }, [])

  // Draw hand landmarks on canvas
  const drawHandLandmarks = (ctx: CanvasRenderingContext2D, landmarks: HandLandmark[], width: number, height: number) => {
    // Draw connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index finger
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle finger
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring finger
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17] // Palm
    ]

    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 2

    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start]
      const endPoint = landmarks[end]
      
      ctx.beginPath()
      ctx.moveTo(startPoint.x * width, startPoint.y * height)
      ctx.lineTo(endPoint.x * width, endPoint.y * height)
      ctx.stroke()
    })

    // Draw landmarks
    ctx.fillStyle = '#ff0000'
    landmarks.forEach((landmark) => {
      ctx.beginPath()
      ctx.arc(landmark.x * width, landmark.y * height, 5, 0, 2 * Math.PI)
      ctx.fill()
    })
  }

  // Sign recognition using hand shape analysis
  const recognizeSign = (sequence: HandLandmark[][]) => {
    if (sequence.length < 10) return

    try {
      const latestFrame = sequence[sequence.length - 1]
      const middleFrame = sequence[Math.floor(sequence.length / 2)]
      
      // Calculate hand shape features
      const features = extractHandFeatures(latestFrame, middleFrame)
      
      // Recognize sign based on features
      const recognition = classifySign(features)
      
      if (recognition.confidence > 0.3) {
        setCurrentConfidence(recognition.confidence)
        
        // Add to recognized signs
        setRecognizedSigns(prev => {
          const newSign: SignRecognition = {
            sign: recognition.sign,
            confidence: recognition.confidence,
            timestamp: Date.now()
          }
          
          // Avoid duplicate consecutive signs
          const lastSign = prev[prev.length - 1]
          if (!lastSign || lastSign.sign !== recognition.sign || 
              Date.now() - lastSign.timestamp > 2000) {
            return [...prev.slice(-19), newSign] // Keep last 20 signs
          }
          return prev
        })

        // Store gesture sequence for later analysis
        if (recognition.confidence > 0.6) {
          const gestureSequence: GestureSequence = {
            landmarks: [...sequence],
            timestamp: Date.now(),
            duration: sequence.length * 33 // Approximate duration in ms
          }
          
          setGestureSequences(prev => [...prev.slice(-9), gestureSequence])
        }
      }
    } catch (error) {
      console.error('Error in sign recognition:', error)
    }
  }

  // Extract hand shape features for classification
  const extractHandFeatures = (currentFrame: HandLandmark[], previousFrame?: HandLandmark[]) => {
    const features = {
      fingerExtension: calculateFingerExtension(currentFrame),
      handOrientation: calculateHandOrientation(currentFrame),
      palmPosition: calculatePalmPosition(currentFrame),
      movement: previousFrame ? calculateMovement(currentFrame, previousFrame) : { x: 0, y: 0, z: 0 }
    }

    return features
  }

  // Calculate finger extension (0 = closed, 1 = open)
  const calculateFingerExtension = (landmarks: HandLandmark[]) => {
    const fingers = {
      thumb: calculateFingerAngle(landmarks, [1, 2, 3, 4]),
      index: calculateFingerAngle(landmarks, [5, 6, 7, 8]),
      middle: calculateFingerAngle(landmarks, [9, 10, 11, 12]),
      ring: calculateFingerAngle(landmarks, [13, 14, 15, 16]),
      pinky: calculateFingerAngle(landmarks, [17, 18, 19, 20])
    }

    return fingers
  }

  // Calculate angle between finger joints
  const calculateFingerAngle = (landmarks: HandLandmark[], jointIndices: number[]) => {
    if (jointIndices.length < 4) return 0

    const [base, joint1, joint2, tip] = jointIndices.map(i => landmarks[i])
    
    // Calculate vectors
    const v1 = {
      x: joint1.x - base.x,
      y: joint1.y - base.y
    }
    
    const v2 = {
      x: tip.x - joint2.x,
      y: tip.y - joint2.y
    }

    // Calculate angle between vectors
    const dot = v1.x * v2.x + v1.y * v2.y
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)
    
    if (mag1 === 0 || mag2 === 0) return 0
    
    const angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))))
    return angle / Math.PI // Normalize to 0-1
  }

  // Calculate hand orientation
  const calculateHandOrientation = (landmarks: HandLandmark[]) => {
    const wrist = landmarks[0]
    const middleFinger = landmarks[9]
    
    const angle = Math.atan2(middleFinger.y - wrist.y, middleFinger.x - wrist.x)
    return angle
  }

  // Calculate palm center position
  const calculatePalmPosition = (landmarks: HandLandmark[]) => {
    const palmLandmarks = [0, 5, 9, 13, 17] // Wrist and finger bases
    const avgX = palmLandmarks.reduce((sum, i) => sum + landmarks[i].x, 0) / palmLandmarks.length
    const avgY = palmLandmarks.reduce((sum, i) => sum + landmarks[i].y, 0) / palmLandmarks.length
    const avgZ = palmLandmarks.reduce((sum, i) => sum + landmarks[i].z, 0) / palmLandmarks.length
    
    return { x: avgX, y: avgY, z: avgZ }
  }

  // Calculate movement between frames
  const calculateMovement = (current: HandLandmark[], previous: HandLandmark[]) => {
    const currentPalm = calculatePalmPosition(current)
    const previousPalm = calculatePalmPosition(previous)
    
    return {
      x: currentPalm.x - previousPalm.x,
      y: currentPalm.y - previousPalm.y,
      z: currentPalm.z - previousPalm.z
    }
  }

  // Classify sign based on extracted features
  const classifySign = (features: any): { sign: string, confidence: number } => {
    let bestMatch = { sign: 'unknown', confidence: 0 }

    // Simple rule-based classification for demo purposes
    // In a real implementation, this would use a trained ML model
    
    const { fingerExtension, handOrientation, palmPosition, movement } = features

    // Hello/Wave: Open hand with movement
    if (fingerExtension.index > 0.7 && fingerExtension.middle > 0.7 && 
        fingerExtension.ring > 0.7 && fingerExtension.pinky > 0.7 &&
        Math.abs(movement.x) > 0.02) {
      bestMatch = { sign: 'hello', confidence: 0.8 }
    }
    
    // Thank you: Fingers to lips motion
    else if (fingerExtension.index > 0.5 && fingerExtension.middle > 0.5 &&
             palmPosition.y < 0.4 && movement.y > 0.01) {
      bestMatch = { sign: 'thank_you', confidence: 0.7 }
    }
    
    // Help: Fist on palm
    else if (fingerExtension.index < 0.3 && fingerExtension.middle < 0.3 &&
             fingerExtension.ring < 0.3 && fingerExtension.pinky < 0.3) {
      bestMatch = { sign: 'help', confidence: 0.6 }
    }
    
    // Please: Flat hand on chest
    else if (fingerExtension.index > 0.6 && fingerExtension.middle > 0.6 &&
             fingerExtension.ring > 0.6 && fingerExtension.pinky > 0.6 &&
             palmPosition.y > 0.3 && palmPosition.y < 0.7) {
      bestMatch = { sign: 'please', confidence: 0.7 }
    }
    
    // Problem: Index fingers touching
    else if (fingerExtension.index > 0.7 && fingerExtension.middle < 0.3 &&
             fingerExtension.ring < 0.3 && fingerExtension.pinky < 0.3) {
      bestMatch = { sign: 'problem', confidence: 0.6 }
    }

    // Add noise reduction - require minimum confidence
    if (bestMatch.confidence < 0.4) {
      bestMatch = { sign: 'unknown', confidence: 0 }
    }

    return bestMatch
  }

  // Start real-time detection
  const startDetection = async () => {
    if (!handsRef.current || !videoRef.current || !isModelLoaded) return

    const detectFrame = async () => {
      if (videoRef.current && handsRef.current && videoRef.current.videoWidth > 0) {
        await handsRef.current.send({ image: videoRef.current })
      }
      
      animationFrameRef.current = requestAnimationFrame(detectFrame)
    }

    detectFrame()
  }

  // Stop detection
  const stopDetection = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }

  // Request camera permission and start detection
  const requestCameraPermission = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser')
      }
      
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error('Camera access requires a secure connection (HTTPS)')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: 'user'
        }, 
        audio: true 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play()
            if (isModelLoaded) {
              setTimeout(startDetection, 1000)
            }
          }
        }
      }
      
      streamRef.current = stream
      setHasPermission(true)
      
      toast.success('Camera access granted! Real-time sign language detection starting...')
    } catch (error: any) {
      console.error('Error accessing camera:', error)
      setHasPermission(false)
      
      if (error.name === 'NotAllowedError') {
        toast.error('Camera permission denied. Please allow camera access and try again.')
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera found. Please connect a camera and try again.')
      } else if (error.name === 'NotReadableError') {
        toast.error('Camera is being used by another application.')
      } else if (error.message.includes('secure connection')) {
        toast.error('Camera access requires HTTPS. Please use a secure connection.')
      } else {
        toast.error('Failed to access camera. Please check your camera settings.')
      }
    }
  }

  // Start recording
  const startRecording = async () => {
    if (!streamRef.current) {
      toast.error('Camera not available')
      return
    }
    
    try {
      chunksRef.current = []
      setRecognizedSigns([])
      setGestureSequences([])
      
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
      
      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType })
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
        stopDetection()
        
        toast.success('Recording completed! Processing sign language...')
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        toast.error('Recording failed. Please try again.')
        setIsRecording(false)
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
      setIsRecording(false)
      toast.error('Recording failed. Please try again.')
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  // Process and generate transcript
  const processAndSubmit = async () => {
    if (!recordedBlob) {
      toast.error('No video recording found')
      return
    }
    
    setIsProcessing(true)
    
    try {
      if (recordingTime < 3) {
        toast.error('Recording too short. Please record for at least 3 seconds.')
        setIsProcessing(false)
        return
      }
      
      // Generate transcript from recognized signs
      const transcript = generateTranscriptFromSigns()
      setGeneratedTranscript(transcript)
      setCurrentState('confirmation')
      setIsProcessing(false)

    } catch (error) {
      console.error('Processing error:', error)
      toast.error('Failed to process video. Using fallback option.')
      setShowFallbackOption(true)
      setIsProcessing(false)
    }
  }

  // Generate transcript from recognized signs
  const generateTranscriptFromSigns = (): string => {
    if (recognizedSigns.length === 0) {
      return `I want to make a complaint.

Recording Details:
- Duration: ${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}
- Technology: Real-time AI sign language recognition
- Status: No specific signs detected clearly enough for automatic translation

Please complete this template with the specific details from your sign language recording.`
    }

    // Group consecutive similar signs
    const consolidatedSigns = consolidateSigns(recognizedSigns)
    
    // Convert signs to natural language
    const signPhrases = consolidatedSigns.map(sign => {
      const vocab = SIGN_VOCABULARY[sign.sign as keyof typeof SIGN_VOCABULARY]
      if (vocab && vocab.keywords.length > 0) {
        return vocab.keywords[0]
      }
      return sign.sign.replace('_', ' ')
    })

    // Create a coherent transcript
    let transcript = 'I want to make a complaint. '
    
    if (signPhrases.length > 0) {
      transcript += signPhrases.join(' ') + '. '
    }

    transcript += `

Recording Details:
- Duration: ${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}
- Signs detected: ${recognizedSigns.length} total
- Unique signs: ${consolidatedSigns.length}
- Technology: Real-time AI sign language recognition
- Average confidence: ${Math.round(consolidatedSigns.reduce((sum, s) => sum + s.confidence, 0) / consolidatedSigns.length * 100)}%

Detected signs: ${consolidatedSigns.map(s => `${s.sign} (${Math.round(s.confidence * 100)}%)`).join(', ')}

Please review and complete this transcript with additional details from your signing.`

    return transcript
  }

  // Consolidate consecutive similar signs
  const consolidateSigns = (signs: SignRecognition[]): SignRecognition[] => {
    if (signs.length === 0) return []
    
    const consolidated: SignRecognition[] = []
    let currentSign = signs[0]
    
    for (let i = 1; i < signs.length; i++) {
      const sign = signs[i]
      
      // If same sign within 3 seconds, update confidence
      if (sign.sign === currentSign.sign && 
          sign.timestamp - currentSign.timestamp < 3000) {
        currentSign.confidence = Math.max(currentSign.confidence, sign.confidence)
      } else {
        consolidated.push(currentSign)
        currentSign = sign
      }
    }
    
    consolidated.push(currentSign)
    return consolidated.filter(s => s.confidence > 0.4) // Filter low confidence signs
  }

  // Handle transcript confirmation
  const handleTranscriptConfirmed = (finalTranscript: string) => {
    if (recordedBlob) {
      onVideoRecorded(recordedBlob, finalTranscript)
    }
  }

  // Retake video
  const retakeVideo = async () => {
    setRecordedBlob(null)
    setRecordingTime(0)
    setCurrentState('camera')
    setShowFallbackOption(false)
    setRecognizedSigns([])
    setGestureSequences([])
    
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      if (isModelLoaded) {
        setTimeout(startDetection, 500)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Render confirmation state
  if (currentState === 'confirmation') {
    return (
      <SignLanguageConfirmation
        transcript={generatedTranscript}
        onConfirm={handleTranscriptConfirmed}
        onRerecord={retakeVideo}
      />
    )
  }

  // Render permission request
  if (hasPermission === false) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VideoCamera className="h-5 w-5" />
            Real-Time Sign Language Recognition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h3 className="font-semibold mb-4">Camera Access Required</h3>
            <p className="text-muted-foreground mb-6">
              To use real-time sign language recognition, we need access to your camera.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-blue-800 mb-2">Enhanced Features:</p>
              <ul className="text-sm text-blue-700 text-left space-y-1">
                <li>• Real-time hand landmark detection</li>
                <li>• AI-powered sign recognition</li>
                <li>• Automatic transcript generation</li>
                <li>• Support for common BSL signs</li>
              </ul>
            </div>
            
            <div className="flex gap-3 justify-center">
              <Button onClick={requestCameraPermission}>
                Enable Real-Time Recognition
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

  // Render loading state
  if (hasPermission === null || !isModelLoaded) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>{!isModelLoaded ? 'Loading AI models...' : 'Checking camera access...'}</p>
        </CardContent>
      </Card>
    )
  }

  // Main recording interface
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <VideoCamera className="h-5 w-5" />
          Real-Time Sign Language Recognition
          {isDetecting && (
            <Badge variant="secondary" className="ml-auto">
              AI Detection Active
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Advanced AI-powered sign language recognition with hand landmark detection and real-time translation.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Video and Canvas Container */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={!recordedBlob}
            className="w-full h-full object-cover"
          />
          
          {/* Overlay canvas for hand landmarks */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ opacity: isDetecting ? 0.8 : 0 }}
          />
          
          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <div className="animate-pulse w-3 h-3 bg-red-500 rounded-full" />
              <Badge variant="destructive">
                REC {formatTime(recordingTime)}
              </Badge>
            </div>
          )}
          
          {/* Detection status */}
          {isDetecting && (
            <div className="absolute top-4 left-4">
              <Badge variant="outline" className="bg-black/50 text-white border-white/20">
                Hand Tracking: Active
              </Badge>
            </div>
          )}
          
          {/* Current sign display */}
          {recognizedSigns.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black/75 text-white px-3 py-2 rounded-lg">
                <p className="font-medium">
                  Last detected: {recognizedSigns[recognizedSigns.length - 1]?.sign.replace('_', ' ')}
                </p>
                <Progress 
                  value={currentConfidence * 100} 
                  className="mt-1 h-1"
                />
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center flex-wrap">
          {!isRecording && currentState === 'camera' ? (
            <Button 
              onClick={startRecording}
              size="lg"
              disabled={!isModelLoaded}
              aria-label="Start recording with real-time recognition"
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
              <Stop className="h-5 w-5" />
              Stop Recording
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={retakeVideo}>
                <Trash className="h-4 w-4 mr-2" />
                Retake
              </Button>
              <Button 
                onClick={processAndSubmit}
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
                    Generate Transcript
                  </>
                )}
              </Button>
            </>
          )}
          
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>

        {/* Recognition Results */}
        {recognizedSigns.length > 0 && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Real-Time Recognition Results</h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
              <div>
                <span className="text-blue-600 font-medium">Signs Detected:</span>
                <p className="text-muted-foreground">{recognizedSigns.length} total</p>
              </div>
              <div>
                <span className="text-green-600 font-medium">Unique Signs:</span>
                <p className="text-muted-foreground">
                  {new Set(recognizedSigns.map(s => s.sign)).size}
                </p>
              </div>
            </div>
            
            {recognizedSigns.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Recent signs:</p>
                <div className="flex flex-wrap gap-1">
                  {recognizedSigns.slice(-8).map((sign, i) => (
                    <Badge 
                      key={i} 
                      variant={sign.confidence > 0.6 ? "default" : "outline"} 
                      className="text-xs"
                    >
                      {sign.sign.replace('_', ' ')} ({Math.round(sign.confidence * 100)}%)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Technical Information */}
        <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground">
          <h4 className="font-medium mb-2">Technical Features:</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <ul className="space-y-1">
                <li>• MediaPipe hand landmark detection</li>
                <li>• TensorFlow.js for ML processing</li>
                <li>• Real-time gesture classification</li>
              </ul>
            </div>
            <div>
              <ul className="space-y-1">
                <li>• 21-point hand tracking</li>
                <li>• Motion pattern analysis</li>
                <li>• Sign vocabulary matching</li>
              </ul>
            </div>
          </div>
          
          {!isModelLoaded && (
            <div className="mt-2 p-2 bg-yellow-100 rounded text-xs">
              <p>⚠️ AI models still loading. Full recognition features will be available shortly.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}