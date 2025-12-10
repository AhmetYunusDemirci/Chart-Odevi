export enum ChartType {
  BAR = 'bar',
  LINE = 'line',
  SCATTER = 'scatter',
  AREA = 'area',
  PIE = 'pie',
  RADAR = 'radar',
  COMPOSED = 'composed'
}

export interface DataColumn {
  name: string;
  type: 'number' | 'string' | 'date';
}

export interface VisualizationConfig {
  chartType: ChartType;
  xAxisKey: string;
  yAxisKey: string; // For simple charts
  seriesKeys?: string[]; // For multi-line/bar
  groupBy?: string; // For categorizing colors
  title: string;
  description: string;
  colors?: string[];
  xLabel?: string;
  yLabel?: string;
  rCode?: string; // Generated R code
  pythonCode?: string; // Generated Python code
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Dataset {
  name: string;
  data: any[];
  columns: string[];
}
