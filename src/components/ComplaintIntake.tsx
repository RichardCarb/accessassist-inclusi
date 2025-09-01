import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Microphone, MicrophoneSlash, Plus, X, Calendar, Hash, FileText, VideoCamera, Type } from '@phosphor-icons/react'
import { ComplaintData } from './ComplaintTracker'
import { RealTimeSignLanguageRecognition } from './RealTimeSignLanguageRecognition'
import { toast } from 'sonner'

interface ComplaintIntakeProps {
  onComplaintCreated: (complaint: ComplaintData) => void
  voiceEnabled?: boolean
}

interface EvidenceItem {
  type: 'text' | 'date' | 'reference' | 'video'
  description: string
  value: string
  videoBlob?: Blob
}

const GUIDED_PROMPTS = [
  "What is your full name?",
  "What company is this complaint about?",
  "What specific issue did you experience?", 
  "When did this happen? Please provide any relevant dates.",
  "Do you have any order numbers, reference numbers, or other documentation?",
  "How has this issue impacted you?",
  "What would you like the company to do to resolve this?"
]

export function ComplaintIntake({ onComplaintCreated, voiceEnabled = false }: ComplaintIntakeProps) {
  const [inputMode, setInputMode] = useState<'text' | 'sign'>('text')
  const [showSignRecorder, setShowSignRecorder] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [complainantName, setComplainantName] = useState('')
  const [company, setCompany] = useState('')
  const [issue, setIssue] = useState('')
  const [evidence, setEvidence] = useState<EvidenceItem[]>([])
  const [impact, setImpact] = useState('')
  const [desiredRemedy, setDesiredRemedy] = useState('')
  const [channel] = useState<'email' | 'webform' | 'letter'>('email') // Fixed to email only
  const [currentInput, setCurrentInput] = useState('')
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)

  // Voice recognition setup
  useEffect(() => {
    if (!voiceEnabled || typeof window === 'undefined') return

    try {
      // @ts-ignore - Web Speech API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setCurrentInput(prev => prev + ' ' + transcript)
          setIsListening(false)
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current.onerror = () => {
          setIsListening(false)
        }
      }
    } catch (error) {
      console.log('Voice recognition not available')
    }
  }, [voiceEnabled])

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const handleVideoRecorded = (videoBlob: Blob, transcript?: string) => {
    const videoEvidence: EvidenceItem = {
      type: 'video',
      description: 'UK Sign Language complaint details',
      value: transcript || 'Sign language video recorded',
      videoBlob: videoBlob
    }
    
    setEvidence([...evidence, videoEvidence])
    setShowSignRecorder(false)
    
    // Auto-populate current input with transcript if available
    if (transcript) {
      setCurrentInput(prev => prev + (prev ? ' ' : '') + transcript)
    }
    
    toast.success('Sign language video added to your complaint')
  }

  const addEvidence = () => {
    setEvidence([...evidence, { type: 'text', description: '', value: '' }])
  }

  const removeEvidence = (index: number) => {
    setEvidence(evidence.filter((_, i) => i !== index))
  }

  const updateEvidence = (index: number, field: keyof EvidenceItem, value: string) => {
    const updated = [...evidence]
    updated[index] = { ...updated[index], [field]: value }
    setEvidence(updated)
  }

  const handleNext = () => {
    switch (currentStep) {
      case 0:
        setComplainantName(currentInput.trim())
        break
      case 1:
        setCompany(currentInput.trim())
        break
      case 2:
        setIssue(currentInput.trim())
        break
      case 3:
        if (currentInput.trim()) {
          setEvidence([...evidence, { type: 'date', description: 'Date of incident', value: currentInput.trim() }])
        }
        break
      case 4:
        if (currentInput.trim()) {
          setEvidence([...evidence, { type: 'reference', description: 'Reference number', value: currentInput.trim() }])
        }
        break
      case 5:
        setImpact(currentInput.trim())
        break
      case 6:
        setDesiredRemedy(currentInput.trim())
        break
    }
    
    setCurrentInput('')
    if (currentStep < GUIDED_PROMPTS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    const complaint: ComplaintData = {
      id: Date.now().toString(),
      complainantName,
      company: {
        name: company,
        channel: channel
      },
      issue,
      evidence,
      impact,
      desiredRemedy,
      status: 'draft',
      createdAt: new Date().toISOString()
    }

    onComplaintCreated(complaint)
  }

  const currentPrompt = GUIDED_PROMPTS[currentStep]
  const progress = ((currentStep + 1) / GUIDED_PROMPTS.length) * 100

  if (showSignRecorder) {
    return (
      <RealTimeSignLanguageRecognition
        onVideoRecorded={handleVideoRecorded}
        onClose={() => setShowSignRecorder(false)}
        maxDurationMinutes={5}
      />
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>New Complaint</span>
          <Badge variant="outline" className="text-xs">
            Step {currentStep + 1} of {GUIDED_PROMPTS.length}
          </Badge>
        </CardTitle>
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <Progress 
            value={progress}
            className="h-2"
            aria-label={`Progress: ${Math.round(progress)}% complete`}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Input Mode Selection */}
        <div className="space-y-4">
          <Label className="text-base font-medium">How would you like to provide details?</Label>
          <Tabs value={inputMode} onValueChange={(value: 'text' | 'sign') => setInputMode(value)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text" className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Text/Voice
              </TabsTrigger>
              <TabsTrigger value="sign" className="flex items-center gap-2">
                <VideoCamera className="h-4 w-4" />
                UK Sign Language
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="text" className="space-y-4 mt-4">
              <Label htmlFor="current-input" className="text-lg font-medium">
                {currentPrompt}
              </Label>
              
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Textarea
                    id="current-input"
                    ref={textareaRef}
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    placeholder="Type your response here..."
                    className="flex-1 min-h-[100px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleNext()
                      }
                    }}
                  />
                  
                  {voiceEnabled && (
                    <Button
                      type="button"
                      variant={isListening ? "destructive" : "outline"}
                      size="icon"
                      onClick={isListening ? stopListening : startListening}
                      aria-label={isListening ? "Stop voice input" : "Start voice input"}
                    >
                      {isListening ? (
                        <MicrophoneSlash className="h-4 w-4" />
                      ) : (
                        <Microphone className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                
                {isListening && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Listening... Speak clearly and we'll add your words to the text above.
                  </p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="sign" className="space-y-4 mt-4">
              <div className="text-center space-y-4 p-6 border rounded-lg bg-muted/50">
                <VideoCamera className="h-12 w-12 mx-auto text-primary" />
                <div>
                  <h3 className="font-medium text-lg mb-2">{currentPrompt}</h3>
                  <p className="text-muted-foreground mb-4">
                    Record your response using UK Sign Language with real-time AI recognition. Hand landmarks are tracked and signs are automatically recognized.
                  </p>
                  <Button 
                    onClick={() => setShowSignRecorder(true)}
                    className="flex items-center gap-2"
                  >
                    <VideoCamera className="h-4 w-4" />
                    Start Real-Time Sign Recognition
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {currentStep >= 3 && evidence.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium">Evidence & Documentation</h3>
            <div className="space-y-2">
              {evidence.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                  {item.type === 'date' && <Calendar className="h-4 w-4" />}
                  {item.type === 'reference' && <Hash className="h-4 w-4" />}
                  {item.type === 'text' && <FileText className="h-4 w-4" />}
                  {item.type === 'video' && <VideoCamera className="h-4 w-4 text-primary" />}
                  <span className="text-sm flex-1">{item.description}: {item.value}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEvidence(index)}
                    aria-label={`Remove ${item.description}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              Previous
            </Button>
          )}
          
          <Button
            onClick={handleNext}
            disabled={!currentInput.trim() && currentStep < GUIDED_PROMPTS.length - 1 && !evidence.some(e => e.type === 'video')}
            className="flex-1"
          >
            {currentStep === GUIDED_PROMPTS.length - 1 ? 'Create Complaint' : 'Next'}
          </Button>
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            Press Ctrl+Enter to advance to the next step • Switch between text and sign language input anytime
          </p>
          {evidence.some(e => e.type === 'video') && (
            <p className="text-xs text-primary">
              ✓ Sign language video included in your complaint
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}