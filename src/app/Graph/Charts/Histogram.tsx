import { format } from 'date-fns'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartData,
} from 'chart.js'

import { newDataset, RGB } from '../../../lib/chart'
import * as svk from '../../../lib/svk'
import * as tibber from '../../../lib/tibber'

import { consumptionHistogram, meanPrice, profileLine } from './Histogram.lib'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

type Props = {
  consumption: tibber.ConsumptionNode[]
  price: tibber.PriceNode[]
  profile: svk.ProfileNode[]
}

export default function HistogramChart(props: Props) {
  const options: ChartOptions<'bar'> = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context) {
            switch (context.datasetIndex) {
              case 0:
              case 1:
              case 2:
                return Number(context.parsed.y).toFixed(2) + '%'
              case 3:
                return Number(context.parsed.y).toFixed(2) + ' SEK/kWh'
              default:
                return context.dataset.label + ': ' + Number(context.parsed.y).toFixed(2)
            }
          },
        },
      },
    },
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      Percentage: {
        type: 'linear',
        position: 'left',
        min: 0,
        grid: {
          display: false,
        },
      },
      'SEK/kWh': {
        type: 'linear',
        position: 'right',
        min: 0,
        grid: {
          display: false,
        },
      },
    },
  }

  const chartData = (): ChartData<'bar'> | undefined => {
    const labels: string[] = []
    for (let i = 0; i < 24; i++) {
      labels.push(i + ':00')
    }

    const datasets: any[] = []
    if (props.consumption.length > 0) {
      datasets.push(consumptionHistogram(props.consumption))
    }
    if (props.profile.length > 0) {
      const days: { [key: string]: svk.ProfileNode[] } = {
        '1': [],
        '2': [],
        '3': [],
        '4': [],
        '5': [],
        '6': [],
        '7': [],
      }
      for (const p of props.profile) {
        const d = format(new Date(p.time), 'i')
        if (!days[d]) days[d] = []
        days[d].push(p)
      }
      const weekends = days['6'].concat(days['7'])
      const workdays = days['1'].concat(days['2'], days['3'], days['4'], days['5'])

      datasets.push(
        newDataset('Snitt (helger)', RGB(34, 89, 220), {
          type: 'line',
          yAxisID: 'Percentage',
          backgroundColor: 'rgba(0,0,0,0)',
          data: profileLine(weekends),
        })
      )

      datasets.push(
        newDataset('Snitt (arbetsdagar)', RGB(34, 89, 220), {
          type: 'line',
          yAxisID: 'Percentage',
          backgroundColor: 'rgba(0,0,0,0)',
          borderWidth: 2,
          data: profileLine(workdays),
        })
      )

      datasets.push(
        newDataset('Snittpris', RGB(47, 184, 202), {
          type: 'line',
          yAxisID: 'SEK/kWh',
          backgroundColor: 'rgba(0,0,0,0)',
          borderWidth: 2,
          data: meanPrice(props.price),
        })
      )
    }

    return {
      labels,
      datasets,
    }
  }

  const data = chartData()
  if (!data) {
    return <div>Loading...</div>
  }

  return <Bar data={data} options={options} />
}
