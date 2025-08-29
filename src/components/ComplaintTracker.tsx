import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Clock, CheckCircle, AlertTriangle, ArrowRight } from '@phosphor-icons/react'

export interface ComplaintData {
  id: string
  company: {
    name: string
    channel: 'email' | 'webform' | 'letter'
    contact?: string
  }
  issue: string
  evidence: Array<{
    type: 'text' | 'date' | 'reference'
    description: string
    value: string
  }>
  impact: string
  desiredRemedy: string
  deadline?: string
  status: 'draft' | 'submitted' | 'acknowledged' | 'due' | 'escalate' | 'resolved'
  createdAt: string
  draftText?: string
}

interface ComplaintTrackerProps {
  complaints: ComplaintData[]
  onViewComplaint: (complaint: ComplaintData) => void
  onEscalateComplaint: (complaint: ComplaintData) => void
}

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: Clock },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  acknowledged: { label: 'Acknowledged', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  due: { label: 'Response Due', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  escalate: { label: 'Needs Escalation', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800', icon: CheckCircle }
}

export function ComplaintTracker({ complaints, onViewComplaint, onEscalateComplaint }: ComplaintTrackerProps) {
  if (complaints.length === 0) {
    return (
      <Card className="text-center p-8">
        <CardContent>
          <p className="text-muted-foreground mb-4">No complaints to track yet.</p>
          <p className="text-sm text-muted-foreground">
            Start by creating your first complaint to see tracking information here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4" role="region" aria-labelledby="complaint-tracker-title">
      <h2 id="complaint-tracker-title" className="text-2xl font-semibold">Complaint Tracker</h2>
      
      <div className="grid gap-4">
        {complaints.map((complaint) => {
          const StatusIcon = statusConfig[complaint.status].icon
          const daysElapsed = Math.floor((Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          const deadlineDate = complaint.deadline ? new Date(complaint.deadline) : null
          const isOverdue = deadlineDate && deadlineDate < new Date()
          
          return (
            <Card key={complaint.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">
                    Complaint to {complaint.company.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {complaint.issue}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Badge className={statusConfig[complaint.status].color} variant="secondary">
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig[complaint.status].label}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Created: {new Date(complaint.createdAt).toLocaleDateString()}</span>
                  {complaint.deadline && (
                    <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                      Deadline: {deadlineDate.toLocaleDateString()}
                      {isOverdue && ' (Overdue)'}
                    </span>
                  )}
                </div>

                {complaint.status !== 'draft' && complaint.status !== 'resolved' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{daysElapsed} days elapsed</span>
                    </div>
                    <Progress 
                      value={complaint.status === 'submitted' ? 25 : complaint.status === 'acknowledged' ? 50 : 75} 
                      className="h-2"
                      aria-label={`Complaint progress: ${complaint.status}`}
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewComplaint(complaint)}
                    className="flex items-center gap-1"
                  >
                    View Details
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                  
                  {(complaint.status === 'due' || complaint.status === 'escalate' || isOverdue) && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onEscalateComplaint(complaint)}
                      className="flex items-center gap-1 bg-accent hover:bg-accent/90"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Escalate
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}