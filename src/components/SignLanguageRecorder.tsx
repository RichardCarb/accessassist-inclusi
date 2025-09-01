import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTit
import { Progress } from '@/components/ui/progress'
import { SignLanguageConfirmation } from './S
import { Progress } from '@/components/ui/progress'
import { VideoCamera, Stop, Play, Trash, Upload, Eye, FileText } from '@phosphor-icons/react'
import { SignLanguageConfirmation } from './SignLanguageConfirmation'
import { toast } from 'sonner'



  timestamp: number
  confidence: number
 

export function SignLanguageRecorder({ 

}: SignLanguageRecorderPr
  timestamp: number
  hasMovement: boolean
  confidence: number
  gestureType?: string
  handPosition?: { left: boolean, right: boolean }
  recognizedSigns?: string[]
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
  const motionDetectionRef = useRef<NodeJS.Timeout | null>(null)
  const gestureAnalysisRef = useRef<NodeJS.Timeout | null>(null)
  // Gesture recognition state refs
  const motionHistoryRef = useRef<number[]>([])
  const baselineMotionRef = useRef<number[]>([])
  const calibrationCompleteRef = useRef<boolean>(false)
  const maxDurationSeconds = maxDurationMinutes * 60
  useEffect(() => {
  
      cleanupDetection()
      if (videoRef.current && videoRef.current.sr
      }
  }, [])
  // Start gesture detection when camera is ready
    if (hasPermission === true && videoRef.current) {
        if (videoRef.current && videoRef.current.vi
        } else {

      setTimeout(checkVideoReady, 1
  }, [hasPermission])
  const initializeBasicDetection = () => {
    setSignDetectionActive(true)
    
    setTimeout(() => {
        startPreRecordingAnalysis()

    toast.success('Real-time gesture detection activ

    // Start analyz
      if (isRecording) {
        return
      
        analyzeGestureFr
    }, 150) // Slightly slower during pre-recording 
    // Stop pre-analysis after 60 seconds
      clearInterval(preAnalysisInterval)
      }
    }
  }, [])

  // Start gesture detection when camera is ready
  useEffect(() => {
    if (hasPermission === true && videoRef.current) {
      const checkVideoReady = () => {
        if (videoRef.current && videoRef.current.videoWidth > 0) {
          initializeBasicDetection()
        } else {
          setTimeout(checkVideoReady, 500)
        }
      }
      setTimeout(checkVideoReady, 1000)
    }
  }, [hasPermission])

  const initializeBasicDetection = () => {
    // Initialize enhanced real-time gesture recognition
    setSignDetectionActive(true)
    console.log('Gesture detection initialized - starting pre-recording analysis')
    
    // Start pre-recording gesture analysis for better responsiveness
    setTimeout(() => {
      if (videoRef.current && !isRecording) {
        startPreRecordingAnalysis()
      }
    }, 2000) // Give camera more time to fully initialize
    
    toast.success('Real-time gesture detection active - try waving or moving your hands!')
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
    }, 150) // Slightly slower during pre-recording to allow calibration
    
    // Stop pre-analysis after 60 seconds
    setTimeout(() => {
      clearInterval(preAnalysisInterval)
    }, 60000)
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
      
      if (gestureResult.hasMovement && gestureResult.confidence > 0.4) {

          motionPixels: gestureResult.a
          signs: gestureResult.recognizedSigns,
        })
      

  }
  // Record technical details about t
    return {

  }
  // Robust gesture recognition with
    hasMovement: boolean;
    ge
    recognizedSigns: string[] | null;
    handMotionRatio: number;
    ri
    actualMotionPixels: number;
    const pixels = imageData.data
    const height =
    // Frame differencing with noise reduction
    let leftHandMotion = 0
    let centerMotion = 0
    
      const prevPixels = previousFrameRef.current.data
      /

          
      
          const lumaDiff = Math.abs(currentLuma - prevLuma)
          // Higher threshold to reduce camera noise and lighting fluctuations
            totalMotion++
            // Region detection for hand tracking
        
            // More precise hand regions
              leftHandMotion++
            
              rightHandMotion++
            
            
         
            //
              edgeMotion++
          }
      }
    
    const
    
    co
    
    if (!calibrationCompleteRef.current && baselineMotionRef.current.len
      
        calibrationCompleteRef.current = t
        console.log('Gesture detection calibrated - baseline motion:', 
    }
    // Calculate dynamic thresholds based on baseli
      baselineMotionRef.current.reduce((a, b) =
    
    const 
    
    co
    const hasRightHan
    const hasBothHands = hasLeftHandMotion && hasR
    /
   

    
    const hasMovement = hasSignificantMotion && framesSinceLastMotionRef.current < 3
    // Gestu
    let recognizedSigns = null
    
     
   

      if (hasWaving && (hasLeftHandMotion || hasRightHand
        confidence = Math.min(confidence + 0.5, 0.95)
      } else if (hasBothH
        confidence = Ma
        // Realistic sign vocab
        const wordIndex = gestureCounterRef.current 
      } else if (hasLeftHandMotion &&
        confidence = Mat
      } else if (hasRightHan
        confidence = Math.
      } else if (hasLeftHan
        confidence = M
      } else if (motionRatio > 
        
    }
    // Motion history smoothing
    if (motionHistoryRef.current.le
    
    // Hand position detection with thresholds
      left: hasLeftHand
    }
    return {
      confidence,
      handPosition,
    
      handMotionRatio: Math.round((leftHandMotion + rightHandMotion) / samplePixels * 1000) / 1000,
      rightHandRatio: Math.round((rightHandMotion / sa
      
  }
  const detectBasicMotion = () => {
    analyzeGestureFrame()

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUs
      }
      // Check if we're on HTTPS or localhost (required for camera access)
        throw new Error('Camera access requires a secure co

        video: { 
          height: { ideal: 720, min: 480 },
        }, 
      })
      if (videoRef.current) {
      }
      streamRef.current = stream
      
      if (videoRef.current) {
          if (videoRef.current) {
          }
      }
      toast.
      console.error('Error accessing camera:', error)
      
        if (e
        } el
        } else if (error.name === 
        } else if (error.name === 'NotReadableError') {
        } else if (error.mes
        } els
        } el
        }
        toast.error('Camera access failed. Please
    }

    if (str
      str
  }
  con
    
    }
    try {
      setSignFrames([])
    
      setRealtimeGestures([])
      setGestureConfidence(0)
      // Check for MediaRecorder support
    
      }
      let mimeType = 'video/webm;codecs=vp9'
        mimeType = 'video/webm;codecs=vp8'
      
            mimeType = 'video/mp4'
        }
      
        mimeType: mimeType

     
    

        const blob = new Blob(chunksRef.current, { typ
        setIsRecording(false)
        // Stop motion detecti
    
        
        if (videoRef.current) {
          videoRef.current.src = URL.createObjectURL(b
    
        toast.success('Recordi

        console.error('MediaRecorder error:', event)
        toast.error('Recording failed. Please try again.')

      mediaRecorder.start(100)
    
      setCurrentGesture(null)

      motionDetectionRef.current = setInte
      // Sta
        setRecordingTime(prev => {
     
    
        })

    
      setIsRecording(false)
      if (error instanceof
          toast.error('Video r
          toast.error(
    
      } else {
      }
  }
  const stopRecording = () => {
      mediaRecorderRef.current.stop()
        clearInterval(timerRef.current)
      
        clearInterval(motionDetectionRef.current)
      }
  }
  const retakeVideo = async () => {
    setRecordingTime(0)
    setShowFallbackOption(false)
    setCurrentGesture(null)
    
    if (videoRef.current && videoRef
    }
    // Restart camera stream
      videoRef.current.controls = false
      videoRef.current.srcObject = streamRef.current
    
  }
  const processAndSubmit = async () => {
      toast.error('No video recording found')
    }
    setIsProcessing(true)
    try {
      if (recordingTime < 5) {
        setIsProcessing(false)
      }
      // Record technical details about the v
      
      const recordingDate = new Date(
        `\n\nGesture patterns detected during 
      /

- Du










     
    
      consol
      toast.error(
      // Show fal
      
      setIsProcessi
  }
  const handleTrans
      onVideoRecorded(recordedBlob, finalTranscript)
  }
  const handleRerecord = () => {
    setRecordedBlob(null)
    setGeneratedTranscript('')
    setShowFallbackOption(false)
    s
   

      videoRef.current.src = ''
    }

   

    

- Duration: ${Math.floor(recordingTime / 60










    setCurrentSta
    toast.success('Template ready - please f

    const mins = Math.floor(s
    return 

  if (cu
      
        transcript={generated
        onRerecord={handleRerecord}
      /
  }
  if (hasPermission === false) {
      <Card className="w-ful
      
            UK Sign Language Recording
        </CardHeader>
          <div className="text-center py-8">
            <h3 className="font-s
              To record your complaint in UK Sign Language, we need access to your camera and microphone.
           
         
       
      
                <li>• Try refreshing the page after changing permissions</li>
            </div>
            <div className="bg-yellow-50 border borde
              <ul className="
      
                <li>• Ensure you're
              </ul>
            
              <Button onClick={requestCameraPermission}>
                Request Camera Access
              <Button variant="outline" onClick={onClose
              </Button>
            
              Having trouble? You can continue with text input or come back to try sign language recording later.
          </div>
      </Card>
  }
  if (hasPermission === null) {
      <Card clas
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rou
        <
    )

    <Ca
     
   

              Real-time AI R
          )}
        <p className="text-sm text-muted-foreground">
        </p>
     
   

            muted={!recordedBlob}
            className="w-full
          />
          {/
     

         
                <Badge varia
                </Badge
              
      
                  variant={gestureConfidence > 0.5 ? "default
                    isRecordi
                      : 'bg-b
                >
      
              
              {!isRecording && !cu
                  {calibrationCompleteRef.current ? 'Ready - Make cl
              
       

            <div className="absolute top-4 l
              <Badge variant="destructive">
              </Badge>
          )}
          {/* Real-time recognize
            <div className="absolute bottom-16 left-4 rig
                <p className="font
           
         
       
      
          )}
          {/* Sign detecti
        

            </div>
          
          {isRecording && (
         
       

          )}

        <div className="flex 
            <>
        
                  size="lg"
                  aria-label="Start recor
                  <VideoCamera className="h-5 w-5" 
         
        
                  variant="des
                  className="fl
                >
                  Stop Recording
              )}
         
        
                variant="outline"
       

              </Button>
              <Button 
                disabled={isP
                aria-label="Submit recorded sign language 
       

                  </>
                  <>
                    Proces
                )}

                <Button 
                  variant="se

                  <FileText className="h-4 w-4" />
                </Button>

          
            variant="outline" 
            aria-label="Cancel sig
            Cancel
        </div>
        {/* Real-time gestu
          <
              <h4 classN
          
              

            </div>
            <div clas
                <span className="text-blue-600 font-med
                  {!calibra
      
                  }
              </div>
                <span className="text-green-600 font-medium">Signs De
                  {realtimeGestures.length} total
                </p>
            </di
            {realtimeGestures.length > 0 && (
         
              
                  {realtimeGestures.slice(-8).ma
       
     
   

              <div className="m
                  <p>🔧 Please stay still for a mo
                  <>
                    {currentG
                        ✅ Detected: {cu
                    )}
       
            )}
        )}
        {/* Status info */}
       
     
   

              <div className="mt-2 
                  <strong
              </div>
            {realtime
                <p className="te
                </p>
            )}
              <span>Templat
    
          </div>
        
        <div className="bg-muted/50 p-3 rounded
     
    
            <li>• 🎨 Luminan
            <li>• 🧠 Edge p
            <li>• 🛡️ Sustained motion 
          </ul>
            <div className="mt-2 p-2 bg-blue-100 rou
     
    
          {(!currentGesture || gestureC
   

              }
              <strong>No
                'System is learning your envi
            
     

  )




























































































































































































































































































































































































































































































































































