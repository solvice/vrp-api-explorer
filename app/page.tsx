import { VrpExplorer } from '@/components/VrpExplorer'
import { VrpAssistantProvider } from '@/components/VrpAssistant/VrpAssistantContext'

export default function Home() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <VrpAssistantProvider>
        <VrpExplorer />
      </VrpAssistantProvider>
    </div>
  )
}