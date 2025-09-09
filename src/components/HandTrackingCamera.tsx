import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Hand, ArrowRight } from '@phosphor-icons/react'
import Sign2TextRecorder from './Sign2TextRecorder'

interface HandTrackingCameraProps {
  onClose: () => void
}

export function HandTrackingCamera({ onClose }: HandTrackingCameraProps) {
  return (
    <div className="w-full max-w-6xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hand className="h-5 w-5" />
            New Sign2Text System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">System Rebuilt</h4>
            <p className="text-sm text-blue-700 mb-4">
              The hand tracking system has been completely rebuilt with a clean, modern architecture 
              based on the sign2text approach. This new system provides more reliable hand detection 
              and sign language recognition.
            </p>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700">
              <div>
                <p className="font-medium mb-1">New Features:</p>
                <ul className="space-y-1">
                  <li>• Real-time hand landmark detection</li>
                  <li>• Improved sign recognition accuracy</li>
                  <li>• Clean visual feedback system</li>
                  <li>• Better error handling and recovery</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">Technical Improvements:</p>
                <ul className="space-y-1">
                  <li>• Simplified architecture</li>
                  <li>• Better performance optimization</li>
                  <li>• More reliable camera handling</li>
                  <li>• Enhanced accessibility features</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 justify-center">
            <Sign2TextRecorder 
              onTranscriptGenerated={(transcript) => {
                console.log('Transcript generated:', transcript)
                // Here you would typically pass the transcript to ComplaintIntake
                onClose()
              }}
              onClose={onClose}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}