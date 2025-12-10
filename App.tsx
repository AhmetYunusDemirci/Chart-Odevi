import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  AreaChart, Area, PieChart, Pie, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, ComposedChart
} from 'recharts';
import { Upload, Image as ImageIcon, RefreshCw, Code, Layout, MessageSquare, Play, FileText, Download } from 'lucide-react';
import { loadExampleTitanic, parseCSV } from './utils/parsers';
import { analyzeImageAndData, refineConfig } from './services/geminiService';
import { Dataset, VisualizationConfig, ChartType } from './types';

// Simple aggregator for better default charts
const processData = (data: any[], config: VisualizationConfig | null) => {
  if (!data || !config) return [];
  
  // If chart is Pie or Bar and data is large, we might need aggregation if yAxisKey is not present or implied count
  // This is a basic heuristic for the frontend preview
  if ((config.chartType === ChartType.PIE || config.chartType === ChartType.BAR) && data.length > 20) {
    if (!config.yAxisKey || config.yAxisKey === 'count') {
      const counts: Record<string, number> = {};
      data.forEach(row => {
        const key = String(row[config.xAxisKey]);
        counts[key] = (counts[key] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ 
        [config.xAxisKey]: name, 
        [config.yAxisKey || 'value']: value,
        name // For Pie chart
      }));
    }
  }
  return data;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [config, setConfig] = useState<VisualizationConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chart' | 'r' | 'python'>('chart');

  // Load Titanic data on mount
  useEffect(() => {
    loadExampleTitanic().then(res => {
      setDataset({ name: 'Titanic Dataset', data: res.data, columns: res.columns });
    });
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await parseCSV(file);
      setDataset({ name: file.name, data: res.data, columns: res.columns });
      setConfig(null); // Reset config on new data
    } catch (err) {
      console.error(err);
      alert("Failed to parse CSV");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!dataset) return;
    setLoading(true);
    try {
      if (config && prompt && !imagePreview) {
        // Refine existing
        const newConfig = await refineConfig(config, prompt);
        setConfig(newConfig);
      } else {
        // New Generation
        const newConfig = await analyzeImageAndData(
          imagePreview,
          dataset.data,
          dataset.columns,
          prompt || "Visualize this data effectively"
        );
        setConfig(newConfig);
      }
    } catch (error) {
      console.error(error);
      alert("AI Generation failed. Please check your API Key or try again.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => processData(dataset?.data || [], config), [dataset, config]);

  const renderChart = () => {
    if (!config || !dataset) return <div className="text-gray-500 flex items-center justify-center h-64">No visualization generated yet</div>;

    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 50 }
    };

    const X = <XAxis dataKey={config.xAxisKey} stroke="#94a3b8" angle={-45} textAnchor="end" height={60} />;
    const Y = <YAxis stroke="#94a3b8" />;
    const Grid = <CartesianGrid strokeDasharray="3 3" stroke="#334155" />;
    const Tool = <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} />;
    const Leg = <Legend />;

    // Helper to get series
    const keys = config.seriesKeys && config.seriesKeys.length > 0 ? config.seriesKeys : [config.yAxisKey];

    switch (config.chartType) {
      case ChartType.BAR:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...commonProps}>
              {Grid} {X} {Y} {Tool} {Leg}
              {keys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={config.colors?.[i] || COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case ChartType.LINE:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonProps}>
              {Grid} {X} {Y} {Tool} {Leg}
              {keys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={config.colors?.[i] || COLORS[i % COLORS.length]} strokeWidth={2} dot={{r: 4}} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case ChartType.SCATTER:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart {...commonProps}>
               {Grid} 
               <XAxis type="number" dataKey={config.xAxisKey} name={config.xLabel} stroke="#94a3b8" />
               <YAxis type="number" dataKey={config.yAxisKey} name={config.yLabel} stroke="#94a3b8" />
               {Tool} {Leg}
               <Scatter name={config.title} data={chartData} fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        );
      case ChartType.PIE:
         return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
               <Pie
                data={chartData}
                dataKey={config.yAxisKey || 'value'}
                nameKey={config.xAxisKey || 'name'}
                cx="50%"
                cy="50%"
                outerRadius={120}
                fill="#8884d8"
                label
              >
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={config.colors?.[index % (config.colors.length || 1)] || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              {Tool} {Leg}
            </PieChart>
          </ResponsiveContainer>
         );
      case ChartType.AREA:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart {...commonProps}>
              {Grid} {X} {Y} {Tool} {Leg}
              {keys.map((key, i) => (
                <Area key={key} type="monotone" dataKey={key} stackId="1" stroke={config.colors?.[i] || COLORS[i % COLORS.length]} fill={config.colors?.[i] || COLORS[i % COLORS.length]} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      default:
        // Fallback to Composed or Bar
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart {...commonProps}>
              {Grid} {X} {Y} {Tool} {Leg}
               {keys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={config.colors?.[i] || COLORS[i % COLORS.length]} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col md:flex-row font-sans">
      {/* Sidebar Controls */}
      <aside className="w-full md:w-80 bg-slate-950 border-r border-slate-800 flex flex-col p-6 gap-6 overflow-y-auto z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <Layout className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            VizAI
          </h1>
        </div>

        {/* Data Source */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4" /> Data Source
          </h2>
          <div className="p-4 bg-slate-900 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500 transition-colors group relative">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center gap-2 text-center">
              <Upload className="w-6 h-6 text-slate-500 group-hover:text-indigo-400" />
              <span className="text-xs text-slate-400">
                {dataset ? dataset.name : "Click to upload CSV"}
              </span>
            </div>
          </div>
          {dataset && (
            <div className="text-xs text-slate-500 px-1">
              {dataset.data.length} rows, {dataset.columns.length} columns loaded.
            </div>
          )}
        </div>

        {/* Reference Image */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Reference Style
          </h2>
           <div className="p-4 bg-slate-900 rounded-xl border border-dashed border-slate-700 hover:border-pink-500 transition-colors group relative">
             <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
             <div className="flex flex-col items-center justify-center gap-2 text-center">
               {imagePreview ? (
                 <img src={imagePreview} alt="Preview" className="h-20 object-contain rounded" />
               ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-500 group-hover:text-pink-400" />
                    <span className="text-xs text-slate-400">Upload Chart Image</span>
                  </>
               )}
            </div>
          </div>
        </div>

        {/* Prompt */}
        <div className="space-y-3 flex-grow">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Instructions
          </h2>
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Show distribution of Ages by Pclass as a violin plot..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-32"
          />
        </div>

        <button 
          onClick={handleGenerate}
          disabled={loading || !dataset}
          className={`
            w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all
            ${loading || !dataset 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50'
            }
          `}
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {loading ? 'Analyzing...' : 'Generate Visualization'}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-6 flex flex-col gap-6 overflow-hidden">
        {/* Output Tabs */}
        <div className="flex items-center gap-4 border-b border-slate-800 pb-2">
          <button 
            onClick={() => setActiveTab('chart')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'chart' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Interactive Chart
          </button>
          <button 
             onClick={() => setActiveTab('r')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'r' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            R Code (ggplot2)
          </button>
           <button 
             onClick={() => setActiveTab('python')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'python' ? 'bg-yellow-500/10 text-yellow-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Python Code
          </button>
        </div>

        {/* Workspace */}
        <div className="flex-grow relative bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 flex flex-col">
          {config && (
             <div className="mb-4">
                <h2 className="text-xl font-bold text-white mb-1">{config.title}</h2>
                <p className="text-sm text-slate-400">{config.description}</p>
             </div>
          )}

          <div className="flex-grow min-h-0 bg-slate-900/50 rounded-xl border border-slate-800 p-4 overflow-auto">
            {activeTab === 'chart' && renderChart()}
            
            {activeTab === 'r' && (
              <pre className="text-xs sm:text-sm font-mono text-blue-200 p-4">
                <code>{config?.rCode || "# R code will appear here"}</code>
              </pre>
            )}

            {activeTab === 'python' && (
               <pre className="text-xs sm:text-sm font-mono text-yellow-200 p-4">
                <code>{config?.pythonCode || "# Python code will appear here"}</code>
              </pre>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}