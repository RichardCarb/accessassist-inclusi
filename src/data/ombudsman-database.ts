// Ombudsman and regulatory body database for escalation guidance
export interface OmbudsmanService {
  id: string
  name: string
  shortName: string
  description: string
  sectors: string[]
  contactMethods: {
    website: string
    phone?: string
    email?: string
    onlineForm?: string
  }
  jurisdiction: string[]
  freeService: boolean
  timeframes: {
    initialResponse: string
    investigation: string
  }
  eligibilityCriteria: string[]
  escalationProcess: string[]
  typicalOutcomes: string[]
}

export const ombudsmanDatabase: OmbudsmanService[] = [
  {
    id: 'financial-ombudsman',
    name: 'Financial Ombudsman Service',
    shortName: 'FOS',
    description: 'Independent service resolving complaints between consumers and financial companies',
    sectors: ['banking', 'insurance', 'credit', 'loans', 'pensions', 'investments', 'mortgages'],
    contactMethods: {
      website: 'https://www.financial-ombudsman.org.uk',
      phone: '0800 023 4567',
      email: 'complaint.info@financial-ombudsman.org.uk',
      onlineForm: 'https://www.financial-ombudsman.org.uk/consumers/how-to-complain'
    },
    jurisdiction: ['England', 'Wales', 'Scotland', 'Northern Ireland'],
    freeService: true,
    timeframes: {
      initialResponse: '5 working days',
      investigation: 'Up to 90 days'
    },
    eligibilityCriteria: [
      'Complained to the business first and received final response or 8 weeks have passed',
      'Complaint within 6 years of the problem or 3 years of becoming aware',
      'Individual or small business (annual turnover under £6.5m)'
    ],
    escalationProcess: [
      'Complete online complaint form or call',
      'Provide details of your complaint to the business',
      'Submit evidence and final response letter',
      'Case assigned to investigator',
      'Investigation and provisional decision',
      'Final decision if no agreement reached'
    ],
    typicalOutcomes: [
      'Apology from the business',
      'Payment of compensation',
      'Correction of records',
      'Waiving of charges or fees',
      'Changes to business processes'
    ]
  },
  {
    id: 'property-ombudsman',
    name: 'The Property Ombudsman',
    shortName: 'TPO',
    description: 'Independent service for property agents and related services',
    sectors: ['estate agents', 'letting agents', 'property management', 'surveying'],
    contactMethods: {
      website: 'https://www.tpos.co.uk',
      phone: '01722 333306',
      email: 'admin@tpos.co.uk',
      onlineForm: 'https://www.tpos.co.uk/consumers/make-a-complaint'
    },
    jurisdiction: ['England', 'Wales', 'Scotland', 'Northern Ireland'],
    freeService: true,
    timeframes: {
      initialResponse: '5 working days',
      investigation: 'Up to 12 weeks'
    },
    eligibilityCriteria: [
      'Agent is registered with TPO',
      'Complained to agent first and received final response or 8 weeks passed',
      'Complaint within 12 months of final response'
    ],
    escalationProcess: [
      'Check agent registration on TPO website',
      'Submit complaint form with evidence',
      'Initial assessment by TPO staff',
      'Investigation if case meets criteria',
      'Draft decision issued',
      'Final decision and award if upheld'
    ],
    typicalOutcomes: [
      'Compensation up to £25,000',
      'Correction of property details',
      'Refund of fees',
      'Apology and process improvements'
    ]
  },
  {
    id: 'telecoms-ombudsman',
    name: 'Ombudsman Services: Communications',
    shortName: 'Ofcom-approved ADR',
    description: 'Resolves disputes between consumers and telecoms/postal service providers',
    sectors: ['mobile phones', 'broadband', 'landline', 'tv services', 'postal services'],
    contactMethods: {
      website: 'https://www.ombudsman-services.org/sectors/communications',
      phone: '0330 440 1614',
      email: 'osenquiries@os-communications.org',
      onlineForm: 'https://www.ombudsman-services.org/make-a-complaint'
    },
    jurisdiction: ['England', 'Wales', 'Scotland', 'Northern Ireland'],
    freeService: true,
    timeframes: {
      initialResponse: '3 working days',
      investigation: '8 weeks'
    },
    eligibilityCriteria: [
      'Provider is Ofcom-regulated',
      'Complained to provider and received deadlock letter or 8 weeks passed',
      'Complaint within 12 months of final response'
    ],
    escalationProcess: [
      'Submit online complaint with reference number',
      'Provide final response from provider',
      'Case reviewed for eligibility',
      'Investigation and evidence gathering',
      'Provisional view shared',
      'Final decision issued'
    ],
    typicalOutcomes: [
      'Service credits or refunds',
      'Compensation for inconvenience',
      'Early termination without penalty',
      'Correction of billing errors'
    ]
  },
  {
    id: 'energy-ombudsman',
    name: 'Ombudsman Services: Energy',
    shortName: 'Energy Ombudsman',
    description: 'Independent dispute resolution for energy consumers',
    sectors: ['gas supply', 'electricity supply', 'energy efficiency', 'renewable energy'],
    contactMethods: {
      website: 'https://www.ombudsman-services.org/sectors/energy',
      phone: '0330 440 1624',
      email: 'enquiry@ombudsman-services.org',
      onlineForm: 'https://www.ombudsman-services.org/make-a-complaint'
    },
    jurisdiction: ['England', 'Wales', 'Scotland'],
    freeService: true,
    timeframes: {
      initialResponse: '5 working days',
      investigation: '8 weeks'
    },
    eligibilityCriteria: [
      'Energy supplier is registered scheme member',
      'Complained to supplier and received final response or 8 weeks passed',
      'Complaint within 12 months of final response'
    ],
    escalationProcess: [
      'Check supplier membership',
      'Submit complaint with evidence',
      'Eligibility assessment',
      'Case investigation',
      'Provisional decision',
      'Final determination'
    ],
    typicalOutcomes: [
      'Bill corrections and refunds',
      'Compensation for poor service',
      'Meter reading corrections',
      'Process improvements'
    ]
  },
  {
    id: 'retail-adr',
    name: 'Retail ADR',
    shortName: 'Retail ADR',
    description: 'Alternative dispute resolution for retail purchases',
    sectors: ['online retail', 'high street retail', 'electronics', 'furniture', 'clothing'],
    contactMethods: {
      website: 'https://www.retailadr.org.uk',
      phone: '0203 540 8063',
      email: 'info@retailadr.org.uk',
      onlineForm: 'https://www.retailadr.org.uk/make-a-complaint/'
    },
    jurisdiction: ['England', 'Wales', 'Scotland', 'Northern Ireland'],
    freeService: true,
    timeframes: {
      initialResponse: '3 working days',
      investigation: '90 days'
    },
    eligibilityCriteria: [
      'Retailer is registered with Retail ADR',
      'Complained to retailer first',
      'Complaint relates to goods or services purchased'
    ],
    escalationProcess: [
      'Verify retailer registration',
      'Submit complaint online',
      'Provide purchase details and evidence',
      'Mediation attempted if appropriate',
      'Adjudication if mediation unsuccessful',
      'Binding decision issued'
    ],
    typicalOutcomes: [
      'Full or partial refund',
      'Repair or replacement',
      'Compensation for damages',
      'Store credit or vouchers'
    ]
  },
  {
    id: 'automotive-ombudsman',
    name: 'The Motor Ombudsman',
    shortName: 'TMO',
    description: 'Automotive dispute resolution and consumer protection',
    sectors: ['car sales', 'car servicing', 'vehicle warranties', 'car finance'],
    contactMethods: {
      website: 'https://www.themotorombudsman.org',
      phone: '0345 241 3008',
      email: 'enquiries@themotorombudsman.org',
      onlineForm: 'https://www.themotorombudsman.org/consumers/alternative-dispute-resolution'
    },
    jurisdiction: ['England', 'Wales', 'Scotland', 'Northern Ireland'],
    freeService: true,
    timeframes: {
      initialResponse: '5 working days',
      investigation: '40 working days'
    },
    eligibilityCriteria: [
      'Business is Motor Ombudsman accredited',
      'Complained to business and received final response',
      'Complaint within 6 months of final response'
    ],
    escalationProcess: [
      'Check business accreditation',
      'Complete online application',
      'Provide vehicle and complaint details',
      'Technical assessment if required',
      'Adjudication process',
      'Final award decision'
    ],
    typicalOutcomes: [
      'Repair costs coverage',
      'Vehicle replacement',
      'Refund of purchase price',
      'Compensation for inconvenience'
    ]
  }
]

// Helper functions for finding relevant ombudsman services
export function findOmbudsmanByCompany(companyName: string): OmbudsmanService[] {
  const company = companyName.toLowerCase()
  
  // Simple keyword matching - in real implementation, this would use a comprehensive database
  const matches: OmbudsmanService[] = []
  
  ombudsmanDatabase.forEach(service => {
    service.sectors.forEach(sector => {
      if (company.includes(sector) || 
          company.includes('bank') && sector === 'banking' ||
          company.includes('insurance') && sector === 'insurance' ||
          company.includes('mobile') && sector === 'mobile phones' ||
          company.includes('broadband') && sector === 'broadband' ||
          company.includes('energy') && (sector === 'gas supply' || sector === 'electricity supply') ||
          company.includes('estate agent') && sector === 'estate agents' ||
          company.includes('retail') && sector.includes('retail')) {
        if (!matches.find(m => m.id === service.id)) {
          matches.push(service)
        }
      }
    })
  })
  
  return matches
}

export function findOmbudsmanBySector(sector: string): OmbudsmanService[] {
  return ombudsmanDatabase.filter(service => 
    service.sectors.some(s => s.toLowerCase().includes(sector.toLowerCase()))
  )
}

export function getAllOmbudsmanServices(): OmbudsmanService[] {
  return ombudsmanDatabase
}