// Initialize the map
var map = L.map('map', {
    center: [44.15, -116.55669],  // Set the initial view
    zoom: 9,                      // Initial zoom level
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
  if (!clickedGaugeID) {
    alert("Please click on a marker to select a Gauge ID.");
    return;
}

  const gaugeId = clickedGaugeID;  // Use the GaugeID stored in clickedGaugeID

  const forecastContainer = document.getElementById('forecast-container');
  forecastContainer.style.display = 'block';

  try {
    const apiUrl = `https://api.water.noaa.gov/nwps/v1/gauges/${gaugeId}/stageflow`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error status: ${response.status} - ${response.statusText}`);
    }

    const json_data = await response.json();

    if (!json_data.forecast) {
      throw new Error("No forecast data available for this Gauge ID.");
    }

    const streamflowData = json_data.forecast.data;

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
      yAxisLabel = "Streamflow (kcfs)";  // Set Y-axis label to 'Streamflow' for flow
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
    document.getElementById('reqDepthDisplay').textContent = `Required Depth: ${reqDepth} feet`;

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
                        label: `Flat Line at Required Depth (${reqDepth} feet)`,
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


// Manually defined data (as an array of objects)
const data = [
  {
      Name: "Boise River",
      GaugeID: 13206000,
      ReachID: 23398831,
      Lat: 43.6606,
      Long: -116.279,
      rp2: 87.36,
      rp5: 133.23,
      rp10: 163.60,
      rp25: 201.97,
      rp50: 230.44,
      rp100: 258.70
  },
  {
      Name: "Payette River (Emmett)",
      GaugeID: 13249500,
      ReachID: 24166358,
      Lat: 43.9306,
      Long: -116.442,
      rp2: 516.68,
      rp5: 748.65,
      rp10: 902.23,
      rp25: 1096.27,
      rp50: 1240.23,
      rp100: 1383.12
  },
  {
      Name: "Payette River (Horseshoe Bend)",
      GaugeID: 13247500,
      ReachID: 24166566,
      Lat: 43.9433,
      Long: -116.197,
      rp2: 157.43,
      rp5: 238.36,
      rp10: 291.94,
      rp25: 359.63,
      rp50: 409.86,
      rp100: 459.71
  },
  {
      Name: "Payette River (Payette)",
      GaugeID: 13251000,
      ReachID: 24166140,
      Lat: 44.0422,
      Long: -116.925,
      rp2: 157.22,
      rp5: 243.99,
      rp10: 301.44,
      rp25: 374.03,
      rp50: 427.88,
      rp100: 481.33
  },
  {
      Name: "Middle Fork Payette (Crouch)",
      GaugeID: 13237920,
      ReachID: 24164073,
      Lat: 44.1086,
      Long: -115.982,
      rp2: 1541.40,
      rp5: 2117.38,
      rp10: 2498.73,
      rp25: 2980.57,
      rp50: 3338.03,
      rp100: 3692.85
  },
  {
      Name: "South Fork Payette (Lowman)",
      GaugeID: 13235000,
      ReachID: 24158523,
      Lat: 44.0853,
      Long: -115.622,
      rp2: 511.35,
      rp5: 748.11,
      rp10: 904.87,
      rp25: 1102.93,
      rp50: 1249.86,
      rp100: 1395.71
  },
  {
      Name: "Mores Creek (Robie)",
      GaugeID: 13200000,
      ReachID: 23382303,
      Lat: 43.6481,
      Long: -115.990,
      rp2: 53.40,
      rp5: 79.14,
      rp10: 96.19,
      rp25: 117.73,
      rp50: 133.71,
      rp100: 149.58
  },
  {
      Name: "Snake River (Weiser)",
      GaugeID: 13269000,
      ReachID: 24193082,
      Lat: 44.2456,
      Long: -116.980,
      rp2: 263.80,
      rp5: 395.84,
      rp10: 483.27,
      rp25: 593.74,
      rp50: 675.69,
      rp100: 757.03
  },
  {
      Name: "Weiser River (Cambridge)",
      GaugeID: 13258500,
      ReachID: 24184234,
      Lat: 44.5794,
      Long: -116.643,
      rp2: 517.06,
      rp5: 750.31,
      rp10: 904.75,
      rp25: 1099.88,
      rp50: 1244.63,
      rp100: 1388.32
  }
];

// Variable to store clicked GaugeID
let clickedGaugeID = null;

// Loop through the data and create markers
data.forEach(row => {
  if (row.Lat && row.Long) {  // Ensure valid lat/long values
      const marker = L.marker([row.Lat, row.Long]) // Create a marker at lat, long
          .bindTooltip(row.Name)  // Tooltip will show the Name on hover
          .addTo(map);  // Add the marker to the map

      // Event listener for click to store GaugeID
      marker.on('click', function() {
        clickedGaugeID = row.GaugeID;
        clickedName = row.Name;
        clickedrp2 = row.rp2;
        clickedrp10 = row.rp10;
        clickedrp50 = row.rp50;
        document.getElementById('clickedGaugeId').textContent = clickedGaugeID;
        document.getElementById('clickedName').textContent = clickedName;

        Forecast()
      });
  }
});

function checkFlood() {
  // Get the rp2, rp10, rp50 values from the clicked location
  const rp2 = parseFloat(document.getElementById('clickedrp2').textContent);
  const rp10 = parseFloat(document.getElementById('clickedrp10').textContent);
  const rp50 = parseFloat(document.getElementById('clickedrp50').textContent);

  // Check if the rp2, rp10, rp50 values are valid
  if (isNaN(rp2) || isNaN(rp10) || isNaN(rp50)) {
      alert("Please select a valid location.");
      return;
  }

  // Automatically update the dropdowns for the "check flood" scenario
  document.getElementById('dataType').value = 'stage';  // Set data type to 'stage'
  document.getElementById('yAxisType').value = 'min';   // Set Y-axis type to 'min' for minimum stage

  // Get the selected data type (Stage) and Y-axis type (min)
  const selectedDataType = 'stage'; // We set it to 'stage' automatically now
  const selectedYAxis = 'min';      // We set it to 'min' automatically now

  // Now, we want to handle **stage** only for check flood scenario
  if (selectedDataType === 'stage') {
      let chartData = [];
      let chartLabel = "Flood Stage Forecast";
      let chartColor = "#0066cc";  // Blue for Stage
      let yAxisLabel = "Stage (ft)";  // Y-axis label for stage

      // Use the stage data directly from the clicked location
      if (selectedYAxis === 'min') {
          chartData = data.map(item => item.rp2);  // Use rp2 from the data for flood line
      }

      // Create flat lines at rp2, rp10, rp50 (these are constant for the clicked river location)
      const rp2LineData = new Array(data.length).fill(rp2);  // Create a flat line at rp2 for all data points
      const rp10LineData = new Array(data.length).fill(rp10);  // Create a flat line at rp10 for all data points
      const rp50LineData = new Array(data.length).fill(rp50);  // Create a flat line at rp50 for all data points

      // Update the chart with the new data (stage-related)
      const ctx = document.getElementById('streamflowChart').getContext('2d');
      if (chart) {
          chart.destroy();  // Destroy existing chart before creating a new one
      }

      chart = new Chart(ctx, {
          type: "line",
          data: {
              labels: data.map(item => item.Name),  // Using the river station names for labels
              datasets: [
                  {
                      label: chartLabel,
                      data: chartData,
                      borderColor: chartColor,  // Use chartColor for the line
                      borderWidth: 3,
                      fill: true,
                      tension: 0.4,
                  },
                  {
                      label: `Flood Line at RP2 (${rp2} ft)`,
                      data: rp2LineData,  // Flood line at RP2
                      borderColor: "#FF0000",  // Red for RP2
                      borderWidth: 2,
                      borderDash: [5, 5],  // Dashed line
                      fill: false,
                      tension: 0,  // Flat line
                      pointRadius: 0,  // No points on line
                  },
                  {
                      label: `Flood Line at RP10 (${rp10} ft)`,
                      data: rp10LineData,  // Flood line at RP10
                      borderColor: "#FF6600",  // Orange for RP10
                      borderWidth: 2,
                      borderDash: [5, 5],  // Dashed line
                      fill: false,
                      tension: 0,  // Flat line
                      pointRadius: 0,  // No points on line
                  },
                  {
                      label: `Flood Line at RP50 (${rp50} ft)`,
                      data: rp50LineData,  // Flood line at RP50
                      borderColor: "#FFFF00",  // Yellow for RP50
                      borderWidth: 2,
                      borderDash: [5, 5],  // Dashed line
                      fill: false,
                      tension: 0,  // Flat line
                      pointRadius: 0,  // No points on line
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
                          text: "River Stations",  // Title of X-axis
                          color: "black",
                          font: { size: 16, weight: "bold" },
                      },
                  },
                  y: {
                      ticks: { color: "black", font: { size: 14 } },
                      grid: { color: "rgba(0, 0, 0, 0.1)" },
                      title: {
                          display: true,
                          text: yAxisLabel,  // Y-axis label for stage
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
