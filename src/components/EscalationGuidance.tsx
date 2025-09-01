import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ComplaintData } from '@/components/ComplaintTracker'
import { findOmbudsmanByCompany, findOmbudsmanBySector, OmbudsmanService } from '@/data/ombudsman-database'
import { ExternalLink, Phone, Mail, Clock, CheckCircle, AlertTriangle, ArrowRight } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface EscalationGuidanceProps {
  complaint: ComplaintData
  onBack: () => void
  onComplaintUpdated: (updatedComplaint: ComplaintData) => void
}

export function EscalationGuidance({ complaint, onBack, onComplaintUpdated }: EscalationGuidanceProps) {
  const [relevantServices, setRelevantServices] = useState<OmbudsmanService[]>([])
  const [selectedService, setSelectedService] = useState<OmbudsmanService | null>(null)
  const [escalationDraft, setEscalationDraft] = useState<string>('')
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false)

  useEffect(() => {
    // Find relevant ombudsman services based on company name and issue type
    const servicesByCompany = findOmbudsmanByCompany(complaint.company.name)
    const servicesBySector = findOmbudsmanBySector(complaint.issue)
    
    // Combine and deduplicate
    const allServices = [...servicesByCompany, ...servicesBySector]
    const uniqueServices = allServices.filter((service, index, array) => 
      array.findIndex(s => s.id === service.id) === index
    )
    
    setRelevantServices(uniqueServices)
    
    // Auto-select the most relevant service
    if (uniqueServices.length > 0) {
      setSelectedService(uniqueServices[0])
    }
  }, [complaint])

  const generateEscalationLetter = async (service: OmbudsmanService) => {
    setIsGeneratingDraft(true)
    
    try {
      const prompt = spark.llmPrompt`
        Create an escalation letter to ${service.name} based on this complaint:
        
        Company: ${complaint.company.name}
        Original Issue: ${complaint.issue}
        Evidence: ${complaint.evidence.map(e => e.description).join(', ')}
        Impact: ${complaint.impact}
        Desired Remedy: ${complaint.desiredRemedy}
        Original Deadline: ${complaint.deadline}
        
        The letter should:
        1. Reference the original complaint and lack of satisfactory response
        2. Summarize the key facts clearly
        3. Explain what remedy is sought
        4. Be professional but firm in tone
        5. Include relevant ${service.shortName} reference information
        6. Be at Grade 8 reading level
        7. Be 200-300 words
        
        Format as a formal letter without sender/recipient addresses (those will be added separately).
      `
      
      const draft = await spark.llm(prompt)
      setEscalationDraft(draft)
      toast.success('Escalation letter generated!')
    } catch (error) {
      toast.error('Failed to generate escalation letter. Please try again.')
      console.error('Error generating escalation:', error)
    } finally {
      setIsGeneratingDraft(false)
    }
  }

  const handleEscalate = (service: OmbudsmanService) => {
    const updatedComplaint = {
      ...complaint,
      status: 'escalated' as const,
      history: [
        ...complaint.history,
        {
          timestamp: new Date().toISOString(),
          event: 'escalated' as const,
          notes: `Escalated to ${service.name}`
        }
      ]
    }
    
    onComplaintUpdated(updatedComplaint)
    toast.success(`Complaint escalated to ${service.shortName}`)
  }

  const copyEscalationText = () => {
    navigator.clipboard.writeText(escalationDraft)
    toast.success('Escalation letter copied to clipboard')
  }

  if (relevantServices.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Escalation Guidance</h2>
          <Button variant="outline" onClick={onBack} aria-label="Go back">
            ← Back
          </Button>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            We couldn't find a specific ombudsman service for {complaint.company.name}. 
            This may be because the company operates in a sector without a designated ombudsman, 
            or our database doesn't have information about this specific company.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>General Escalation Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Citizens Advice</h4>
              <p className="text-sm text-muted-foreground">
                Get free advice on your consumer rights and escalation options.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://www.citizensadvice.org.uk" target="_blank" rel="noopener noreferrer">
                    Visit Website <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Trading Standards</h4>
              <p className="text-sm text-muted-foreground">
                Report businesses that aren't following consumer protection laws.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="https://www.gov.uk/find-local-trading-standards-office" target="_blank" rel="noopener noreferrer">
                  Find Local Office <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Small Claims Court</h4>
              <p className="text-sm text-muted-foreground">
                For claims up to £10,000 (England & Wales) or £5,000 (Scotland).
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="https://www.gov.uk/make-court-claim-for-money" target="_blank" rel="noopener noreferrer">
                  Learn More <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Escalation Guidance</h2>
        <Button variant="outline" onClick={onBack} aria-label="Go back">
          ← Back
        </Button>
      </div>

      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Found {relevantServices.length} relevant ombudsman service{relevantServices.length !== 1 ? 's' : ''} for your complaint about {complaint.company.name}.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="services" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="services">Ombudsman Services</TabsTrigger>
          <TabsTrigger value="process">Escalation Process</TabsTrigger>
          <TabsTrigger value="letter">Draft Letter</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-4">
            {relevantServices.map((service) => (
              <Card key={service.id} className={`cursor-pointer transition-colors ${selectedService?.id === service.id ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {service.freeService ? 'Free' : 'Paid'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-1">
                    {service.sectors.slice(0, 3).map(sector => (
                      <Badge key={sector} variant="outline" className="text-xs">
                        {sector}
                      </Badge>
                    ))}
                    {service.sectors.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{service.sectors.length - 3} more
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Response Times
                      </h5>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Initial: {service.timeframes.initialResponse}</p>
                        <p>Investigation: {service.timeframes.investigation}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Contact Methods</h5>
                      <div className="flex gap-2">
                        {service.contactMethods.phone && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`tel:${service.contactMethods.phone}`}>
                              <Phone className="h-3 w-3 mr-1" />
                              Call
                            </a>
                          </Button>
                        )}
                        <Button variant="outline" size="sm" asChild>
                          <a href={service.contactMethods.website} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Website
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={() => setSelectedService(service)}
                      variant={selectedService?.id === service.id ? "default" : "outline"}
                      size="sm"
                    >
                      Select This Service
                    </Button>
                    {selectedService?.id === service.id && (
                      <Button 
                        onClick={() => generateEscalationLetter(service)}
                        disabled={isGeneratingDraft}
                        size="sm"
                      >
                        Generate Letter
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="process" className="space-y-4">
          {selectedService ? (
            <Card>
              <CardHeader>
                <CardTitle>Escalation Process for {selectedService.shortName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Eligibility Requirements</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {selectedService.eligibilityCriteria.map((criteria, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        {criteria}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Process Steps</h4>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    {selectedService.escalationProcess.map((step, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Typical Outcomes</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {selectedService.typicalOutcomes.map((outcome, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        {outcome}
                      </li>
                    ))}
                  </ul>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> Make sure you've completed the business's internal complaints process 
                    before escalating to {selectedService.shortName}. You'll need their final response letter or 
                    evidence that 8 weeks have passed since your initial complaint.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please select an ombudsman service from the previous tab to see the escalation process.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="letter" className="space-y-4">
          {selectedService ? (
            <div className="space-y-4">
              {!escalationDraft ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground mb-4">
                      Generate a professional escalation letter for {selectedService.shortName}
                    </p>
                    <Button 
                      onClick={() => generateEscalationLetter(selectedService)}
                      disabled={isGeneratingDraft}
                    >
                      {isGeneratingDraft ? 'Generating...' : 'Generate Escalation Letter'}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Escalation Letter for {selectedService.shortName}</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={copyEscalationText}>
                          Copy Text
                        </Button>
                        <Button size="sm" onClick={() => handleEscalate(selectedService)}>
                          Mark as Escalated
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-muted p-4 rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm font-mono">
                          {escalationDraft}
                        </pre>
                      </div>

                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Next Steps:</strong>
                          <br />
                          1. Copy the letter text above
                          <br />
                          2. Visit {selectedService.contactMethods.onlineForm || selectedService.contactMethods.website}
                          <br />
                          3. Submit your complaint with supporting evidence
                          <br />
                          4. Keep records of all correspondence
                        </AlertDescription>
                      </Alert>

                      <div className="flex gap-2">
                        <Button asChild>
                          <a 
                            href={selectedService.contactMethods.onlineForm || selectedService.contactMethods.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            Submit to {selectedService.shortName}
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        </Button>
                        
                        {selectedService.contactMethods.email && (
                          <Button variant="outline" asChild>
                            <a href={`mailto:${selectedService.contactMethods.email}`}>
                              <Mail className="mr-1 h-3 w-3" />
                              Email
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please select an ombudsman service to generate an escalation letter.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}