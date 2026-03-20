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

import { newDataset, RGB } from 'src/lib/chart'
import * as dataprep from 'src/lib/dataprep'

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
  days: dataprep.Day[]
}

export default function ConsumptionChart(props: Props) {
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
            const n = Number(context.parsed.y).toFixed(2)
            const dataset = context.dataset
            const yAxisID = dataset.yAxisID || 'kWh'
            return dataset.label + ': ' + n + ' ' + yAxisID
          },
        },
      },
      legend: {
        labels: {
          filter: (legendItem) => {
            switch (legendItem.datasetIndex) {
              case 1: // low price
              case 4: // peak price
                return false
              default:
                return true
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
      kWh: {
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
    const labels: string[] = props.days.map((day) => {
      return format(new Date(day.startTime), 'dd/MM')
    })

    const consumption = newDataset('Konsumtion', RGB(0, 0, 0), {
      type: 'bar',
      yAxisID: 'kWh',
      data: props.days.map((day) => day.consumption),
      borderWidth: 0,
    })

    const unitPrice = newDataset('Du betalade', RGB(47, 184, 202), {
      type: 'line',
      yAxisID: 'SEK/kWh',
      backgroundColor: 'rgba(0,0,0,0)',
      borderWidth: 2,
      data: props.days.map((day) => day.actualKwhPrice),
    })

    const profiled = newDataset('Viktat spotpris', RGB(34, 89, 220), {
      type: 'line',
      yAxisID: 'SEK/kWh',
      backgroundColor: 'rgba(0,0,0,0)',
      borderWidth: 2,
      data: props.days.map((day) => day.potentialCost / day.consumption),
    })

    const peakPrice = newDataset('Högsta', RGB(129, 169, 253), {
      type: 'line',
      yAxisID: 'SEK/kWh',
      borderColor: 'rgba(0,0,0,0)',
      data: props.days.map((day) => day.pricePeak),
    })

    const troughPrice = newDataset('Lägsta', RGB(106, 213, 104), {
      type: 'line',
      yAxisID: 'SEK/kWh',
      backgroundColor: 'rgba(255,255,255,1)',
      borderColor: 'rgba(0,0,0,0)',
      data: props.days.map((day) => day.priceTrough),
    })

    return {
      labels,
      datasets: [consumption, troughPrice, unitPrice, profiled, peakPrice] as any,
    }
  }

  const data = chartData()
  if (!data) {
    return <div>Laddar...</div>
  }

  return <Bar data={data} options={options} />
}
