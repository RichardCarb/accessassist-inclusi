import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ComplaintData } from '@/components/ComplaintTracker'
import { OmbudsmanIntegration } from '@/components/OmbudsmanIntegration'
import { ArrowLeft, TrendingUp, FileText, Building } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface EscalationGuidanceProps {
  complaint: ComplaintData
  onBack: () => void
  onComplaintUpdated: (updatedComplaint: ComplaintData) => void
}

export function EscalationGuidance({ complaint, onBack, onComplaintUpdated }: EscalationGuidanceProps) {
  const [escalationDraft, setEscalationDraft] = useState<string>('')
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false)
  const [currentTab, setCurrentTab] = useState('ombudsman')

  const handleOmbudsmanAdvice = (advice: string, ombudsman?: any) => {
    setEscalationDraft(advice)
    setCurrentTab('draft')
  }

  const generateGeneralEscalation = async () => {
    setIsGeneratingDraft(true)
    
    try {
      const prompt = spark.llmPrompt`
        Create an escalation letter for this complaint that wasn't resolved at the first level:
        
        Complainant: ${complaint.complainantName}
        Company: ${complaint.company.name}
        Original Issue: ${complaint.issue}
        Impact: ${complaint.impact}
        Desired Remedy: ${complaint.desiredRemedy}
        Evidence: ${complaint.evidence.map(e => `${e.description}: ${e.value}`).join('\n')}
        
        This escalation should:
        1. Reference the original complaint and lack of satisfactory resolution
        2. Clearly restate the issue and desired outcome
        3. Include all relevant evidence and dates
        4. Request escalation to senior management or complaint handling department
        5. Set a reasonable deadline for response (typically 14-21 days)
        6. Mention next steps if this escalation is also unsatisfactory
        7. Maintain a professional but firm tone
        
        Format as a formal business letter suitable for email or posting.
        Include placeholders for: [DATE], [COMPLAINANT ADDRESS] if needed.
        
        The letter should be clear, concise, and demonstrate that this is a serious escalation.
      `
      
      const escalationLetter = await spark.llm(prompt)
      setEscalationDraft(escalationLetter)
      setCurrentTab('draft')
      
    } catch (error) {
      console.error('Error generating escalation letter:', error)
      toast.error('Failed to generate escalation letter')
    } finally {
      setIsGeneratingDraft(false)
    }
  }

  const saveEscalation = () => {
    const updatedComplaint: ComplaintData = {
      ...complaint,
      status: 'escalated',
      draftText: escalationDraft,
      history: [
        ...complaint.history,
        {
          timestamp: new Date().toISOString(),
          event: 'escalated',
          notes: 'Escalation guidance generated and reviewed'
        }
      ]
    }
    
    onComplaintUpdated(updatedComplaint)
    toast.success('Escalation saved to your complaint')
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Escalation Guidance</h2>
        <Button variant="outline" onClick={onBack} aria-label="Go back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Escalation Options for {complaint.company.name}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose the best path to escalate your complaint when the company hasn't provided a satisfactory response.
          </p>
        </CardHeader>
      </Card>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ombudsman" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Ombudsman Services
          </TabsTrigger>
          <TabsTrigger value="internal" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Internal Escalation
          </TabsTrigger>
          <TabsTrigger value="draft" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Escalation Letter
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="ombudsman" className="space-y-6">
          <OmbudsmanIntegration 
            complaint={complaint}
            onEscalationAdvice={handleOmbudsmanAdvice}
          />
        </TabsContent>
        
        <TabsContent value="internal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Internal Company Escalation</CardTitle>
              <p className="text-sm text-muted-foreground">
                Escalate within {complaint.company.name} before going to external bodies
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-medium">Escalation Steps:</h4>
                <ol className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                    <span>Contact the complaints department or senior manager</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                    <span>Reference your original complaint and lack of satisfactory response</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
                    <span>Set a deadline for response (typically 14-21 days)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">4</span>
                    <span>Keep records of all communications</span>
                  </li>
                </ol>
              </div>
              
              <Button 
                onClick={generateGeneralEscalation}
                disabled={isGeneratingDraft}
                className="w-full"
              >
                {isGeneratingDraft ? 'Generating...' : 'Generate Internal Escalation Letter'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="draft" className="space-y-6">
          {escalationDraft ? (
            <Card>
              <CardHeader>
                <CardTitle>Your Escalation Letter</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Review and customize this escalation letter before sending
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm">{escalationDraft}</pre>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={saveEscalation}>
                    Save to Complaint
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigator.clipboard.writeText(escalationDraft)}
                  >
                    Copy Text
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No escalation letter generated yet. Please use one of the other tabs to create an escalation strategy.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}