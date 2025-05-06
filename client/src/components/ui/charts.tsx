import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

// Enregistrer les composants ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Options par défaut pour les graphiques
const defaultOptions: ChartOptions<'bar' | 'line' | 'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
      },
    },
  },
};

// Composant pour les graphiques en barres
interface BarChartProps {
  data: ChartData<'bar'>;
  options?: ChartOptions<'bar'>;
}

export const BarChart: React.FC<BarChartProps> = ({ data, options }) => {
  const mergedOptions = { ...defaultOptions, ...options };
  return <Bar data={data} options={mergedOptions} />;
};

// Composant pour les graphiques en ligne
interface LineChartProps {
  data: ChartData<'line'>;
  options?: ChartOptions<'line'>;
}

export const LineChart: React.FC<LineChartProps> = ({ data, options }) => {
  const mergedOptions = { ...defaultOptions, ...options };
  return <Line data={data} options={mergedOptions} />;
};

// Composant pour les graphiques en camembert
interface PieChartProps {
  data: ChartData<'pie'>;
  options?: ChartOptions<'pie'>;
}

export const PieChart: React.FC<PieChartProps> = ({ data, options }) => {
  const pieOptions = {
    ...defaultOptions,
    scales: undefined, // Les camemberts n'ont pas d'axes
    ...options,
  };
  return <Pie data={data} options={pieOptions} />;
};
