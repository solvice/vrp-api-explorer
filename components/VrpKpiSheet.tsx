'use client'

import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { VrpKpiPanel } from './VrpKpiPanel'

interface VrpKpiSheetProps {
  responseData: Vrp.OnRouteResponse | null
  requestData: Record<string, unknown>
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VrpKpiSheet({ responseData, requestData, open, onOpenChange }: VrpKpiSheetProps) {
  if (!responseData) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-[400px] p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Detailed Metrics</SheetTitle>
        </SheetHeader>
        <div className="h-[calc(100vh-5rem)] overflow-y-auto">
          <div className="p-6">
            <VrpKpiPanel
              responseData={responseData}
              requestData={requestData}
              className="w-full shadow-none border-0"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}