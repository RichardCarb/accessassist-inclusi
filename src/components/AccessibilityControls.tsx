import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AccessibilityIcon, EyeIcon, SpeakerHigh, TextAa } from '@phosphor-icons/react'

interface AccessibilitySettings {
  highContrast: boolean
  fontSize: 'normal' | 'large' | 'extra-large'
  reducedMotion: boolean
  screenReader: boolean
  voiceEnabled: boolean
}

interface AccessibilityControlsProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  settings?: AccessibilitySettings
  onSettingsChange?: (settings: AccessibilitySettings) => void
}

export function AccessibilityControls({ 
  isOpen: externalIsOpen, 
  onOpenChange,
  settings: externalSettings,
  onSettingsChange 
}: AccessibilityControlsProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [internalSettings, setInternalSettings] = useKV<AccessibilitySettings>('accessibility-settings', {
    highContrast: false,
    fontSize: 'normal',
    reducedMotion: false,
    screenReader: false,
    voiceEnabled: false
  })

  // Use external control if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = onOpenChange || setInternalIsOpen
  const settings = externalSettings || internalSettings

  const updateSetting = (key: keyof AccessibilitySettings, value: any) => {
    const newSettings = { ...settings, [key]: value }
    if (onSettingsChange) {
      onSettingsChange(newSettings)
    } else {
      setInternalSettings(newSettings)
    }
  }

  // Apply settings to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      root.classList.toggle('high-contrast', settings.highContrast)
      root.classList.toggle('reduced-motion', settings.reducedMotion)
      root.style.fontSize = settings.fontSize === 'large' ? '18px' : settings.fontSize === 'extra-large' ? '20px' : '16px'
    }
  }, [settings])

  // Only show floating button if not externally controlled
  if (!isOpen && externalIsOpen === undefined) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-50"
        aria-label="Open accessibility controls"
      >
        <AccessibilityIcon className="h-4 w-4" />
        <span className="sr-only">Accessibility Controls</span>
      </Button>
    )
  }

  // Don't render anything if externally controlled and closed
  if (!isOpen) {
    return null
  }

  return (
    <Card className="fixed top-4 right-4 z-50 w-80 p-4 shadow-lg" role="dialog" aria-labelledby="accessibility-title">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="accessibility-title" className="text-lg font-semibold">Accessibility Controls</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
            aria-label="Close accessibility controls"
          >
            ✕
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="high-contrast" className="flex items-center gap-2">
              <EyeIcon className="h-4 w-4" />
              High Contrast
            </Label>
            <Switch
              id="high-contrast"
              checked={settings.highContrast}
              onCheckedChange={(checked) => updateSetting('highContrast', checked)}
              aria-describedby="high-contrast-desc"
            />
          </div>
          <p id="high-contrast-desc" className="text-sm text-muted-foreground">
            Increases contrast for better visibility
          </p>

          <div className="space-y-2">
            <Label htmlFor="font-size" className="flex items-center gap-2">
              <TextAa className="h-4 w-4" />
              Text Size
            </Label>
            <Select value={settings.fontSize} onValueChange={(value) => updateSetting('fontSize', value)}>
              <SelectTrigger id="font-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="extra-large">Extra Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="reduced-motion">Reduced Motion</Label>
            <Switch
              id="reduced-motion"
              checked={settings.reducedMotion}
              onCheckedChange={(checked) => updateSetting('reducedMotion', checked)}
              aria-describedby="reduced-motion-desc"
            />
          </div>
          <p id="reduced-motion-desc" className="text-sm text-muted-foreground">
            Minimizes animations and transitions
          </p>

          <div className="flex items-center justify-between">
            <Label htmlFor="voice-enabled" className="flex items-center gap-2">
              <SpeakerHigh className="h-4 w-4" />
              Voice Controls
            </Label>
            <Switch
              id="voice-enabled"
              checked={settings.voiceEnabled}
              onCheckedChange={(checked) => updateSetting('voiceEnabled', checked)}
              aria-describedby="voice-desc"
            />
          </div>
          <p id="voice-desc" className="text-sm text-muted-foreground">
            Enable voice input and audio feedback
          </p>
        </div>
      </div>
    </Card>
  )
}