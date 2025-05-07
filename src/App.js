import './App.css';
import React, { useEffect, useState } from 'react';
import * as d3 from 'd3';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  AreaChart,
  Area
} from 'recharts';


const COLORS = {
  primary: '#3B82F6',    
  secondary: '#10B981',  
  accent: '#8B5CF6',     
  warning: '#F59E0B',    
  danger: '#EF4444',     
  success: '#059669',    
  background: '#F8FAFC', 
  text: '#1E293B',       
  chart: [
    '#3B82F6', 
    '#10B981', 
    '#8B5CF6', 
    '#F59E0B', 
    '#EF4444', 
    '#059669', 
    '#EC4899', 
    '#6366F1', 
    '#14B8A6', 
    '#F97316'  
  ]
};

const parseMonth = m => ({ Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 })[m] || 0;

export default function App() {
  const [data, setData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [lineData, setLineData] = useState([]);
  const [barData, setBarData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [stackedAreaData, setStackedAreaData] = useState([]);
  const [visibleCategories, setVisibleCategories] = useState([]);


  useEffect(() => {
    d3.csv(process.env.PUBLIC_URL + '/df_second_assignment.csv').then(raw => {
      const clean = raw.filter(d => d.Year && d.Month && d['Weight (lbs)'])
        .map(d => ({
          year: +d.Year,
          month: d.Month,
          category: d.Category?.charAt(0).toUpperCase() + d.Category?.slice(1).toLowerCase() || 'Unknown',
          material: d['Material Type'],
          weight: +d['Weight (lbs)'].replace(/,/g, ''),
          date: new Date(+d.Year, parseMonth(d.Month) - 1)
        }));
      setData(clean);
      const cats = [...new Set(clean.map(d => d.category))].sort();
      setCategories(cats);
      setSelected(cats[0]);
      setVisibleCategories(cats);

      const catSum = d3.rollups(
        clean,
        v => d3.sum(v, d => d.weight),
        d => d.category
      ).map(([category, weight]) => ({ category, weight }));
      setBarData(catSum);

     
      const matSum = d3.rollups(
        clean,
        v => d3.sum(v, d => d.weight),
        d => d.material
      ).map(([material, weight]) => ({ material, weight }));
      matSum.sort((a,b) => b.weight - a.weight);
      setPieData(matSum.slice(0,6).map((d,i) => ({ name: d.material, value: d.weight, color: COLORS.chart[i % COLORS.chart.length] })));


      const monthlyData = d3.rollups(
        clean,
        v => d3.sum(v, d => d.weight),
        d => `${d.year}-${String(parseMonth(d.month)).padStart(2,'0')}`,
        d => d.category
      ).map(([date, categoryData]) => {
        const entry = { date };
        categoryData.forEach(([category, weight]) => {
          entry[category] = weight || 0;
        });
        return entry;
      });
      monthlyData.sort((a,b) => new Date(a.date) - new Date(b.date));
      setStackedAreaData(monthlyData);
    }).catch(error => {
      console.error('Error loading data:', error);
    });
  }, []);


  useEffect(() => {
    if (!selected || !data.length) return;
    const filt = data.filter(d => d.category === selected);
    const sumByDate = d3.rollups(
      filt,
      v => d3.sum(v, d => d.weight),
      d => `${d.year}-${String(parseMonth(d.month)).padStart(2,'0')}`
    ).map(([date, weight]) => ({ date, weight }));
    sumByDate.sort((a,b) => new Date(a.date) - new Date(b.date));
    setLineData(sumByDate);
  }, [selected, data]);

  // Get unique years from data
  const years = React.useMemo(() => {
    if (!data.length || !selected) return [];
    // Filter data for selected category first
    const categoryData = data.filter(d => d.category === selected);
    return [...new Set(categoryData.map(d => d.year))].sort();
  }, [data, selected]);

  // Set initial year when data loads or category changes
  useEffect(() => {
    if (years.length > 0) {
      setSelectedYear(years[years.length - 1].toString());
    } else {
      setSelectedYear('');
    }
  }, [years, selected]);

  // Add new useEffect for year filtering
  const filteredLineData = React.useMemo(() => {
    if (!lineData.length || !selectedYear) return lineData;
    return lineData.filter(d => d.date.startsWith(selectedYear));
  }, [lineData, selectedYear]);

  const filteredStackedAreaData = React.useMemo(() => {
    if (!stackedAreaData.length) return [];
    return stackedAreaData.map(entry => {
      const filtered = { date: entry.date };
      visibleCategories.forEach(category => {
        filtered[category] = entry[category] || 0;
      });
      return filtered;
    });
  }, [stackedAreaData, visibleCategories]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-5xl font-bold mb-8 text-center text-gray-800 bg-white/80 backdrop-blur-sm py-6 rounded-2xl shadow-lg">
          Waste Management Dashboard
        </h1>
        
        {}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap justify-center items-center gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Visible Categories</label>
              <div className="flex flex-wrap items-center gap-2 bg-white/50 p-3 rounded-lg">
                {categories.map(category => (
                  <label key={category} className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                    <input
                      type="checkbox"
                      checked={visibleCategories.includes(category)}
                      onChange={e => {
                        if (e.target.checked) {
                          setVisibleCategories([...visibleCategories, category]);
                        } else {
                          setVisibleCategories(visibleCategories.filter(c => c !== category));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{category}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4">
          {}
          <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-2xl p-8 transform hover:scale-[1.02] transition-transform duration-200 lg:col-span-2">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 text-center">Category Composition Over Time</h2>
            <div className="w-11/12 mx-auto">
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={filteredStackedAreaData} margin={{ top: 20, right: 30, bottom: 20, left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    stroke={COLORS.text}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const [year, month] = value.split('-');
                      return `${month}/${year}`;
                    }}
                    label={{ value: 'Date', position: 'bottom', offset: 0, style: { textAnchor: 'middle', fontSize: 14, fill: COLORS.text } }}
                  />
                  <YAxis 
                    stroke={COLORS.text}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                      return value;
                    }}
                    label={{ value: 'Weight (lbs)', angle: -90, position: 'left', style: { textAnchor: 'middle', fontSize: 14, fill: COLORS.text } }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value, name) => [`${value.toLocaleString()} lbs`, name]}
                  />
                  {visibleCategories.map((category, index) => (
                    <Area
                      key={category}
                      type="monotone"
                      dataKey={category}
                      stackId="1"
                      stroke={COLORS.chart[index % COLORS.chart.length]}
                      fill={COLORS.chart[index % COLORS.chart.length]}
                      fillOpacity={0.7}
                      strokeWidth={2}
                      connectNulls={true}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {}
          <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-2xl p-8 transform hover:scale-[1.02] transition-transform duration-200 lg:col-span-2">
            <div className="flex flex-col items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 text-center mb-4">Monthly Trend</h2>
              <div className="flex flex-wrap justify-center gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">Select Category</label>
                  <div className="relative">
                    <select
                      className="appearance-none border-2 border-gray-300 rounded-lg px-6 py-3 text-lg font-medium text-gray-700 bg-white shadow-sm hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-w-[200px] pr-10 cursor-pointer"
                      value={selected}
                      onChange={e => setSelected(e.target.value)}>
                      {categories.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">Select Year</label>
                  <div className="relative">
                    <select
                      className="appearance-none border-2 border-gray-300 rounded-lg px-6 py-3 text-lg font-medium text-gray-700 bg-white shadow-sm hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-w-[200px] pr-10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      value={selectedYear}
                      onChange={e => setSelectedYear(e.target.value)}
                      disabled={years.length === 0}>
                      {years.length === 0 ? (
                        <option value="">No data available</option>
                      ) : (
                        years.map(year => <option key={year}>{year}</option>)
                      )}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-11/12 mx-auto">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={filteredLineData} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    stroke={COLORS.text}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const [year, month] = value.split('-');
                      return `${month}/${year}`;
                    }}
                    label={{ value: 'Date', position: 'bottom', offset: 0, style: { textAnchor: 'middle', fontSize: 14, fill: COLORS.text } }}
                  />
                  <YAxis 
                    stroke={COLORS.text}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                      return value;
                    }}
                    domain={['auto', 'auto']}
                    label={{ value: 'Weight (lbs)', angle: -90, position: 'left', style: { textAnchor: 'middle', fontSize: 14, fill: COLORS.text } }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value) => [`${value.toLocaleString()} lbs`, 'Weight']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke={COLORS.primary} 
                    strokeWidth={3}
                    dot={{ fill: COLORS.primary, strokeWidth: 2 }}
                    activeDot={{ r: 8, fill: COLORS.primary }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-2xl p-8 transform hover:scale-[1.02] transition-transform duration-200 lg:col-span-2">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 text-center">Total Weight by Category</h2>
            <div className="w-11/12 mx-auto">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={barData} 
                  margin={{ top: 20, right: 30, bottom: 80, left: 80 }}
                  barGap={0}
                  barSize={60}
                >
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.9}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                    </linearGradient>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                      <feOffset dx="2" dy="2" result="offsetblur" />
                      <feComponentTransfer>
                        <feFuncA type="linear" slope="0.3" />
                      </feComponentTransfer>
                      <feMerge>
                        <feMergeNode />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#E5E7EB" 
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="category" 
                    stroke={COLORS.text}
                    tick={{ fontSize: 12, fill: COLORS.text }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    axisLine={{ stroke: COLORS.text, strokeWidth: 1 }}
                    tickLine={{ stroke: COLORS.text }}
                    interval={0}
                    label={{ value: 'Waste Categories', position: 'bottom', offset: 60, style: { textAnchor: 'middle', fontSize: 14, fill: COLORS.text } }}
                  />
                  <YAxis 
                    stroke={COLORS.text}
                    tick={{ fontSize: 12, fill: COLORS.text }}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                      return value;
                    }}
                    axisLine={{ stroke: COLORS.text, strokeWidth: 1 }}
                    tickLine={{ stroke: COLORS.text }}
                    width={70}
                    label={{ value: 'Total Weight (lbs)', angle: -90, position: 'left', style: { textAnchor: 'middle', fontSize: 14, fill: COLORS.text } }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value) => [`${value.toLocaleString()} lbs`, 'Weight']}
                    cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar 
                    dataKey="weight" 
                    radius={[8, 8, 0, 0]}
                    animationDuration={1500}
                    animationBegin={0}
                    filter="url(#shadow)"
                  >
                    {barData.map((entry, idx) => (
                      <Cell 
                        key={idx} 
                        fill="url(#barGradient)"
                        stroke={COLORS.primary}
                        strokeWidth={1}
                      />
                    ))}
                  </Bar>
                  <ReferenceLine 
                    y={0} 
                    stroke={COLORS.text} 
                    strokeWidth={1}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-2xl p-8 transform hover:scale-[1.02] transition-transform duration-200 lg:col-span-2">
            <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">Top Material Types Distribution</h2>
            <div className="w-11/12 mx-auto">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={140}
                    innerRadius={60}
                    label={({ name, percent }) => {
                      const label = `${name} (${(percent * 100).toFixed(0)}%)`;
                      return label.length > 20 ? `${name.slice(0, 17)}... (${(percent * 100).toFixed(0)}%)` : label;
                    }}
                    labelLine={true}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={COLORS.chart[idx % COLORS.chart.length]} />
                    ))}
                  </Pie>
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => value.length > 20 ? `${value.slice(0, 17)}...` : value}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value, name) => [`${value.toLocaleString()} lbs`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}