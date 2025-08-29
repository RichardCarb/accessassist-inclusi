import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Copy, Mail, Download, FileText, Clock, Sparkles } from '@phosphor-icons/react'
import { ComplaintData } from './ComplaintTracker'

interface ComplaintDrafterProps {
  complaint: ComplaintData
  onDraftUpdated: (complaint: ComplaintData) => void
  onBackToIntake: () => void
}

const CONSUMER_RIGHTS_CONTEXT = `
Consumer Rights Act 2015: Goods must be of satisfactory quality, fit for purpose, and as described.
Equality Act 2010: Reasonable adjustments must be made for disabled consumers.
Digital rights: Online services must work as advertised and provide accessible customer support.
`

export function ComplaintDrafter({ complaint, onDraftUpdated, onBackToIntake }: ComplaintDrafterProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [draftText, setDraftText] = useState(complaint.draftText || '')
  const [deadline, setDeadline] = useState('')

  useEffect(() => {
    if (!complaint.draftText) {
      generateDraft()
    }
  }, [])

  const generateDraft = async () => {
    setIsGenerating(true)
    
    try {
      const evidenceText = complaint.evidence.map(e => `${e.description}: ${e.value}`).join(', ')
      
      const prompt = spark.llmPrompt`
        Create a formal complaint letter with these details:
        Company: ${complaint.company.name}
        Issue: ${complaint.issue}
        Evidence: ${evidenceText}
        Impact: ${complaint.impact}
        Desired remedy: ${complaint.desiredRemedy}
        
        Structure the complaint with clear sections:
        1. Issue description
        2. Evidence and timeline
        3. Impact statement
        4. Desired resolution
        5. Reasonable deadline (14-28 days from today)
        
        Use plain English (Grade 8 reading level), professional tone, 180-250 words.
        Include relevant consumer rights context where appropriate: ${CONSUMER_RIGHTS_CONTEXT}
        Add the phrase "This is not legal advice but informational guidance" at the end.
      `
      
      const response = await spark.llm(prompt)
      
      // Extract deadline from response if present
      const deadlineMatch = response.match(/(\d{1,2})\s+days?/)
      if (deadlineMatch) {
        const days = parseInt(deadlineMatch[1])
        const deadlineDate = new Date()
        deadlineDate.setDate(deadlineDate.getDate() + days)
        setDeadline(deadlineDate.toISOString().split('T')[0])
      }
      
      setDraftText(response)
      
      const updatedComplaint = { 
        ...complaint, 
        draftText: response,
        deadline: deadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
      onDraftUpdated(updatedComplaint)
      
    } catch (error) {
      toast.error('Failed to generate draft. Please try again.')
      console.error('Draft generation error:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(draftText)
      toast.success('Draft copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const sendByEmail = () => {
    const subject = `Complaint regarding ${complaint.issue}`
    const body = encodeURIComponent(draftText)
    const recipient = complaint.company.contact || ''
    
    const mailto = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${body}`
    window.open(mailto)
    
    const updatedComplaint = { ...complaint, status: 'submitted' as const, draftText }
    onDraftUpdated(updatedComplaint)
    toast.success('Email draft opened. Please review and send.')
  }

  const generateAccessiblePDF = () => {
    toast.info('PDF generation would be available in the full version')
  }

  const regenerateDraft = () => {
    generateDraft()
    toast.info('Regenerating draft with latest information...')
  }

  const readAloud = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(draftText)
      utterance.rate = 0.8
      utterance.pitch = 1
      window.speechSynthesis.speak(utterance)
      toast.success('Reading draft aloud')
    } else {
      toast.error('Text-to-speech not available in this browser')
    }
  }

  const wordCount = draftText.split(/\s+/).filter(word => word.length > 0).length
  const readingTime = Math.ceil(wordCount / 200) // Average 200 words per minute

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Complaint Draft</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {wordCount} words • {readingTime} min read
              </Badge>
              {isGenerating && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1 animate-pulse" />
                  Generating...
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Company</h3>
              <p className="text-sm text-muted-foreground">{complaint.company.name}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Issue</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{complaint.issue}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Desired Outcome</h3>
              <p className="text-sm text-muted-foreground">{complaint.desiredRemedy}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Generated Complaint</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={readAloud}
                  aria-label="Read draft aloud"
                >
                  🔊 Read Aloud
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={regenerateDraft}
                  disabled={isGenerating}
                  aria-label="Regenerate draft"
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  Regenerate
                </Button>
              </div>
            </div>

            <Textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              className="min-h-[400px] font-mono text-sm leading-relaxed"
              placeholder={isGenerating ? "Generating your complaint draft..." : "Your complaint will appear here"}
              readOnly={isGenerating}
              aria-label="Complaint draft text"
            />

            <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
              <strong>Accessibility Note:</strong> This draft is designed for screen readers with proper heading structure. 
              The language is kept at Grade 8 level for clarity. All critical information is conveyed through text, 
              not visual formatting alone.
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-medium">Export Options</h3>
            
            <div className="grid gap-3 md:grid-cols-3">
              <Button
                onClick={sendByEmail}
                disabled={!draftText || isGenerating}
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Send by Email
              </Button>
              
              <Button
                variant="outline"
                onClick={copyToClipboard}
                disabled={!draftText || isGenerating}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Text
              </Button>
              
              <Button
                variant="outline"
                onClick={generateAccessiblePDF}
                disabled={!draftText || isGenerating}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Accessible PDF
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Submission
                </h4>
                <p className="text-xs text-muted-foreground">
                  Opens your email client with the complaint pre-filled. Review and send to the company.
                </p>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Web Form Copy
                </h4>
                <p className="text-xs text-muted-foreground">
                  Copy the text to paste into the company's complaint form on their website.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onBackToIntake}>
              ← Edit Details
            </Button>
            
            {draftText && !isGenerating && (
              <Button 
                onClick={() => {
                  const updatedComplaint = { ...complaint, status: 'submitted' as const, draftText }
                  onDraftUpdated(updatedComplaint)
                  toast.success('Complaint saved and ready for submission')
                }}
                className="flex-1"
              >
                <Clock className="h-4 w-4 mr-2" />
                Save & Track Progress
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}