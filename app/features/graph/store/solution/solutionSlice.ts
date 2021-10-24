import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RootState } from '$'
import { Payload, SolutionState } from './types'

const initialState: SolutionState = {
  meta: {},
  values: {},
  messages: {},
}

export const solutionSlice = createSlice({
  name: 'solution',
  initialState,
  reducers: {
    expireSolution: (state: SolutionState) => {
      // Flag current solution as expired
      state.meta.id = undefined
      state.meta.phase = 'expired'
      state.meta.error = undefined
      state.meta.duration = 0

      // Delete any stored values
      state.values = {}
      state.messages = {}
    },
    updateSolution: (state: SolutionState, action: PayloadAction<Payload.UpdateSolutionPayload>) => {
      const { meta } = action.payload

      state.meta = { ...state.meta, ...meta }
    },
    tryApplySolutionManifest: (state: SolutionState, action: PayloadAction<Payload.ApplySolutionManifestPayload>) => {
      const { solutionId, manifest } = action.payload

      if (solutionId !== state.meta.id) {
        console.log(`Received expired manifest! ${solutionId}`)
        return
      }

      state.meta.phase = 'idle'
      state.meta.duration = manifest.duration
      state.messages = manifest.messages ?? {}
    },
    tryApplySolutionValues: (state: SolutionState, action: PayloadAction<Payload.ApplySolutionValuesPayload>) => {
      const { solutionId, values } = action.payload

      if (solutionId !== state.meta.id) {
        console.log('Received expired values!')
        return
      }

      console.log(values)
    },
  },
})

const selectCurrentSolutionId = (state: RootState): string | undefined => state.solution.meta.id
const selectCurrentSolutionPhase = (state: RootState): SolutionState['meta']['phase'] => state.solution.meta.phase
const selectCurrentSolutionMetadata = (state: RootState): SolutionState['meta'] => state.solution.meta
const selectCurrentSolutionValues = (state: RootState): SolutionState['values'] => state.solution.values
const selectCurrentSolutionMessages = (state: RootState): SolutionState['messages'] => state.solution.messages

export const solutionSelectors = {
  selectCurrentSolutionId,
  selectCurrentSolutionPhase,
  selectCurrentSolutionMetadata,
  selectCurrentSolutionValues,
  selectCurrentSolutionMessages,
}

const { actions, reducer } = solutionSlice

export const solutionActions = actions

export const solutionReducer = reducer
