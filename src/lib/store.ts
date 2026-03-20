import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit'
import { combineReducers } from 'redux'

import auth from './auth/reducer'
import config from './config'
import tibber from './tibber/reducer'
import svk from './svk/reducer'
import snapshots from './snapshots/reducer'

const rootReducer = combineReducers({
  auth,
  tibber,
  snapshots,
  svk,
  config,
})

export const store = configureStore({
  reducer: rootReducer,
})

export type AppDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>
