import React, { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

// Types pour les données et options des graphiques
type ChartType = 'bar' | 'line' | 'pie';
type ChartData = any;
type ChartOptions = any;

interface SSRSafeChartProps {
  type: ChartType;
  data: ChartData;
  options?: ChartOptions;
  height?: number;
  width?: number;
  className?: string;
  fallbackContent?: React.ReactNode;
}

/**
 * Composant de graphique compatible avec le SSR qui charge Chart.js uniquement côté client
 */
export const SSRSafeChart: React.FC<SSRSafeChartProps> = ({
  type,
  data,
  options,
  height = 300,
  width = '100%',
  className = '',
  fallbackContent
}) => {
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);

  // Déterminer si nous sommes côté client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Charger et initialiser Chart.js uniquement côté client
  useEffect(() => {
    if (!isClient || !chartRef.current) return;

    let isMounted = true;
    let chartInstance: any = null;

    const loadAndRenderChart = async () => {
      try {
        setIsLoading(true);

        // Importer dynamiquement les modules nécessaires
        const [ChartJS, ReactChartJS] = await Promise.all([
          import('chart.js'),
          import('react-chartjs-2')
        ]);

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

        // Enregistrer les composants uniquement s'ils ne sont pas déjà enregistrés
        if (!Chart.registry.controllers.get('bar')) {
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
        }

        if (!isMounted) return;

        // Nettoyer le conteneur
        if (chartRef.current) {
          chartRef.current.innerHTML = '';
          
          // Créer un canvas pour le graphique
          const canvas = document.createElement('canvas');
          chartRef.current.appendChild(canvas);

          // Créer le graphique approprié
          const ChartComponent = type === 'bar' 
            ? ReactChartJS.Bar 
            : type === 'line' 
              ? ReactChartJS.Line 
              : ReactChartJS.Pie;

          // Rendre le graphique dans un élément DOM temporaire
          const tempContainer = document.createElement('div');
          const root = ReactChartJS.createRoot(tempContainer);
          root.render(
            <ChartComponent
              data={data}
              options={options}
              ref={(ref: any) => {
                if (ref) {
                  chartInstanceRef.current = ref;
                }
              }}
            />
          );

          setIsLoading(false);
        }
      } catch (err: any) {
        console.error('Erreur lors du chargement ou du rendu du graphique:', err);
        if (isMounted) {
          setError(err.message || 'Erreur lors du chargement du graphique');
          setIsLoading(false);
        }
      }
    };

    loadAndRenderChart();

    return () => {
      isMounted = false;
      // Nettoyer le graphique si nécessaire
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [isClient, type, data, options]);

  // Fallback pour le SSR ou pendant le chargement
  if (!isClient || isLoading) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ height: typeof height === 'number' ? `${height}px` : height, width }}
      >
        {fallbackContent || (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p>Chargement du graphique...</p>
          </div>
        )}
      </div>
    );
  }

  // Afficher une erreur si nécessaire
  if (error) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ height: typeof height === 'number' ? `${height}px` : height, width }}
      >
        <div className="text-red-500 text-center">
          <p>Impossible de charger le graphique</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Conteneur pour le graphique
  return (
    <div 
      ref={chartRef}
      className={className}
      style={{ height: typeof height === 'number' ? `${height}px` : height, width }}
    />
  );
};

// Composants spécifiques pour chaque type de graphique
export const BarChart: React.FC<Omit<SSRSafeChartProps, 'type'>> = (props) => (
  <SSRSafeChart {...props} type="bar" />
);

export const LineChart: React.FC<Omit<SSRSafeChartProps, 'type'>> = (props) => (
  <SSRSafeChart {...props} type="line" />
);

export const PieChart: React.FC<Omit<SSRSafeChartProps, 'type'>> = (props) => (
  <SSRSafeChart {...props} type="pie" />
);
