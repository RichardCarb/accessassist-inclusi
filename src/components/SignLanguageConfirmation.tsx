import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { VideoCamera, CheckCircle, X, Volume2, VolumeX, RotateCcw } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface SignLanguageConfirmationProps {
  videoBlob: Blob
  transcript: string
  onConfirm: (finalTranscript: string) => void
  onRerecord: () => void
  onCancel: () => void
}

export function SignLanguageConfirmation({
  videoBlob,
  transcript,
  onConfirm,
  onRerecord,
  onCancel
}: SignLanguageConfirmationProps) {
  const [editedTranscript, setEditedTranscript] = useState(transcript)
  const [isReadingAloud, setIsReadingAloud] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)

  const videoUrl = URL.createObjectURL(videoBlob)

  const readAloud = () => {
    if ('speechSynthesis' in window) {
      // Stop any existing speech
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(editedTranscript)
      utterance.rate = 0.8
      utterance.volume = 0.8
      utterance.lang = 'en-UK'
      
      utterance.onstart = () => {
        setIsReadingAloud(true)
      }
      
      utterance.onend = () => {
        setIsReadingAloud(false)
      }
      
      utterance.onerror = () => {
        setIsReadingAloud(false)
        toast.error('Unable to read text aloud')
      }
      
      speechSynthesisRef.current = utterance
      window.speechSynthesis.speak(utterance)
      toast.success('Reading transcript aloud...')
    } else {
      toast.error('Text-to-speech not supported in this browser')
    }
  }

  const stopReading = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsReadingAloud(false)
    }
  }

  const handleConfirm = () => {
    // Stop any ongoing speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    
    onConfirm(editedTranscript.trim())
  }

  const handleCancel = () => {
    // Stop any ongoing speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    
    // Clean up video URL
    URL.revokeObjectURL(videoUrl)
    onCancel()
  }

  const handleRerecord = () => {
    // Stop any ongoing speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    
    // Clean up video URL
    URL.revokeObjectURL(videoUrl)
    onRerecord()
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <VideoCamera className="h-5 w-5" />
          Review and Complete Template
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Template provided based on your UK Sign Language video recording. Please complete with the actual content from your signing.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Video and Status */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-medium">Your Recorded Video</h3>
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                playsInline
                className="w-full h-full object-cover"
                aria-label="Recorded UK sign language video"
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Template Ready
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Template to Complete</h3>
              <div className="flex gap-2">
                {!isReadingAloud ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={readAloud}
                    className="flex items-center gap-2"
                    aria-label="Read transcript aloud"
                  >
                    <Volume2 className="h-4 w-4" />
                    Read Aloud
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={stopReading}
                    className="flex items-center gap-2"
                    aria-label="Stop reading"
                  >
                    <VolumeX className="h-4 w-4" />
                    Stop
                  </Button>
                )}
              </div>
            </div>
            
            <Textarea
              value={editedTranscript}
              onChange={(e) => setEditedTranscript(e.target.value)}
              placeholder="Please complete this template with the actual content from your sign language video..."
              className="min-h-[200px] resize-none"
              aria-label="Complete template with your sign language content"
            />
            
            <p className="text-xs text-muted-foreground">
              Template provided for manual completion. Please replace all bracketed sections with your actual sign language content.
            </p>
          </div>
        </div>

        {/* Audio Feedback Status */}
        {isReadingAloud && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-800">
              <Volume2 className="h-4 w-4" />
              <span className="font-medium">Reading transcript aloud...</span>
              <div className="flex gap-1 ml-2">
                <div className="w-1 h-4 bg-blue-600 animate-pulse"></div>
                <div className="w-1 h-4 bg-blue-600 animate-pulse animation-delay-150"></div>
                <div className="w-1 h-4 bg-blue-600 animate-pulse animation-delay-300"></div>
              </div>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Listen to your template and complete with actual sign language content
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-center pt-4">
          <Button
            onClick={handleRerecord}
            variant="outline"
            className="flex items-center gap-2"
            aria-label="Record video again"
          >
            <RotateCcw className="h-4 w-4" />
            Re-record Video
          </Button>
          
          <Button
            onClick={handleCancel}
            variant="outline"
            className="flex items-center gap-2"
            aria-label="Cancel and return"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          
          <Button
            onClick={handleConfirm}
            disabled={!editedTranscript.trim()}
            className="flex items-center gap-2"
            aria-label="Confirm and use this completed text"
          >
            <CheckCircle className="h-4 w-4" />
            Use This Completed Text
          </Button>
        </div>

        {/* Accessibility notes */}
        <div className="bg-muted/50 p-4 rounded-lg text-sm">
          <p className="font-medium mb-2">Accessibility Features:</p>
          <ul className="text-muted-foreground space-y-1">
            <li>• Text-to-speech to hear your transcript</li>
            <li>• Full keyboard navigation</li>
            <li>• Editable transcript for accuracy</li>
            <li>• Clear visual feedback and status</li>
            <li>• Screen reader compatible controls</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}