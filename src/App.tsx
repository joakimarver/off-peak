import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Cover from './app/Cover'
import Menu from './app/components/Menu'
import About from './app/About'
import Homes from './app/Homes'
import List from './app/List'
import Callback from './app/Callback'
import GraphLoader from './app/Graph/GraphLoader'
import SnapLoader from './app/Graph/SnapLoader'

import './App.css'
import { useDispatch } from 'src/lib/hooks'
import { setBetaMode } from './lib/config'

export default function App() {
  const dispatch = useDispatch()
  if (window.location.hash === '#beta') {
    dispatch(setBetaMode(true))
  }

  return (
    <BrowserRouter>
      <div className="App">
        <Menu />
        <Routes>
          <Route path="/" element={<Cover />} />
          <Route path="/about" element={<About />} />
          <Route path="/homes" element={<Homes />} />
          <Route path="/homes/:priceAreaCode/:gridAreaCode/:id/graphs" element={<GraphLoader />} />
          <Route path="/list" element={<List />} />
          <Route path="/snaps/:id/graphs" element={<SnapLoader />} />
          <Route path="/auth/callback" element={<Callback />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
