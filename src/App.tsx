import React, { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccessibilityControls } from '@/components/AccessibilityControls'
import { ComplaintIntake } from '@/components/ComplaintIntake'
import { ComplaintDrafter } from '@/components/ComplaintDrafter'
import { ComplaintTracker, ComplaintData } from '@/components/ComplaintTracker'
import { EscalationGuidance } from '@/components/EscalationGuidance'
import { Plus, Shield, Clock, Users } from '@phosphor-icons/react'
import { toast, Toaster } from 'sonner'

interface AccessibilitySettings {
  highContrast: boolean
  fontSize: 'normal' | 'large' | 'extra-large'
  reducedMotion: boolean
  screenReader: boolean
  voiceEnabled: boolean
}

type AppView = 'home' | 'intake' | 'draft' | 'escalate'

function App() {
  const [currentView, setCurrentView] = useState<AppView>('home')
  const [currentComplaint, setCurrentComplaint] = useState<ComplaintData | null>(null)
  const [complaints, setComplaints] = useKV<ComplaintData[]>('complaints', [])
  const [accessibilitySettings, setAccessibilitySettings] = useKV<AccessibilitySettings>('accessibility-settings', {
    voiceEnabled: false,
    highContrast: false,
    fontSize: 'normal',
    reducedMotion: false,
    screenReader: false
  })
  const [showAccessibilityControls, setShowAccessibilityControls] = useState(false)

  // Apply accessibility settings to document
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      
      // Apply high contrast
      root.classList.toggle('high-contrast', accessibilitySettings.highContrast)
      
      // Apply reduced motion
      root.classList.toggle('reduced-motion', accessibilitySettings.reducedMotion)
      
      // Apply font size
      const fontSize = accessibilitySettings.fontSize === 'large' ? '18px' : 
                     accessibilitySettings.fontSize === 'extra-large' ? '20px' : '16px'
      root.style.fontSize = fontSize
    }
  }, [accessibilitySettings])

  const handleComplaintCreated = (complaint: ComplaintData) => {
    // Initialize with history
    const complaintWithHistory = {
      ...complaint,
      history: [{
        timestamp: new Date().toISOString(),
        event: 'created' as const,
        notes: 'Complaint created through guided intake'
      }]
    }
    setCurrentComplaint(complaintWithHistory)
    setCurrentView('draft')
    toast.success('Complaint created! Now generating your draft...')
  }

  const handleDraftUpdated = (updatedComplaint: ComplaintData) => {
    setCurrentComplaint(updatedComplaint)
    setComplaints(prev => {
      const existing = prev.find(c => c.id === updatedComplaint.id)
      if (existing) {
        return prev.map(c => c.id === updatedComplaint.id ? updatedComplaint : c)
      } else {
        return [...prev, updatedComplaint]
      }
    })
  }

  const handleViewComplaint = (complaint: ComplaintData) => {
    setCurrentComplaint(complaint)
    setCurrentView('draft')
  }

  const handleEscalateComplaint = (complaint: ComplaintData) => {
    setCurrentComplaint(complaint)
    setCurrentView('escalate')
  }

  const startNewComplaint = () => {
    setCurrentComplaint(null)
    setCurrentView('intake')
  }

  const goHome = () => {
    setCurrentView('home')
    setCurrentComplaint(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <AccessibilityControls 
        isOpen={showAccessibilityControls} 
        onOpenChange={setShowAccessibilityControls}
        settings={accessibilitySettings}
        onSettingsChange={(newSettings) => setAccessibilitySettings(() => newSettings)}
      />
      <Toaster position="top-center" />
      
      {/* Skip to main content link for screen readers */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-primary text-primary-foreground px-4 py-2 rounded z-50"
      >
        Skip to main content
      </a>

      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">AccessAssist</h1>
                <p className="text-sm text-muted-foreground">Inclusive AI for Complaints</p>
              </div>
            </div>
            
            {currentView !== 'home' && (
              <Button variant="outline" onClick={goHome} aria-label="Return to home">
                ← Home
              </Button>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" className="container mx-auto px-4 py-8">
        {currentView === 'home' && (
          <div className="space-y-8">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold">Make Your Voice Heard</h2>
              <p className="text-lg text-muted-foreground">
                AccessAssist helps you create professional complaint letters with AI assistance. 
                Designed for everyone - voice input, real-time UK sign language recognition with hand tracking, screen reader support, and plain language guidance.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
              <Card className="text-center p-6">
                <div className="space-y-3">
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">Start New Complaint</h3>
                  <p className="text-sm text-muted-foreground">
                    Guided process with voice input and clear prompts
                  </p>
                  <Button onClick={startNewComplaint} className="w-full">
                    Create Complaint
                  </Button>
                </div>
              </Card>

              <Card className="text-center p-6">
                <div className="space-y-3">
                  <div className="mx-auto w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                    <Clock className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="font-semibold">Track Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitor deadlines and get escalation guidance
                  </p>
                  <Button variant="outline" className="w-full" disabled={complaints.length === 0}>
                    View Tracker ({complaints.length})
                  </Button>
                </div>
              </Card>

                  <Card className="text-center p-6">
                <div className="space-y-3">
                  <div className="mx-auto w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-semibold">Accessibility First</h3>
                  <p className="text-sm text-muted-foreground">
                    Voice, text, real-time UK sign language recognition, high contrast, and screen reader support
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setShowAccessibilityControls(true)}
                    aria-label="Open accessibility settings"
                  >
                    Settings
                  </Button>
                </div>
              </Card>
            </div>

            {complaints.length > 0 && (
              <div className="max-w-5xl mx-auto">
                <ComplaintTracker
                  complaints={complaints}
                  onViewComplaint={handleViewComplaint}
                  onEscalateComplaint={handleEscalateComplaint}
                />
              </div>
            )}

            <div className="max-w-3xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">How AccessAssist Works</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <h4 className="font-medium">1. Guided Intake</h4>
                      <p className="text-sm text-muted-foreground">
                        Answer simple questions about your issue. Use voice input, type responses, or use real-time UK Sign Language recognition.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">2. AI Drafting</h4>
                      <p className="text-sm text-muted-foreground">
                        Our AI creates a professional complaint using consumer rights information.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">3. Export & Send</h4>
                      <p className="text-sm text-muted-foreground">
                        Copy to email, web forms, or download as an accessible document.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">4. Track & Escalate</h4>
                      <p className="text-sm text-muted-foreground">
                        Monitor deadlines and get guidance on next steps if needed.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardContent className="p-6">
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium">Accessibility Commitment</p>
                    <p className="text-xs text-muted-foreground">
                      WCAG 2.2 AA compliant • Screen reader optimized • Voice input support • Real-time UK Sign Language recognition •
                      High contrast mode • Keyboard navigation • Plain language (Grade 8 level)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Disclaimer:</strong> This tool provides informational guidance, not legal advice.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {currentView === 'intake' && (
          <ComplaintIntake
            onComplaintCreated={handleComplaintCreated}
            voiceEnabled={accessibilitySettings.voiceEnabled}
          />
        )}

        {currentView === 'draft' && currentComplaint && (
          <ComplaintDrafter
            complaint={currentComplaint}
            onDraftUpdated={handleDraftUpdated}
            onBackToIntake={() => setCurrentView('intake')}
          />
        )}

        {currentView === 'escalate' && currentComplaint && (
          <EscalationGuidance
            complaint={currentComplaint}
            onBack={goHome}
            onComplaintUpdated={handleDraftUpdated}
          />
        )}
      </main>

      <footer className="border-t bg-card mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>AccessAssist - Making complaint processes inclusive and accessible for all</p>
            <p className="mt-2">Built with accessibility, consumer rights, and user empowerment in mind</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App