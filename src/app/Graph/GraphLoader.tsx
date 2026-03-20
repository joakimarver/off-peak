import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import * as tibber from '../../lib/tibber'
import * as svk from '../../lib/svk/'
import * as dataprep from '../../lib/dataprep'
import * as config from '../../lib/config'

import Alert from '../components/Alert'
import Graphs from './Graphs'
import * as snapshotStore from '../../lib/snapshots'

import './GraphLoader.css'
import { useDispatch, useSelector } from 'src/lib/hooks'

import { DataSourceContext } from './Graphs'
import { Period, getMonthIntervalFor, getRollingInterval } from './GraphLoader.lib'

type Params = {
  id: string
  priceAreaCode: string
  gridAreaCode: string
}

export default function GraphLoader() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [firstLoad, setFirstLoad] = useState(true)

  const params = useParams<Params>()
  const { gridAreaCode, priceAreaCode, id: homeId } = params

  const tibberState = useSelector(tibber.selector)
  const snapshotState = useSelector(snapshotStore.selector)
  const svkState = useSelector(svk.selector)
  const configState = useSelector(config.selector)

  useEffect(() => {
    dispatch(snapshotStore.reset())
  }, [dispatch])

  useEffect(() => {
    if (!homeId || !gridAreaCode || !priceAreaCode) return

    let period: Period

    const now = new Date()
    switch (configState.periodType) {
      case 'last-month': {
        let prevMonth = now.getMonth() - 1
        if (prevMonth < 0) prevMonth = 11
        period = getMonthIntervalFor(prevMonth)
        break
      }
      case 'this-month': {
        period = getMonthIntervalFor(now.getMonth())
        break
      }
      case 'rolling':
        period = getRollingInterval(32)
        break
      default:
        throw new Error('invalid period type')
    }

    dispatch(
      tibber.getConsumption({
        homeId,
        resolution: tibber.Interval.Hourly,
        after: period.from,
        first: period.hours,
      })
    )

    // price is sometimes ahead by 24 hours, so we always add another period on it
    dispatch(
      tibber.getPrice({
        homeId,
        resolution: tibber.Interval.Hourly,
        after: period.from,
        first: period.hours,
      })
    )

    dispatch(
      svk.getProfile({
        priceArea: priceAreaCode,
        mga: gridAreaCode,
        from: period.from,
        to: period.to,
      })
    )

    setFirstLoad(false)
  }, [dispatch, homeId, configState.periodType, priceAreaCode, gridAreaCode])

  const store = async () => {
    if (!homeId || !priceAreaCode || !gridAreaCode) return

    dispatch(
      snapshotStore.add({
        home: {
          id: homeId,
          priceAreaCode,
          gridAreaCode,
        },
        consumptionNodes: tibberState.consumption.nodes,
        priceNodes: tibberState.price.nodes,
        profileNodes: svkState.nodes,
      })
    )
  }

  useEffect(() => {
    if (snapshotState.addId) {
      navigate(`/snaps/${snapshotState.addId}/graphs`)
      dispatch(snapshotStore.reset())
    }
  }, [dispatch, navigate, snapshotState.addId])

  if (
    firstLoad ||
    tibberState.homes.status === 'loading' ||
    tibberState.consumption.status === 'loading' ||
    tibberState.price.status === 'loading' ||
    svkState.status === 'loading'
  ) {
    return <Alert>Laddar...</Alert>
  }

  if (snapshotState.addStatus === 'loading' || snapshotState.addId) {
    return <Alert>Sparar snapshot...</Alert>
  }

  const errs = Object.entries({
    snapshot: snapshotState.addError,
    consumption: tibberState.consumption.error,
    price: tibberState.price.error,
    profile: svkState.error,
  }).filter(([, err]) => !!err)

  if (errs.length > 0) {
    return (
      <>
        {errs.map(([id, err], i) => {
          return (
            <Alert key={i} type="oh-no">
              <h2>{id} error</h2>
              {err}
            </Alert>
          )
        })}
      </>
    )
  }

  const { days, weightedAverage } = dataprep.aggregateDays(
    tibberState.consumption.nodes,
    tibberState.price.nodes,
    svkState.nodes
  )

  if (!firstLoad && days.length === 0) {
    return <Alert type="oh-no">Hämtningsfel, data saknas</Alert>
  }

  return (
    <div className="graph-view">
      <div className="col">
        <div className="header-warn">
          Från och med den 1 november 2023 hämtas data från eSett. Detta gör att data före 1 novmber
          2023 inte längre är tillgänglig. <br />
          Dina sparade snapshots från tiden före 1 nov finns kvar.
        </div>
        <div className="header-info">
          <button id="BtnSaveSnapshot" onClick={store}>
            Spara snapshot
          </button>
        </div>
      </div>
      <DataSourceContext.Provider value={'api'}>
        <Graphs
          days={days}
          consumption={tibberState.consumption.nodes}
          profile={svkState.nodes}
          weightedAverage={weightedAverage}
          price={tibberState.price.nodes}
        />
      </DataSourceContext.Provider>
    </div>
  )
}
