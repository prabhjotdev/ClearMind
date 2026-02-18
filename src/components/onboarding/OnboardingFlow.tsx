import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import './OnboardingFlow.css';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const STEPS = [
  'welcome',
  'categories',
  'tour',
  'install',
  'done',
] as const;

type Step = typeof STEPS[number];

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { currentUser } = useAuth();
  const { canInstall, promptInstall } = usePWAInstall();
  const [step, setStep] = useState<Step>('welcome');

  const currentIndex = STEPS.indexOf(step);
  const totalSteps = STEPS.length;

  function goNext() {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= STEPS.length) {
      finishOnboarding();
      return;
    }
    // Skip install step if PWA is already installed or can't be installed
    if (STEPS[nextIndex] === 'install' && !canInstall) {
      if (nextIndex + 1 >= STEPS.length) {
        finishOnboarding();
      } else {
        setStep(STEPS[nextIndex + 1]);
      }
      return;
    }
    setStep(STEPS[nextIndex]);
  }

  function goBack() {
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1]);
    }
  }

  async function finishOnboarding() {
    if (currentUser?.uid) {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { onboardingCompleted: true });
    }
    onComplete();
  }

  async function handleInstall() {
    await promptInstall();
    goNext();
  }

  return (
    <div className="onboarding">
      {/* Progress dots */}
      <div className="onboarding-progress" aria-label={`Step ${currentIndex + 1} of ${totalSteps}`}>
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`onboarding-dot ${i === currentIndex ? 'onboarding-dot--active' : ''} ${i < currentIndex ? 'onboarding-dot--done' : ''}`}
          />
        ))}
      </div>

      {/* Step: Welcome */}
      {step === 'welcome' && (
        <div className="onboarding-step">
          <div className="onboarding-icon" aria-hidden="true">🧠</div>
          <h1 className="onboarding-title">Welcome to ClearMind</h1>
          <p className="onboarding-text">
            A task manager designed for how your brain works.
            Less overwhelm, more focus.
          </p>
          <button className="onboarding-btn onboarding-btn--primary" onClick={goNext}>
            Get Started
          </button>
        </div>
      )}

      {/* Step: Categories */}
      {step === 'categories' && (
        <div className="onboarding-step">
          <div className="onboarding-icon" aria-hidden="true">🏷</div>
          <h1 className="onboarding-title">Your Categories</h1>
          <p className="onboarding-text">
            We've set up three starter categories. You can customize these anytime in Settings.
          </p>
          <div className="onboarding-categories">
            <div className="onboarding-category" style={{ borderLeftColor: '#3B82F6' }}>
              <span>💼</span> Work
            </div>
            <div className="onboarding-category" style={{ borderLeftColor: '#8B5CF6' }}>
              <span>🏠</span> Personal
            </div>
            <div className="onboarding-category" style={{ borderLeftColor: '#10B981' }}>
              <span>💪</span> Health
            </div>
          </div>
          <div className="onboarding-nav">
            <button className="onboarding-btn onboarding-btn--secondary" onClick={goBack}>
              Back
            </button>
            <button className="onboarding-btn onboarding-btn--primary" onClick={goNext}>
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step: Tour */}
      {step === 'tour' && (
        <div className="onboarding-step">
          <div className="onboarding-icon" aria-hidden="true">📋</div>
          <h1 className="onboarding-title">Quick Tour</h1>
          <div className="onboarding-tour-items">
            <div className="onboarding-tour-item">
              <span className="onboarding-tour-badge">Today</span>
              <p>See your daily tasks grouped by priority. P1 = Urgent, P2 = Important, P3 = Low.</p>
            </div>
            <div className="onboarding-tour-item">
              <span className="onboarding-tour-badge">Week</span>
              <p>Plan ahead with a weekly list view and deadlines overview.</p>
            </div>
            <div className="onboarding-tour-item">
              <span className="onboarding-tour-badge">Month</span>
              <p>See your workload on a heatmap. Green = light, red = heavy.</p>
            </div>
            <div className="onboarding-tour-item">
              <span className="onboarding-tour-badge">+</span>
              <p>Tap the blue button to quickly add a task. Just type a name and go!</p>
            </div>
          </div>
          <div className="onboarding-nav">
            <button className="onboarding-btn onboarding-btn--secondary" onClick={goBack}>
              Back
            </button>
            <button className="onboarding-btn onboarding-btn--primary" onClick={goNext}>
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step: Install */}
      {step === 'install' && canInstall && (
        <div className="onboarding-step">
          <div className="onboarding-icon" aria-hidden="true">📱</div>
          <h1 className="onboarding-title">Install ClearMind</h1>
          <p className="onboarding-text">
            Add ClearMind to your home screen for quick access and offline support.
          </p>
          <div className="onboarding-nav">
            <button className="onboarding-btn onboarding-btn--secondary" onClick={goNext}>
              Skip
            </button>
            <button className="onboarding-btn onboarding-btn--primary" onClick={handleInstall}>
              Install App
            </button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <div className="onboarding-step">
          <div className="onboarding-icon" aria-hidden="true">✨</div>
          <h1 className="onboarding-title">You're all set!</h1>
          <p className="onboarding-text">
            Start by adding your first task. Remember — you can always undo any action.
            No pressure, no judgment.
          </p>
          <button className="onboarding-btn onboarding-btn--primary" onClick={finishOnboarding}>
            Start Using ClearMind
          </button>
        </div>
      )}
    </div>
  );
}
