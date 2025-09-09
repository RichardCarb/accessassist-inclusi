import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VideoCamera } from '@phosphor-icons/react'
import { Sign2TextRecorder } from './Sign2TextRecorder'
import { SignLanguageConfirmation } from './SignLanguageConfirmation'
import { toast } from 'sonner'

type RecorderState = 'setup' | 'recording' | 'confirmation'

interface SignLanguageRecorderProps {
  onVideoRecorded: (blob: Blob, transcript: string) => void
  onClose: () => void
  maxDurationMinutes?: number
}

export function SignLanguageRecorder({ 
  onVideoRecorded, 
  onClose, 
  maxDurationMinutes = 5 
}: SignLanguageRecorderProps) {
  const [currentState, setCurrentState] = useState<RecorderState>('setup')
  const [generatedTranscript, setGeneratedTranscript] = useState('')
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)

  const handleVideoRecorded = (blob: Blob, transcript: string) => {
    setRecordedBlob(blob)
    setGeneratedTranscript(transcript)
    setCurrentState('confirmation')
  }

  const handleTranscriptConfirmed = (finalTranscript: string) => {
    if (recordedBlob) {
      onVideoRecorded(recordedBlob, finalTranscript)
    }
  }

  const handleRetake = () => {
    setRecordedBlob(null)
    setGeneratedTranscript('')
    setCurrentState('setup')
  }

  if (currentState === 'confirmation') {
    return (
      <SignLanguageConfirmation
        transcript={generatedTranscript}
        onConfirm={handleTranscriptConfirmed}
        onRerecord={handleRetake}
      />
    )
  }

  return (
    <div className="w-full">
      <Sign2TextRecorder
        onVideoRecorded={handleVideoRecorded}
        onClose={onClose}
        maxDurationMinutes={maxDurationMinutes}
      />
    </div>
  )
}