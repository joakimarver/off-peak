import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'

import { useSelector } from 'src/lib/hooks'
import { useDispatch } from '../lib/hooks'

import * as auth from '../lib/auth/reducer'
import Alert from '../app/components/Alert'

export default function Callback() {
  const authState = useSelector(auth.selector)
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(auth.setToken({ uri: window.location.href }))
  }, [dispatch])

  if (authState.error) {
    return <Alert type="oh-no">{authState.error}</Alert>
  }

  if (!authState.token) {
    return <Alert>Laddar...</Alert>
  } else {
    return <Navigate to="/homes" replace />
  }
}
