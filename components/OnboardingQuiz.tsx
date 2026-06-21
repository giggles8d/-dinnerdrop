'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const STEPS = [
  {
    question: 'How many people are you feeding?',
    field: 'familySize' as const,
    options: [
      { label: '1', value: 1 },
      { label: '2', value: 2 },
      { label: '3', value: 3 },
      { label: '4', value: 4 },
      { label: '5+', value: 5 },
    ],
  },
  {
    question: "What's your weekly grocery budget?",
    field: 'weeklyBudget' as const,
    options: [
      { label: '$75', value: '$75' },
      { label: '$100', value: '$100' },
      { label: '$150', value: '$150' },
      { label: '$200', value: '$200' },
      { label: '$250+', value: '$250+' },
    ],
  },
  {
    question: 'How long can you cook on a weeknight?',
    field: 'maxCookTime' as const,
    options: [
      { label: '20 min', value: 20 },
      { label: '30 min', value: 30 },
      { label: '45 min', value: 45 },
      { label: '60 min', value: 60 },
    ],
  },
  {
    question: 'What flavors does your family love?',
    field: 'cuisinePreference' as const,
    multiSelect: true,
    options: [
      { label: 'American', value: 'American' },
      { label: 'Mexican', value: 'Mexican' },
      { label: 'Asian', value: 'Asian' },
      { label: 'Mediterranean', value: 'Mediterranean' },
      { label: 'Italian', value: 'Italian' },
      { label: 'Mix it up', value: 'mixed' },
    ],
  },
  {
    question: 'Any restrictions?',
    field: 'dietaryNeeds' as const,
    multiSelect: true,
    options: [
      { label: 'None', value: 'None' },
      { label: 'Vegetarian', value: 'Vegetarian' },
      { label: 'Vegan', value: 'Vegan' },
      { label: 'Gluten-free', value: 'Gluten-free' },
      { label: 'Dairy-free', value: 'Dairy-free' },
      { label: 'Keto', value: 'Keto' },
      { label: 'Halal', value: 'Halal' },
    ],
  },
  {
    question: 'Where do you usually shop for groceries?',
    field: 'preferredStore' as const,
    options: [
      { label: 'Walmart', value: 'Walmart' },
      { label: 'Amazon Fresh', value: 'Amazon Fresh' },
      { label: 'Instacart', value: 'Instacart' },
      { label: 'Target', value: 'Target' },
      { label: 'Kroger', value: 'Kroger' },
    ],
  },
]

interface Answers {
  familySize: number
  weeklyBudget: string
  maxCookTime: number
  cuisinePreference: string[]
  dietaryNeeds: string[]
  preferredStore: string
}

function OnboardingQuizInner() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({
    familySize: 2,
    weeklyBudget: '$100',
    maxCookTime: 30,
    cuisinePreference: [],
    dietaryNeeds: [],
    preferredStore: '',
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get('next') || null
  const supabase = createClient()

  const currentStep = STEPS[step]

  function handleSelect(value: string | number) {
    const field = currentStep.field

    if (currentStep.multiSelect) {
      const current = answers[field] as string[]
      if (value === 'None') {
        setAnswers({ ...answers, [field]: ['None'] })
      } else {
        const filtered = current.filter((v) => v !== 'None')
        if (filtered.includes(value as string)) {
          setAnswers({ ...answers, [field]: filtered.filter((v) => v !== value) })
        } else {
          setAnswers({ ...answers, [field]: [...filtered, value as string] })
        }
      }
    } else {
      setAnswers({ ...answers, [field]: value })
      if (step < STEPS.length - 1) {
        // Auto-advance for single-select
        setTimeout(() => setStep(step + 1), 200)
      } else {
        // Final single-select step (store): auto-submit so there's no dead-end.
        setTimeout(() => handleSubmit({ [field]: value } as Partial<Answers>), 250)
      }
    }
  }

  function isSelected(value: string | number) {
    const field = currentStep.field
    if (currentStep.multiSelect) {
      return (answers[field] as string[]).includes(value as string)
    }
    return answers[field] === value
  }

  const [submitError, setSubmitError] = useState('')

  async function handleSubmit(override?: Partial<Answers>) {
    const final = { ...answers, ...override }
    setLoading(true)
    setSubmitError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      router.push('/login')
      return
    }

    const cuisinePref = final.cuisinePreference.length > 0
      ? final.cuisinePreference.join(', ')
      : 'mixed'

    const dietaryNeeds = final.dietaryNeeds.filter((v) => v !== 'None')

    const { error } = await supabase
      .from('profiles')
      .update({
        family_size: final.familySize,
        weekly_budget: final.weeklyBudget,
        max_cook_time: final.maxCookTime,
        cuisine_preference: cuisinePref,
        dietary_needs: dietaryNeeds,
        preferred_store: final.preferredStore || 'Instacart',
        onboarding_complete: true,
      })
      .eq('id', user.id)

    if (error) {
      console.error('Error saving profile:', error)
      setSubmitError('Something went wrong saving your preferences. Please try again.')
      setLoading(false)
      return
    }

    const destination = nextUrl && nextUrl.startsWith('/') ? nextUrl : '/dashboard'
    router.push(destination)
    router.refresh()
  }

  const isLastStep = step === STEPS.length - 1

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Progress bar */}
        <div className="flex gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2 className="text-2xl font-heading font-bold text-foreground">
            {currentStep.question}
          </h2>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {currentStep.options.map((option) => (
            <button
              key={String(option.value)}
              onClick={() => handleSelect(option.value)}
              className={`px-6 py-3 rounded-full border text-sm font-medium transition-all ${
                isSelected(option.value)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-input hover:border-primary/50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="space-y-4 pt-2">
          {/* Primary action — always visible so the flow never looks stuck */}
          {currentStep.multiSelect && !isLastStep && (
            <button
              onClick={() => setStep(step + 1)}
              className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Continue &rarr;
            </button>
          )}

          {isLastStep && (
            <div className="space-y-2">
              {submitError && (
                <p className="text-sm text-destructive text-center">{submitError}</p>
              )}
              <button
                onClick={() => handleSubmit()}
                disabled={loading || !answers.preferredStore}
                className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Building your plan…' : 'Get my meal plan →'}
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0 || loading}
              className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              &larr; Back
            </button>
            <button
              onClick={() => handleSubmit({ preferredStore: answers.preferredStore || 'Instacart' })}
              disabled={loading}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 disabled:opacity-30 transition-colors"
            >
              Skip — just show me a plan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingQuiz() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <OnboardingQuizInner />
    </Suspense>
  )
}
