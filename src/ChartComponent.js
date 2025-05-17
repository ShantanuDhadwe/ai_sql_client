// client/src/ChartComponent.js
import React from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

const prepareChartData = (dbResults, originalQuestion = "") => {
  console.log("[ChartComponent] prepareChartData called with dbResults:", dbResults, "question:", originalQuestion);

  if (!dbResults || !Array.isArray(dbResults) || dbResults.length === 0) {
    console.log("[ChartComponent] No dbResults or empty array.");
    return null;
  }

  const actualData = dbResults.filter(row => typeof row === 'object' && row !== null && !row.status && !row.error);
  if (actualData.length === 0) {
    console.log("[ChartComponent] actualData is empty after filtering.");
    return null;
  }

  const keys = Object.keys(actualData[0]);
  if (keys.length === 0) {
    console.log("[ChartComponent] No keys in the first data object.");
    return null;
  }

  // DECLARE 'labels' and 'datasetValues' here with initial empty array values
  let labels = [];
  let datasetValues = [];

  let labelField = null;
  let valueField = null;

  const numericFields = keys.filter(key => typeof actualData[0][key] === 'number');
  const stringFields = keys.filter(key => typeof actualData[0][key] === 'string');
  const dateLikeField = keys.find(key => {
    const val = actualData[0][key];
    return (typeof val === 'string' && (val.match(/^\d{4}-\d{2}-\d{2}/) || val.match(/^\d{2}\/\d{2}\/\d{4}/))) || val instanceof Date;
  });

  // Determine labelField and valueField
  if (dateLikeField) {
    labelField = dateLikeField;
    if (numericFields.length > 0 && numericFields[0] !== dateLikeField) valueField = numericFields[0];
  } else if (stringFields.length > 0) {
    labelField = stringFields[0];
    if (numericFields.length > 0 && numericFields[0] !== stringFields[0]) valueField = numericFields[0];
  }

  if (!valueField && numericFields.length > 0) {
    valueField = numericFields[0];
  }
  if (!labelField && valueField && keys.length > 1) {
    labelField = keys.find(k => k !== valueField) || keys[0];
  }

  // Populate labels and datasetValues
  if (labelField && valueField) {
    labels = actualData.map(item => String(item[labelField]));
    datasetValues = actualData.map(item => parseFloat(item[valueField])).filter(v => !isNaN(v));
  } else if (valueField && keys.length === 1) { // Single numeric column
    labelField = "Index"; // Use "Index" as the pseudo label field name
    labels = actualData.map((_, index) => `Item ${index + 1}`);
    datasetValues = actualData.map(item => parseFloat(item[valueField])).filter(v => !isNaN(v));
  } else {
    console.warn("[ChartComponent] Could not determine suitable label and value fields. Keys:", keys, "numericFields:", numericFields, "stringFields:", stringFields);
    return null; // Not enough info to make a chart
  }

  console.log("[ChartComponent] Determined - labelField:", labelField, "valueField:", valueField);
  console.log("[ChartComponent] Prepared labels:", labels);
  console.log("[ChartComponent] Prepared datasetValues:", datasetValues);


  if (labels.length === 0 || datasetValues.length === 0 || labels.length !== datasetValues.length) {
    console.warn("[ChartComponent] Label/value array length mismatch or empty after processing.");
    return null;
  }

  let chartType = 'bar';
  const qLower = originalQuestion.toLowerCase();
  if (dateLikeField || qLower.includes("trend") || qLower.includes("over time") || qLower.includes("history")) {
    chartType = 'line';
  } else if ((qLower.includes("distribution") || qLower.includes("share") || qLower.includes("proportion")) &&
             datasetValues.length > 1 && datasetValues.length <= 10 && datasetValues.every(v => v >= 0)) { // Increased pie chart limit slightly
    chartType = 'pie';
  }

  console.log("[ChartComponent] Determined chartType:", chartType);

  const chartDataConfig = {
    labels: labels,
    datasets: [{
      label: `${valueField} by ${labelField}`,
      data: datasetValues,
      backgroundColor: chartType === 'pie' ?
        ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#2ecc71', '#e74c3c', '#f1c40f'] :
        chartType === 'line' ? 'rgba(54, 162, 235, 0.5)' : 'rgba(75, 192, 192, 0.6)',
      borderColor: chartType === 'pie' ? '#fff' :
        chartType === 'line' ? 'rgb(54, 162, 235)' : 'rgba(75, 192, 192, 1)',
      borderWidth: 1,
      fill: chartType === 'line' ? true : undefined,
      tension: chartType === 'line' ? 0.1 : undefined,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', display: chartType !== 'pie' || datasetValues.length <= 7 },
      title: { display: true, text: `Chart: ${valueField} by ${labelField}` },
      tooltip: { mode: 'index', intersect: false, },
    },
    scales: (chartType === 'bar' || chartType === 'line') ? {
      y: { beginAtZero: true, title: { display: !!valueField, text: valueField } },
      x: { title: { display: !!labelField, text: labelField } }
    } : undefined
  };
  console.log("[ChartComponent] Returning chart config:", { type: chartType, data: chartDataConfig, options: chartOptions });
  return { type: chartType, data: chartDataConfig, options: chartOptions };
};

const ChartComponent = ({ dbResults, originalQuestion }) => {
  console.log("[ChartComponent] Component rendering with dbResults:", dbResults, "originalQuestion:", originalQuestion);
  if (!dbResults) {
    console.log("[ChartComponent] No dbResults prop, rendering null.");
    return null;
  }

  const chartConfig = prepareChartData(dbResults, originalQuestion);

  if (!chartConfig) {
    console.log("[ChartComponent] chartConfig is null, rendering message.");
    return <p className="chart-message">Data is not suitable for charting or chart configuration failed.</p>;
  }

  console.log("[ChartComponent] Rendering chart with type:", chartConfig.type);
  return (
    <div className="chart-container" style={{ position: 'relative', height: '400px', width: '100%' }}>
      {chartConfig.type === 'bar' && <Bar options={chartConfig.options} data={chartConfig.data} />}
      {chartConfig.type === 'line' && <Line options={chartConfig.options} data={chartConfig.data} />}
      {chartConfig.type === 'pie' && <Pie options={chartConfig.options} data={chartConfig.data} />}
    </div>
  );
};

export default ChartComponent;