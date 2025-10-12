import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface UseWizardDataProtectionProps {
  hasUnsavedData: boolean
  onConfirmLeave: () => void
  onCancelLeave: () => void
}

export function useWizardDataProtection({ 
  hasUnsavedData, 
  onConfirmLeave, 
  onCancelLeave 
}: UseWizardDataProtectionProps) {
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const router = useRouter()

  // Handle browser back/forward/refresh
  useEffect(() => {
    if (!hasUnsavedData) return

    // Note: beforeunload is handled by the Header component for navbar navigation
    // This hook only handles popstate and link clicks

    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedData) {
        // Check if we're leaving the wizard (not just navigating within it)
        const currentPath = window.location.pathname
        const isLeavingWizard = !currentPath.startsWith('/agent/upload/') && currentPath !== '/agent/review'
        
        if (isLeavingWizard) {
          e.preventDefault()
          setShowWarningModal(true)
          // Push the state back to prevent navigation
          window.history.pushState(null, '', window.location.href)
        }
      }
    }

    // Intercept all link clicks that would leave the wizard
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href]') as HTMLAnchorElement
      
      if (link && hasUnsavedData) {
        const href = link.getAttribute('href')
        if (href && !href.startsWith('/agent/upload/') && href !== '/agent/review') {
          e.preventDefault()
          setPendingNavigation(href)
          setShowWarningModal(true)
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    document.addEventListener('click', handleLinkClick)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('click', handleLinkClick)
    }
  }, [hasUnsavedData])

  // Intercept router navigation - only protect when leaving wizard
  const protectedRouterPush = (url: string) => {
    const isWizardNavigation = url.startsWith('/agent/upload/') || url === '/agent/review'
    
    if (hasUnsavedData && !isWizardNavigation) {
      setPendingNavigation(url)
      setShowWarningModal(true)
    } else {
      router.push(url)
    }
  }

  const handleConfirmLeave = () => {
    setShowWarningModal(false)
    if (pendingNavigation) {
      router.push(pendingNavigation)
      setPendingNavigation(null)
    } else {
      // Handle browser navigation
      window.history.back()
    }
    onConfirmLeave()
  }

  const handleCancelLeave = () => {
    setShowWarningModal(false)
    setPendingNavigation(null)
    onCancelLeave()
  }

  return {
    showWarningModal,
    protectedRouterPush,
    handleConfirmLeave,
    handleCancelLeave
  }
}
