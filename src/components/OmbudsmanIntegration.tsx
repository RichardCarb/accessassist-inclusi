import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExternalLink, Search, Building, Phone, Mail, Globe } from '@phosphor-icons/react'
import { ComplaintData } from './ComplaintTracker'
import { toast } from 'sonner'

interface OmbudsmanInfo {
  name: string
  sector: string
  website: string
  phone?: string
  email?: string
  onlineComplaintForm?: string
  eligibilityCriteria: string[]
  averageResolutionTime: string
  freeService: boolean
  languages: string[]
  accessibility: string[]
}

interface OmbudsmanIntegrationProps {
  complaint: ComplaintData
  onEscalationAdvice: (advice: string, ombudsman?: OmbudsmanInfo) => void
}

const OMBUDSMAN_DATABASE: Record<string, OmbudsmanInfo[]> = {
  'financial': [
    {
      name: 'Financial Ombudsman Service',
      sector: 'Banking, insurance, investments, credit',
      website: 'https://www.financial-ombudsman.org.uk',
      phone: '0800 023 4567',
      email: 'complaint.info@financial-ombudsman.org.uk',
      onlineComplaintForm: 'https://www.financial-ombudsman.org.uk/consumers/how-to-complain',
      eligibilityCriteria: [
        'Must complain to the business first',
        'Maximum £10m annual turnover for businesses',
        'Complaint must be made within 6 years of the event',
        'Free service for consumers'
      ],
      averageResolutionTime: '90 days',
      freeService: true,
      languages: ['English', 'Welsh', 'Translation services available'],
      accessibility: ['Phone relay service', 'Large print documents', 'BSL interpretation', 'Easy read formats']
    }
  ],
  'telecommunications': [
    {
      name: 'Ofcom (Communications Ombudsman)',
      sector: 'Phone, broadband, TV services',
      website: 'https://www.ofcom.org.uk',
      phone: '0300 123 3333',
      onlineComplaintForm: 'https://www.ofcom.org.uk/make-a-complaint',
      eligibilityCriteria: [
        'Must complain to provider first',
        'Provider must be Ofcom-regulated',
        'Complaint relates to billing, service quality, or accessibility'
      ],
      averageResolutionTime: '8 weeks',
      freeService: true,
      languages: ['English', 'Welsh', 'Translation available'],
      accessibility: ['Textphone service', 'BSL interpretation', 'Easy read guides']
    }
  ],
  'energy': [
    {
      name: 'Energy Ombudsman',
      sector: 'Gas and electricity suppliers',
      website: 'https://www.ombudsman-services.org/sectors/energy',
      phone: '0330 440 1624',
      email: 'enquiry@ombudsman-services.org',
      onlineComplaintForm: 'https://www.ombudsman-services.org/make-a-complaint',
      eligibilityCriteria: [
        'Must complain to energy supplier first',
        'Supplier must be scheme member',
        'Complaint must be made within 12 months'
      ],
      averageResolutionTime: '56 days',
      freeService: true,
      languages: ['English', 'Translation services'],
      accessibility: ['Large print', 'Audio formats', 'BSL interpretation']
    }
  ],
  'property': [
    {
      name: 'Property Ombudsman',
      sector: 'Estate agents, lettings, property management',
      website: 'https://www.tpos.co.uk',
      phone: '01722 333306',
      email: 'admin@tpos.co.uk',
      onlineComplaintForm: 'https://www.tpos.co.uk/consumers/make-a-complaint',
      eligibilityCriteria: [
        'Agent must be TPO member',
        'Must complain to agent first',
        'Complaint within 12 months of final response'
      ],
      averageResolutionTime: '12 weeks',
      freeService: true,
      languages: ['English'],
      accessibility: ['Large print available', 'Phone support']
    }
  ],
  'retail': [
    {
      name: 'Alternative Dispute Resolution (ADR) Approved Bodies',
      sector: 'General retail, services',
      website: 'https://www.gov.uk/government/publications/alternative-dispute-resolution-approved-bodies',
      eligibilityCriteria: [
        'Varies by ADR provider',
        'Must try to resolve with trader first',
        'Check if trader is signed up to ADR scheme'
      ],
      averageResolutionTime: '90 days',
      freeService: true,
      languages: ['Varies by provider'],
      accessibility: ['Varies by provider']
    }
  ],
  'transport': [
    {
      name: 'Rail Ombudsman',
      sector: 'Train operators, Network Rail',
      website: 'https://www.railombudsman.org',
      phone: '0330 094 0362',
      onlineComplaintForm: 'https://www.railombudsman.org/using-our-service/',
      eligibilityCriteria: [
        'Must complain to rail company first',
        'Company must be scheme member',
        'Free service for passengers'
      ],
      averageResolutionTime: '40 working days',
      freeService: true,
      languages: ['English', 'Welsh'],
      accessibility: ['BSL interpretation', 'Large print', 'Easy read']
    }
  ]
}

export function OmbudsmanIntegration({ complaint, onEscalationAdvice }: OmbudsmanIntegrationProps) {
  const [relevantOmbudsmen, setRelevantOmbudsmen] = useState<OmbudsmanInfo[]>([])
  const [selectedOmbudsman, setSelectedOmbudsman] = useState<OmbudsmanInfo | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [escalationGuidance, setEscalationGuidance] = useState('')

  useEffect(() => {
    analyzeComplaintForOmbudsman()
  }, [complaint])

  const analyzeComplaintForOmbudsman = async () => {
    setIsAnalyzing(true)
    
    try {
      // Use AI to determine the most relevant ombudsman
      const analysisPrompt = spark.llmPrompt`
        Analyze this consumer complaint to determine which UK ombudsman or dispute resolution service would be most appropriate:
        
        Company: ${complaint.company.name}
        Issue: ${complaint.issue}
        Impact: ${complaint.impact}
        Evidence: ${complaint.evidence.map(e => `${e.description}: ${e.value}`).join(', ')}
        
        Based on the available sectors: financial, telecommunications, energy, property, retail, transport
        
        Please respond with JSON in this format:
        {
          "primarySector": "sector_name",
          "confidence": "high|medium|low",
          "reasoning": "explanation of why this sector fits",
          "alternativeSectors": ["other_possible_sectors"],
          "companyType": "description of what type of business this appears to be"
        }
      `
      
      const analysis = await spark.llm(analysisPrompt, 'gpt-4o', true)
      const parsed = JSON.parse(analysis)
      
      // Get ombudsmen for the identified sector
      const primary = OMBUDSMAN_DATABASE[parsed.primarySector] || []
      const alternatives = parsed.alternativeSectors?.flatMap((sector: string) => 
        OMBUDSMAN_DATABASE[sector] || []
      ) || []
      
      const allRelevant = [...primary, ...alternatives]
      setRelevantOmbudsmen(allRelevant)
      
      if (allRelevant.length > 0) {
        setSelectedOmbudsman(allRelevant[0])
        generateEscalationGuidance(allRelevant[0], parsed)
      }
      
    } catch (error) {
      console.error('Error analyzing complaint:', error)
      toast.error('Could not analyze complaint for ombudsman matching')
      
      // Fallback: show all ombudsmen
      const allOmbudsmen = Object.values(OMBUDSMAN_DATABASE).flat()
      setRelevantOmbudsmen(allOmbudsmen)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generateEscalationGuidance = async (ombudsman: OmbudsmanInfo, analysis: any) => {
    try {
      const guidancePrompt = spark.llmPrompt`
        Generate specific escalation guidance for this complaint to the ${ombudsman.name}:
        
        Complaint Details:
        - Complainant: ${complaint.complainantName}
        - Company: ${complaint.company.name}
        - Issue: ${complaint.issue}
        - Impact: ${complaint.impact}
        - Desired remedy: ${complaint.desiredRemedy}
        
        Ombudsman Details:
        - Service: ${ombudsman.name}
        - Sector: ${ombudsman.sector}
        - Eligibility: ${ombudsman.eligibilityCriteria.join(', ')}
        - Average resolution: ${ombudsman.averageResolutionTime}
        
        Create a step-by-step guide that includes:
        1. Eligibility check - does this complaint qualify?
        2. Required documentation and evidence
        3. How to submit the complaint
        4. What to expect during the process
        5. Accessibility support available
        
        Make this practical and actionable for someone who needs to escalate their complaint.
        Use plain English and be encouraging but realistic about timelines.
      `
      
      const guidance = await spark.llm(guidancePrompt)
      setEscalationGuidance(guidance)
      
    } catch (error) {
      console.error('Error generating guidance:', error)
      setEscalationGuidance('Unable to generate specific guidance. Please visit the ombudsman website for more information.')
    }
  }

  const handleSelectOmbudsman = (ombudsman: OmbudsmanInfo) => {
    setSelectedOmbudsman(ombudsman)
    generateEscalationGuidance(ombudsman, { reasoning: 'User selected' })
  }

  const handleUseGuidance = () => {
    onEscalationAdvice(escalationGuidance, selectedOmbudsman)
    toast.success('Escalation guidance added to your complaint')
  }

  if (isAnalyzing) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Analyzing your complaint for ombudsman matching...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Ombudsman & Dispute Resolution Services
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Independent services that can help resolve your complaint for free
          </p>
        </CardHeader>
      </Card>

      {relevantOmbudsmen.length === 0 ? (
        <Alert>
          <Search className="h-4 w-4" />
          <AlertDescription>
            No specific ombudsman services found for this type of complaint. 
            You may need to pursue other resolution methods or check if the company 
            belongs to any industry-specific dispute resolution schemes.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {relevantOmbudsmen.map((ombudsman, index) => (
            <Card 
              key={index}
              className={`cursor-pointer transition-colors ${
                selectedOmbudsman?.name === ombudsman.name 
                  ? 'border-primary bg-primary/5' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => handleSelectOmbudsman(ombudsman)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{ombudsman.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{ombudsman.sector}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>~{ombudsman.averageResolutionTime}</span>
                </div>
                
                {ombudsman.freeService && (
                  <Badge variant="secondary" className="w-fit">
                    Free Service
                  </Badge>
                )}
                
                <div className="space-y-1">
                  {ombudsman.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{ombudsman.phone}</span>
                    </div>
                  )}
                  {ombudsman.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{ombudsman.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    <a 
                      href={ombudsman.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Visit Website <ExternalLink className="h-3 w-3 inline" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedOmbudsman && (
        <Card>
          <CardHeader>
            <CardTitle>Escalation Guidance: {selectedOmbudsman.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="guidance" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="guidance">Step-by-Step Guide</TabsTrigger>
                <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
                <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
              </TabsList>
              
              <TabsContent value="guidance" className="space-y-4">
                {escalationGuidance ? (
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap">{escalationGuidance}</div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Generating personalized guidance...</p>
                )}
                
                {selectedOmbudsman.onlineComplaintForm && (
                  <Alert>
                    <ExternalLink className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Online Complaint Form:</strong>{' '}
                      <a 
                        href={selectedOmbudsman.onlineComplaintForm} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Submit your complaint directly {' '}
                        <ExternalLink className="h-3 w-3 inline" />
                      </a>
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
              
              <TabsContent value="eligibility" className="space-y-3">
                <h4 className="font-medium">Eligibility Criteria:</h4>
                <ul className="space-y-2">
                  {selectedOmbudsman.eligibilityCriteria.map((criteria, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary">•</span>
                      <span>{criteria}</span>
                    </li>
                  ))}
                </ul>
              </TabsContent>
              
              <TabsContent value="accessibility" className="space-y-3">
                <h4 className="font-medium">Accessibility Support:</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <h5 className="text-sm font-medium">Languages:</h5>
                    <ul className="text-sm text-muted-foreground">
                      {selectedOmbudsman.languages.map((lang, index) => (
                        <li key={index}>• {lang}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium">Accessibility Features:</h5>
                    <ul className="text-sm text-muted-foreground">
                      {selectedOmbudsman.accessibility.map((feature, index) => (
                        <li key={index}>• {feature}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex gap-3 mt-6">
              <Button onClick={handleUseGuidance} disabled={!escalationGuidance}>
                Use This Guidance
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open(selectedOmbudsman.website, '_blank')}
              >
                Visit {selectedOmbudsman.name} <ExternalLink className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}