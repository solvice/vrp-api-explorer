import { Suspense } from 'react'
import { VrpExplorer } from '@/components/VrpExplorer'
import { featureFlags } from '@/lib/feature-flags'

export default function Home() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center">Loading...</div>}>
        <VrpExplorer enableAiAssistant={featureFlags.aiAssistant} />
      </Suspense>
    </div>
  )
}