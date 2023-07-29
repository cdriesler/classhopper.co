import React, { useState, useLayoutEffect, useRef } from 'react'
import { usePseudoShadow } from '@/views/common/pseudo-shadow'
import { COLORS } from '@/constants'
import { useSolutionData } from './hooks'
import { ProgressBar } from './components'

export const SolutionStatusBar = (): React.ReactElement => {
  const shadowTarget = usePseudoShadow()

  const { solutionId: _solutionId } = useSolutionData()

  const [progress, setProgress] = useState(0)

  return (
    <div
      className="np-flex-grow np-flex np-justify-start np-items-center np-h-8 np-rounded-md np-bg-light np-shadow-main"
      ref={shadowTarget}
    >
      <div className="np-w-8 np-h-8 np-flex np-items-center np-justify-center">
        <svg
          style={{ width: 20, height: 20 }}
          fill="none"
          stroke={COLORS.DARK}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div className="np-h-4 np-flex-grow np-pr-2 np-flex np-items-center np-justify-start np-overflow-visible">
        <ProgressBar progress={progress} />
      </div>
    </div>
  )
}
