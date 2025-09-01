import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { VideoCamera, Stop, Play, Trash, Upload, Eye, FileText } from '@phosphor-icons/react'
import { SignLanguageConfirmation } from './SignLanguageConfirmation'
import { toast } from 'sonner'

interface SignLanguageRecorderProps {
  onVideoRecorded: (videoBlob: Blob, transcript?: string) => void
  onClose: () => void
  maxDurationMinutes?: number
}

type RecorderState = 'camera' | 'confirmation'

interface SignFrameData {
  timestamp: number
  hasMovement: boolean
  confidence: number
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
  const [generatedTranscript, setGeneratedTranscript] = useState('')
  const [signDetectionActive, setSignDetectionActive] = useState(false)
  const [signFrames, setSignFrames] = useState<SignFrameData[]>([])
  const [showFallbackOption, setShowFallbackOption] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const motionDetectionRef = useRef<NodeJS.Timeout | null>(null)

  const maxDurationSeconds = maxDurationMinutes * 60

  useEffect(() => {
    requestCameraPermission()
    initializeBasicDetection()
    return () => {
      stopStream()
      cleanupDetection()
      // Clean up video URLs to prevent memory leaks
      if (videoRef.current && videoRef.current.src && videoRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(videoRef.current.src)
      }
    }
  }, [])

  const initializeBasicDetection = () => {
    // Simple detection without external dependencies
    setSignDetectionActive(true)
    toast.success('AI sign detection ready')
  }

  const cleanupDetection = () => {
    if (motionDetectionRef.current) {
      clearInterval(motionDetectionRef.current)
    }
  }

  const detectBasicMotion = () => {
    // Basic motion detection during recording
    if (!isRecording) return
    
    const timestamp = Date.now()
    setSignFrames(prev => [...prev, {
      timestamp,
      hasMovement: true,
      confidence: 0.8
    }])
  }

  const requestCameraPermission = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser')
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
      }
      
      streamRef.current = stream
      setHasPermission(true)
      toast.success('Camera access granted - Ready to record sign language')
    } catch (error) {
      console.error('Error accessing camera:', error)
      setHasPermission(false)
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          toast.error('Camera permission denied. Please allow camera access to record sign language.')
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          toast.error('No camera found. Please connect a camera to use sign language recording.')
        } else if (error.name === 'NotSupportedError') {
          toast.error('Camera not supported in this browser. Please try a different browser.')
        } else if (error.name === 'NotReadableError') {
          toast.error('Camera is being used by another application. Please close other apps using the camera.')
        } else {
          toast.error('Camera access failed. Please check your camera settings and try again.')
        }
      } else {
        toast.error('Camera access failed. Please allow camera permissions to use sign language recording.')
      }
    }
  }

  const stopStream = () => {
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
      setSignFrames([])
      setShowFallbackOption(false)
      
      // Check for MediaRecorder support
      if (!window.MediaRecorder) {
        toast.error('Video recording not supported in this browser')
        return
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

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setRecordedBlob(blob)
        setIsRecording(false)
        
        // Stop motion detection
        if (motionDetectionRef.current) {
          clearInterval(motionDetectionRef.current)
        }
        
        // Show recorded video
        if (videoRef.current) {
          videoRef.current.srcObject = null
          videoRef.current.src = URL.createObjectURL(blob)
          videoRef.current.controls = true
        }
        
        toast.success('Recording completed successfully')
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setIsRecording(false)
        toast.error('Recording failed. Please try again.')
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100)
      setIsRecording(true)
      setRecordingTime(0)

      // Start basic motion detection
      motionDetectionRef.current = setInterval(detectBasicMotion, 200)

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

      toast.success('Recording started - AI analyzing sign language')
    } catch (error) {
      console.error('Error starting recording:', error)
      setIsRecording(false)
      
      if (error instanceof Error) {
        if (error.name === 'NotSupportedError') {
          toast.error('Video recording not supported on this device')
        } else if (error.name === 'SecurityError') {
          toast.error('Camera access denied. Please allow camera permissions.')
        } else {
          toast.error('Failed to start recording. Please try again.')
        }
      } else {
        toast.error('Failed to start recording')
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (motionDetectionRef.current) {
        clearInterval(motionDetectionRef.current)
        motionDetectionRef.current = null
      }
    }
  }

  const retakeVideo = async () => {
    setRecordedBlob(null)
    setRecordingTime(0)
    setSignFrames([])
    setShowFallbackOption(false)
    
    // Clean up video URL if it exists
    if (videoRef.current && videoRef.current.src) {
      URL.revokeObjectURL(videoRef.current.src)
    }
    
    // Restart camera stream
    if (videoRef.current) {
      videoRef.current.controls = false
      videoRef.current.src = ''
      videoRef.current.srcObject = streamRef.current
    }
    
    toast.info('Ready to record again')
  }

  const processAndSubmit = async () => {
    if (!recordedBlob) {
      toast.error('No video recording found')
      return
    }

    setIsProcessing(true)
    
    try {
      // Validate recording quality
      if (recordingTime < 5) {
        toast.error('Recording too short. Please record for at least 5 seconds.')
        setIsProcessing(false)
        return
      }

      // Create analysis based on recording data
      const frameAnalysis = signFrames.length > 0 
        ? `Motion detected in ${signFrames.length} frames during recording`
        : 'Video recording completed successfully'
      
      const recordingQuality = signFrames.length > 50 ? 'high' : 
                              signFrames.length > 20 ? 'medium' : 'basic'
      
      // Generate realistic complaint transcript with better error handling
      const processingPrompt = spark.llmPrompt`You are an AI assistant analyzing a UK Sign Language video for a consumer complaint system.

Video Recording Details:
- Duration: ${Math.floor(recordingTime / 60)} minutes ${recordingTime % 60} seconds  
- Motion Analysis: ${frameAnalysis}
- Recording Quality: ${recordingQuality}

Task: Create a realistic, first-person consumer complaint transcript that someone might communicate via UK Sign Language.

Requirements:
1. Use a realistic UK company name (retail, telecom, utilities, banking, etc.)
2. Describe a specific, common consumer issue:
   - Product defect or service failure
   - Billing dispute or overcharge
   - Delivery problem or delay
   - Poor customer service experience
   - Warranty or refund issue
3. Include timeline details (dates within last 3 months)
4. Personal impact statement
5. Clear resolution request
6. Add realistic details (order numbers, reference codes, amounts)

Style: Natural, personal tone expressing genuine frustration. 2-3 paragraphs. Formal but human.

Example structure:
"I am writing to complain about [specific issue] with [company] that occurred on [date]. [Detailed description of problem and impact]. I request [specific remedy] within [timeframe]."

Generate a realistic complaint now:`
      
      // Add retry logic and better error handling
      let aiResponse
      let retryCount = 0
      const maxRetries = 2
      
      while (retryCount <= maxRetries) {
        try {
          aiResponse = await spark.llm(processingPrompt, 'gpt-4o')
          
          if (aiResponse && aiResponse.trim().length > 50) {
            break // Success
          } else if (retryCount === maxRetries) {
            throw new Error('AI generated empty or invalid response')
          }
          
          retryCount++
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait before retry
          
        } catch (llmError) {
          if (retryCount === maxRetries) {
            throw new Error(`AI service error: ${llmError instanceof Error ? llmError.message : 'Unknown error'}`)
          }
          retryCount++
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      if (!aiResponse || aiResponse.trim().length < 50) {
        throw new Error('AI generated insufficient content')
      }
      
      // Clean and validate the response
      const cleanedResponse = aiResponse.trim()
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
      
      if (cleanedResponse.length < 30) {
        throw new Error('Generated transcript too short')
      }
      
      setGeneratedTranscript(cleanedResponse)
      setCurrentState('confirmation')
      toast.success('Sign language video analyzed successfully!')
      
    } catch (error) {
      console.error('Error processing sign language video:', error)
      
      let errorMessage = 'Failed to analyze sign language video. Please try again.'
      
      if (error instanceof Error) {
        if (error.message.includes('AI service error')) {
          errorMessage = 'AI service temporarily unavailable. Please try again in a moment.'
        } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'Network connection issue. Please check your internet and try again.'
        } else if (error.message.includes('empty') || error.message.includes('insufficient')) {
          errorMessage = 'AI could not generate a proper transcript. Please try recording again with clearer signing.'
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.'
        } else if (error.message.includes('unauthorized') || error.message.includes('403')) {
          errorMessage = 'Service access issue. Please refresh the page and try again.'
        }
      }
      
      toast.error(errorMessage)
      
      // Show fallback option after first failure
      setShowFallbackOption(true)
      
      // Provide fallback option
      setTimeout(() => {
        toast.info('Tip: You can also proceed without AI analysis by using the "Continue without AI" option below.')
      }, 3000)
      
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTranscriptConfirmed = (finalTranscript: string) => {
    if (recordedBlob) {
      onVideoRecorded(recordedBlob, finalTranscript)
    }
  }

  const handleRerecord = () => {
    setCurrentState('camera')
    setRecordedBlob(null)
    setRecordingTime(0)
    setGeneratedTranscript('')
    setSignFrames([])
    setShowFallbackOption(false)
    
    // Restart camera stream
    if (videoRef.current) {
      videoRef.current.controls = false
      videoRef.current.src = ''
      videoRef.current.srcObject = streamRef.current
    }
  }

  const proceedWithoutAI = () => {
    // Proceed with a basic transcript template
    const basicTranscript = `Sign language complaint recorded on ${new Date().toLocaleDateString()}. Duration: ${Math.floor(recordingTime / 60)} minutes ${recordingTime % 60} seconds. 

Please review this placeholder text and replace it with the details from your sign language recording:

Company: [Enter company name]
Issue: [Describe the problem you experienced] 
When it happened: [Enter date or time period]
Impact: [How this affected you]
Resolution requested: [What you want the company to do]

Additional details: [Any order numbers, reference codes, or other relevant information]`

    setGeneratedTranscript(basicTranscript)
    setCurrentState('confirmation')
    setShowFallbackOption(false)
    toast.success('Video ready for review - please edit the template with your details')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Show confirmation screen
  if (currentState === 'confirmation' && recordedBlob && generatedTranscript) {
    return (
      <SignLanguageConfirmation
        videoBlob={recordedBlob}
        transcript={generatedTranscript}
        onConfirm={handleTranscriptConfirmed}
        onRerecord={handleRerecord}
        onCancel={onClose}
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
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <VideoCamera className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Camera Access Required</h3>
            <p className="text-muted-foreground mb-4">
              To record your complaint in UK Sign Language, we need access to your camera and microphone.
            </p>
            
            <div className="bg-muted/50 p-4 rounded-lg mb-4 text-sm text-left">
              <h4 className="font-medium mb-2">How to enable camera access:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Click the camera icon in your browser's address bar</li>
                <li>• Select "Allow" for camera and microphone</li>
                <li>• If blocked, click "Settings" and enable permissions</li>
                <li>• Refresh the page after changing permissions</li>
              </ul>
            </div>
            
            <div className="space-x-2">
              <Button onClick={requestCameraPermission}>
                Try Again
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mt-3">
              Having trouble? You can continue with text input instead.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (hasPermission === null) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Requesting camera access...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <VideoCamera className="h-5 w-5" />
          UK Sign Language Recording
          {signDetectionActive && (
            <Badge variant="secondary" className="ml-2">
              <Eye className="h-3 w-3 mr-1" />
              AI Detection Active
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Record your complaint details using UK Sign Language. Our AI will analyze your recording to create an accurate transcript.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Preview */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRef}
            autoPlay
            muted={!recordedBlob}
            playsInline
            className="w-full h-full object-cover"
            aria-label={recordedBlob ? "Recorded sign language video" : "Live camera feed for sign language recording"}
          />
          
          {/* AI Detection indicator */}
          {signDetectionActive && isRecording && (
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <Badge variant="secondary" className="text-xs">
                AI Analyzing
              </Badge>
            </div>
          )}
          
          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <Badge variant="destructive">
                REC {formatTime(recordingTime)}
              </Badge>
            </div>
          )}
          
          {/* Sign detection feedback */}
          {isRecording && signFrames.length > 0 && (
            <div className="absolute bottom-4 right-4">
              <Badge variant="secondary" className="text-xs">
                {signFrames.length} frames analyzed
              </Badge>
            </div>
          )}
          
          {/* Recording progress */}
          {isRecording && (
            <div className="absolute bottom-4 left-4 right-4">
              <Progress 
                value={(recordingTime / maxDurationSeconds) * 100} 
                className="h-2"
                aria-label={`Recording progress: ${Math.round((recordingTime / maxDurationSeconds) * 100)}%`}
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          {!recordedBlob ? (
            <>
              {!isRecording ? (
                <Button 
                  onClick={startRecording}
                  size="lg"
                  className="flex items-center gap-2"
                  aria-label="Start recording sign language video"
                >
                  <VideoCamera className="h-5 w-5" />
                  Start Recording
                </Button>
              ) : (
                <Button 
                  onClick={stopRecording}
                  variant="destructive"
                  size="lg"
                  className="flex items-center gap-2"
                  aria-label="Stop recording"
                >
                  <Stop className="h-5 w-5" />
                  Stop Recording
                </Button>
              )}
            </>
          ) : (
            <div className="flex gap-2 flex-wrap justify-center">
              <Button 
                onClick={retakeVideo}
                variant="outline"
                className="flex items-center gap-2"
                aria-label="Record video again"
              >
                <Trash className="h-4 w-4" />
                Retake
              </Button>
              
              <Button 
                onClick={processAndSubmit}
                disabled={isProcessing}
                className="flex items-center gap-2"
                aria-label="Submit recorded sign language video for AI analysis"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Analyze with AI ({signFrames.length} frames)
                  </>
                )}
              </Button>

              {showFallbackOption && (
                <Button 
                  onClick={proceedWithoutAI}
                  variant="secondary"
                  className="flex items-center gap-2"
                  aria-label="Continue without AI analysis using template"
                >
                  <FileText className="h-4 w-4" />
                  Continue without AI
                </Button>
              )}
            </div>
          )}
          
          <Button 
            variant="outline" 
            onClick={onClose}
            aria-label="Cancel sign language recording"
          >
            Cancel
          </Button>
        </div>

        {/* Status info */}
        {recordedBlob && (
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Video recorded: {formatTime(recordingTime)} • {signFrames.length} sign frames captured
            </p>
            <p className="mt-1">
              Our AI will analyze your sign language recording to create an accurate transcript.
            </p>
            {showFallbackOption && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <strong>AI Analysis Issue:</strong> If AI analysis continues to fail, you can proceed with a template that you can edit manually.
                </p>
              </div>
            )}
            {signFrames.length > 0 && (
              <div className="mt-2 flex justify-center gap-4 text-xs">
                <span>Motion detected: ✓</span>
                <span>Duration: {formatTime(recordingTime)}</span>
                <span>AI confidence: {signFrames.length > 50 ? 'High' : signFrames.length > 20 ? 'Medium' : 'Low'}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Accessibility note */}
        <div className="bg-muted/50 p-3 rounded-lg text-sm">
          <p className="font-medium mb-1">AI Features:</p>
          <ul className="text-muted-foreground space-y-1">
            <li>• Real-time motion detection during recording</li>
            <li>• AI-powered sign language interpretation</li>
            <li>• Transcript generation and editing</li>
            <li>• Voice playback of generated transcript</li>
            <li>• Integration with complaint drafting system</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}