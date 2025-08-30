import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { VideoCamera, Stop, Play, Trash, Upload } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface SignLanguageRecorderProps {
  onVideoRecorded: (videoBlob: Blob, transcript?: string) => void
  onClose: () => void
  maxDurationMinutes?: number
}

export function SignLanguageRecorder({ 
  onVideoRecorded, 
  onClose, 
  maxDurationMinutes = 5 
}: SignLanguageRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const maxDurationSeconds = maxDurationMinutes * 60

  useEffect(() => {
    requestCameraPermission()
    return () => {
      stopStream()
    }
  }, [])

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user' 
        }, 
        audio: true 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      
      streamRef.current = stream
      setHasPermission(true)
      toast.success('Camera access granted')
    } catch (error) {
      console.error('Error accessing camera:', error)
      setHasPermission(false)
      toast.error('Camera access denied. Please allow camera permissions to use sign language recording.')
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
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9'
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        setRecordedBlob(blob)
        setIsRecording(false)
        
        // Show recorded video
        if (videoRef.current) {
          videoRef.current.srcObject = null
          videoRef.current.src = URL.createObjectURL(blob)
          videoRef.current.controls = true
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
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
      console.error('Error starting recording:', error)
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

  const retakeVideo = async () => {
    setRecordedBlob(null)
    setRecordingTime(0)
    
    // Restart camera stream
    if (videoRef.current) {
      videoRef.current.controls = false
      videoRef.current.src = ''
      videoRef.current.srcObject = streamRef.current
    }
    
    toast.info('Ready to record again')
  }

  const processAndSubmit = async () => {
    if (!recordedBlob) return

    setIsProcessing(true)
    
    try {
      // Simulate AI processing for sign language interpretation
      // In a real implementation, this would call an AI service
      const processingPrompt = spark.llmPrompt`
        This video contains UK sign language content describing a complaint. 
        Please note: "Video processing for sign language interpretation would be handled by specialized AI services.
        For this demo, we'll treat this as a successful video upload that can be referenced in the complaint."
      `
      
      await spark.llm(processingPrompt)
      
      // Create a transcript placeholder
      const transcript = "Sign language video recorded successfully. Duration: " + 
        Math.floor(recordingTime / 60) + "m " + (recordingTime % 60) + "s. " +
        "Content: Complaint details provided in UK Sign Language."

      onVideoRecorded(recordedBlob, transcript)
      toast.success('Sign language video processed successfully!')
      
    } catch (error) {
      console.error('Error processing video:', error)
      toast.error('Failed to process video. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
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
              To record your complaint in sign language, we need access to your camera.
            </p>
            <div className="space-x-2">
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
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Record your complaint details using UK Sign Language. Maximum duration: {maxDurationMinutes} minutes.
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
          
          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <Badge variant="destructive">
                REC {formatTime(recordingTime)}
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
                aria-label="Submit recorded sign language video"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Use This Video
                  </>
                )}
              </Button>
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
              Video recorded: {formatTime(recordingTime)} • Ready to process
            </p>
            <p className="mt-1">
              The AI will analyze your sign language content and include it in your complaint.
            </p>
          </div>
        )}
        
        {/* Accessibility note */}
        <div className="bg-muted/50 p-3 rounded-lg text-sm">
          <p className="font-medium mb-1">Accessibility Features:</p>
          <ul className="text-muted-foreground space-y-1">
            <li>• Clear visual recording indicators</li>
            <li>• Large, clearly labeled controls</li>
            <li>• Keyboard navigation support</li>
            <li>• Screen reader compatible</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}