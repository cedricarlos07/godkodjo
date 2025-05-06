import React, { useEffect, useState } from 'react';
import type {
  ChartData,
  ChartOptions,
  Chart as ChartType,
  ChartComponentLike
} from 'chart.js';

// Composants de graphiques avec chargement dynamique
const DynamicChartComponent: React.FC<{
  type: 'bar' | 'line' | 'pie';
  data: any;
  options?: any;
}> = ({ type, data, options }) => {
  const [ChartComponent, setChartComponent] = useState<ChartComponentLike | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadChartComponent = async () => {
      try {
        // Importer dynamiquement chart.js et react-chartjs-2
        const ChartJS = await import('chart.js');
        const ReactChartJS = await import('react-chartjs-2');

        // Enregistrer les composants nécessaires
        const {
          Chart,
          CategoryScale,
          LinearScale,
          PointElement,
          LineElement,
          BarElement,
          ArcElement,
          Title,
          Tooltip,
          Legend
        } = ChartJS;

        Chart.register(
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

        // Sélectionner le bon composant en fonction du type
        if (isMounted) {
          if (type === 'bar') setChartComponent(() => ReactChartJS.Bar);
          else if (type === 'line') setChartComponent(() => ReactChartJS.Line);
          else if (type === 'pie') setChartComponent(() => ReactChartJS.Pie);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Erreur lors du chargement des graphiques:', err);
        if (isMounted) {
          setError('Impossible de charger les graphiques');
          setIsLoading(false);
        }
      }
    };

    loadChartComponent();

    return () => {
      isMounted = false;
    };
  }, [type]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Chargement du graphique...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  if (!ChartComponent) {
    return <div className="text-gray-500 text-center">Graphique non disponible</div>;
  }

  return <ChartComponent data={data} options={options} />;
};

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
  return <DynamicChartComponent type="bar" data={data} options={mergedOptions} />;
};

// Composant pour les graphiques en ligne
interface LineChartProps {
  data: ChartData<'line'>;
  options?: ChartOptions<'line'>;
}

export const LineChart: React.FC<LineChartProps> = ({ data, options }) => {
  const mergedOptions = { ...defaultOptions, ...options };
  return <DynamicChartComponent type="line" data={data} options={mergedOptions} />;
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
  return <DynamicChartComponent type="pie" data={data} options={pieOptions} />;
};
