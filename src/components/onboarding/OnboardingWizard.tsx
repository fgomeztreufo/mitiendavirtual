import { useState, useEffect, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../../supabaseClient'
import { effectivePlan } from '../../utils/planUtils'
import StepWelcome from './steps/StepWelcome'
import StepBusinessType from './steps/StepBusinessType'
import StepInstagram from './steps/StepInstagram'
import StepWhatsApp from './steps/StepWhatsApp'
import StepPersonality from './steps/StepPersonality'
import StepContent from './steps/StepContent'
import StepDone from './steps/StepDone'

interface OnboardingWizardProps {
  session: Session
  profile: any
  instance: any
  onComplete: () => void
  onRefreshData: () => void
}

type StepId = 'welcome' | 'business' | 'instagram' | 'whatsapp' | 'personality' | 'content' | 'done'

export default function OnboardingWizard({ session, profile, instance, onComplete, onRefreshData }: OnboardingWizardProps) {
  const planCode = effectivePlan(profile)
  const hasWhatsApp = ['pro', 'full'].includes(planCode)
  const hasInstance = !!instance?.id

  const steps: StepId[] = useMemo(() => {
    const base: StepId[] = ['welcome', 'business', 'instagram']
    if (hasWhatsApp) base.push('whatsapp')
    if (hasInstance || base.includes('instagram')) base.push('personality')
    base.push('content', 'done')
    return base
  }, [hasWhatsApp, hasInstance])

  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    const saved = sessionStorage.getItem('onboarding_step')
    if (saved) {
      sessionStorage.removeItem('onboarding_step')
      const idx = steps.indexOf(saved as StepId)
      if (idx !== -1) return idx
    }
    return 0
  })

  const [completedSteps, setCompletedSteps] = useState({
    businessType: !!profile?.business_type && profile.business_type !== 'ecommerce',
    instagram: !!instance?.provider_id,
    whatsapp: false,
    personality: false,
    content: false,
  })

  useEffect(() => {
    setCompletedSteps(prev => ({
      ...prev,
      instagram: !!instance?.provider_id,
    }))
  }, [instance?.provider_id])

  const currentStep = steps[currentStepIndex]

  const goNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
    }
  }

  const goBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }

  const handleComplete = async () => {
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', profile.id)
    } catch (_) {}
    onComplete()
  }

  const handleSkipAll = () => {
    handleComplete()
  }

  const progressSteps = steps.filter(s => s !== 'welcome' && s !== 'done')
  const progressIndex = progressSteps.indexOf(currentStep)

  return (
    <div className="fixed inset-0 z-[60] bg-[#0a0a0a] overflow-y-auto">
      {/* Progress bar */}
      {currentStep !== 'welcome' && currentStep !== 'done' && (
        <div className="sticky top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur-sm border-b border-white/5">
          <div className="max-w-lg mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                Paso {progressIndex + 1} de {progressSteps.length}
              </span>
              <button
                onClick={handleSkipAll}
                className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
              >
                Saltar todo
              </button>
            </div>
            <div className="flex gap-1.5">
              {progressSteps.map((step, i) => (
                <div
                  key={step}
                  className={`h-1 rounded-full flex-1 transition-all duration-500 ${
                    i <= progressIndex
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                      : 'bg-white/5'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step content */}
      <AnimatePresence mode="wait">
        {currentStep === 'welcome' && (
          <StepWelcome
            key="welcome"
            profile={profile}
            onNext={goNext}
            onSkipAll={handleSkipAll}
          />
        )}

        {currentStep === 'business' && (
          <StepBusinessType
            key="business"
            profile={profile}
            onNext={(type) => {
              setCompletedSteps(prev => ({ ...prev, businessType: true }))
              onRefreshData()
              goNext()
            }}
            onBack={goBack}
          />
        )}

        {currentStep === 'instagram' && (
          <StepInstagram
            key="instagram"
            session={session}
            instance={instance}
            onNext={() => {
              setCompletedSteps(prev => ({ ...prev, instagram: true }))
              goNext()
            }}
            onSkip={goNext}
            onBack={goBack}
          />
        )}

        {currentStep === 'whatsapp' && (
          <StepWhatsApp
            key="whatsapp"
            session={session}
            onNext={() => {
              setCompletedSteps(prev => ({ ...prev, whatsapp: true }))
              goNext()
            }}
            onSkip={goNext}
            onBack={goBack}
            onRefreshData={onRefreshData}
          />
        )}

        {currentStep === 'personality' && (
          <StepPersonality
            key="personality"
            instance={instance}
            onNext={() => {
              setCompletedSteps(prev => ({ ...prev, personality: true }))
              goNext()
            }}
            onSkip={goNext}
            onBack={goBack}
          />
        )}

        {currentStep === 'content' && (
          <StepContent
            key="content"
            session={session}
            onNext={() => {
              setCompletedSteps(prev => ({ ...prev, content: true }))
              goNext()
            }}
            onSkip={goNext}
            onBack={goBack}
          />
        )}

        {currentStep === 'done' && (
          <StepDone
            key="done"
            instance={instance}
            completedSteps={completedSteps}
            onFinish={handleComplete}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
