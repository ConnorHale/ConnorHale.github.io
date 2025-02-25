// Initialize the map
var map = L.map('map', {
    center: [43.833, -116.55669],  // Set the initial view
    zoom: 7,                      // Initial zoom level
    scrollWheelZoom: false,        // Disable scroll zoom
    dragging: false,               // Disable dragging (panning)
    touchZoom: false,              // Disable touch zoom (for mobile devices)
    doubleClickZoom: false         // Disable zooming via double-click
  });
  
  // Add tile layer
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  }).addTo(map);

let groupedData = [];
let chart = null;
let reqDepth = null;  // This will store the entered reqDepth value

// Function to get forecast data from the API and process it
async function Forecast() {
  const gaugeId = document.getElementById('gaugeID').value;
  if (!gaugeId) {
    alert("Please enter a Gauge ID.");
    return;
  }

  const forecastContainer = document.getElementById('forecast-container');
  forecastContainer.style.display = 'block';

  try {
    const apiUrl = `https://api.water.noaa.gov/nwps/v1/gauges/${gaugeId}/stageflow`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error status: ${response.status} - ${response.statusText}`);
    }

    const json_data = await response.json();

    if (!json_data.observed) {
      throw new Error("No forecast data available for this Gauge ID.");
    }

    const streamflowData = json_data.observed.data;

    // Initialize arrays to store daily statistics
    groupedData = [];

    // Group data by day
    streamflowData.forEach(item => {
      const validTime = new Date(item.validTime);
      const primaryValue = item.primary;  // Stage (primary)
      const secondaryValue = item.secondary;  // Flow (secondary)

      // Extract just the date part (ignore time)
      const dateString = validTime.toISOString().split('T')[0];  // Format as 'YYYY-MM-DD'

      // Find if we already have a group for this day
      let group = groupedData.find(group => group.date === dateString);
      if (!group) {
        group = { 
          date: dateString, 
          flowSum: 0, 
          stageSum: 0, 
          count: 0, 
          maxFlow: -Infinity,  // Start with very low value for max
          minFlow: Infinity,   // Start with very high value for min
          maxStage: -Infinity, // Start with very low value for max
          minStage: Infinity,  // Start with very high value for min
        };
        groupedData.push(group);
      }

      // Add the current data to the corresponding group
      group.flowSum += secondaryValue;
      group.stageSum += primaryValue;
      group.count++;

      // Update max and min for flow and stage
      if (secondaryValue > group.maxFlow) group.maxFlow = secondaryValue;
      if (secondaryValue < group.minFlow) group.minFlow = secondaryValue;
      if (primaryValue > group.maxStage) group.maxStage = primaryValue;
      if (primaryValue < group.minStage) group.minStage = primaryValue;
    });

    // Calculate daily averages and update the grouped data
    groupedData.forEach(group => {
      group.avgFlow = group.flowSum / group.count;
      group.avgStage = group.stageSum / group.count;
    });

    // Update or create the chart
    const ctx = document.getElementById('streamflowChart').getContext('2d');
    if (chart) {
      chart.destroy();  // Destroy existing chart before creating a new one
    }

    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: groupedData.map(item => item.date),  // Use the date as the label
        datasets: [
          {
            label: "Streamflow Forecast (Daily Average)",
            data: groupedData.map(item => item.avgFlow),
            borderColor: "#7a1b06",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#000000",
            pointBorderColor: "#ffffff",
            pointRadius: 5,
            pointHoverRadius: 8,
          }
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: "black",
              font: {
                size: 16,
                weight: "bold",
              },
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            titleFont: { size: 14, weight: "bold" },
            bodyFont: { size: 12 },
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            ticks: { color: "black", font: { size: 14 } },
            grid: { color: "rgba(0, 0, 0, 0.1)" },
            title: {
              display: true,
              text: "Date",
              color: "black",
              font: { size: 16, weight: "bold" },
            },
          },
          y: {
            ticks: { color: "#black", font: { size: 14 } },
            grid: { color: "rgba(0, 0, 0, 0.1)" },
            title: {
              display: true,
              text: "Streamflow (cfs)",
              color: "black",
              font: { size: 16, weight: "bold" },
            },
            min: 0,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching or processing data:', error);
    alert("Error fetching forecast: " + error.message);

    const chartCanvas = document.getElementById('streamflowChart');
    chartCanvas.innerHTML = "";  // Clear the chart canvas
  }
}

// Update the chart based on dropdown selections (Stage vs Streamflow, Y-axis, and Chart type)
function updateChart() {
    const selectedYAxis = document.getElementById('yAxisType').value; // avg, max, min
    const selectedDataType = document.getElementById('dataType').value; // flow or stage
  
    let chartData = [];
    let chartLabel = "";
    let chartColor = "";
    let yAxisLabel = ""; // This will dynamically change based on the selected data type
  
    // Select the appropriate data based on the selected type
    if (selectedDataType === 'stage') {
      // Using Stage data
      if (selectedYAxis === 'avg') {
        chartData = groupedData.map(group => group.avgStage);
      } else if (selectedYAxis === 'max') {
        chartData = groupedData.map(group => group.maxStage);
      } else if (selectedYAxis === 'min') {
        chartData = groupedData.map(group => group.minStage);
      }
      chartLabel = "Stage Forecast";
      chartColor = "#0066cc";  // Blue for Stage
      yAxisLabel = "Elevation (ft)";  // Set Y-axis label to 'Elevation' for stage
    } else {
      // Using Streamflow data
      if (selectedYAxis === 'avg') {
        chartData = groupedData.map(group => group.avgFlow);
      } else if (selectedYAxis === 'max') {
        chartData = groupedData.map(group => group.maxFlow);
      } else if (selectedYAxis === 'min') {
        chartData = groupedData.map(group => group.minFlow);
      }
      chartLabel = "Streamflow Forecast";
      chartColor = "#7a1b06";  // Brown for Streamflow
      yAxisLabel = "Streamflow (cfs)";  // Set Y-axis label to 'Streamflow' for flow
    }
  
    // Update chart's label and color
    chart.data.datasets[0].label = `${chartLabel} (${selectedYAxis.charAt(0).toUpperCase() + selectedYAxis.slice(1)})`;
    chart.data.datasets[0].borderColor = chartColor;
    chart.data.datasets[0].data = chartData;
  
    // Update Y-axis title dynamically
    chart.options.scales.y.title.text = yAxisLabel;
  
    // Update the chart with the new data
    chart.update();
  }
  

// Function to update reqDepth based on selected watercraft type
function updateReqDepth() {
    const rectype = document.getElementById('rectype').value;
    let reqDepth;

    // Setting reqDepth based on selected watercraft
    switch (rectype) {
        case 'tube':
        case 'raft':
            reqDepth = 0.5;
            break;
        case 'kayak':
            reqDepth = 1;
            break;
        case 'canoe':
            reqDepth = 2;
            break;
        case 'outboard':
            reqDepth = 3;
            break;
        case 'inboard':
            reqDepth = 4;
            break;
        default:
            reqDepth = 0;
    }

    // Display the required depth in the text
    document.getElementById('reqDepthDisplay').textContent = `Required Depth: ${reqDepth} meters`;

    // Store reqDepth in the hidden input field
    document.getElementById('reqDepth').value = reqDepth;
}

function checkLowElevation() {
    // Get reqDepth value from hidden input
    const reqDepth = parseFloat(document.getElementById('reqDepth').value);

    // Check if reqDepth is valid
    if (isNaN(reqDepth)) {
        alert("Please select a valid watercraft type.");
        return;
    }

    // Automatically update the dropdowns for the "check low elevation" scenario
    document.getElementById('dataType').value = 'stage';  // Set data type to 'stage'
    document.getElementById('yAxisType').value = 'min';   // Set Y-axis type to 'min' for minimum stage

    // Get the selected data type (Stage) and Y-axis type (min)
    const selectedDataType = 'stage'; // We set it to 'stage' automatically now
    const selectedYAxis = 'min';      // We set it to 'min' automatically now

    // Now, we want to handle **stage** only for check low elevation
    if (selectedDataType === 'stage') {
        let chartData = [];
        let chartLabel = "Minimum Stage Forecast";
        let chartColor = "#0066cc";  // Blue for Stage
        let yAxisLabel = "Stage (ft)";  // Y-axis label for stage

        // Use minimum stage data (minStage) for the selected Y-axis type
        if (selectedYAxis === 'min') {
            chartData = groupedData.map(item => item.minStage);
        }

        // Create a flat line at the reqDepth
        const flatLineData = groupedData.map(item => reqDepth);  // Create a line at reqDepth for each date

        // Create color dataset for the points based on comparison with reqDepth
        const colorData = groupedData.map(item => {
            // Compare the minStage value with reqDepth
            return item.minStage < reqDepth ? "red" : "green";  // red for below, green for above
        });

        // Update the chart with the new data (stage-related)
        const ctx = document.getElementById('streamflowChart').getContext('2d');
        if (chart) {
            chart.destroy();  // Destroy existing chart before creating a new one
        }

        chart = new Chart(ctx, {
            type: "line",
            data: {
                labels: groupedData.map(item => item.date),
                datasets: [
                    {
                        label: chartLabel,
                        data: chartData,
                        borderColor: chartColor,  // Use chartColor for the line
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: colorData,  // Color points based on condition
                        pointBorderColor: "#ffffff",
                        pointRadius: 5,
                        pointHoverRadius: 8,
                    },
                    {
                        label: `Flat Line at Req Depth (${reqDepth} meters)`,
                        data: flatLineData,  // This creates the flat line
                        borderColor: "#FF0000",  // Flat line color (Red)
                        borderWidth: 2,
                        borderDash: [5, 5],  // Dashed line style
                        fill: false,
                        tension: 0,  // No curve, just a straight line
                        pointRadius: 0,  // No points on the flat line
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: "black",
                            font: {
                                size: 16,
                                weight: "bold",
                            },
                        },
                    },
                    tooltip: {
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        titleFont: { size: 14, weight: "bold" },
                        bodyFont: { size: 12 },
                        cornerRadius: 8,
                    },
                },
                scales: {
                    x: {
                        ticks: { color: "black", font: { size: 14 } },
                        grid: { color: "rgba(0, 0, 0, 0.1)" },
                        title: {
                            display: true,
                            text: "Date",
                            color: "black",
                            font: { size: 16, weight: "bold" },
                        },
                    },
                    y: {
                        ticks: { color: "black", font: { size: 14 } },
                        grid: { color: "rgba(0, 0, 0, 0.1)" },
                        title: {
                            display: true,
                            text: yAxisLabel,  // Set Y-axis title dynamically based on selection
                            color: "black",
                            font: { size: 16, weight: "bold" },
                        },
                        min: 0,  // Set minimum Y-axis value to 0
                    },
                },
            },
        });
    }
}


 // Fetch the CSV data
 fetch('gauges.csv')  // Update with your correct path to the CSV
 .then(response => response.text())
 .then(csvString => {
     // Parse the CSV data using PapaParse
     const data = Papa.parse(csvString, {
         header: true, // Use first row as headers
         dynamicTyping: true // Automatically convert types
     }).data;

     // Loop through the data and create markers
     data.forEach(row => {
         // Ensure we have valid latitude and longitude
         if (row.Lat && row.Long) {
             L.marker([row.Lat, row.Long])  // Create a marker at lat, long
                 .bindPopup(`<strong>${row.Name}</strong><br>GaugeID: ${row.GaugeID}`)  // Popup with data
                 .addTo(map);  // Add the marker to the map
         }
     });
 })
 .catch(error => {
     console.error('Error loading CSV:', error);
 });


 L.marker([row.Lat, row.Long])
 .bindPopup(`<strong>${row.Name}</strong><br>GaugeID: ${row.GaugeID}`)
 .addTo(map);  // Add marker to the map