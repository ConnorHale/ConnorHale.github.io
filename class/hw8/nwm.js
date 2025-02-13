// script.js
async function Forecast() {
    const reachId = document.getElementById('reachID').value;
    if (!reachId) {
      alert("Please enter a Reach ID.");
      return;
    }
  
    const forecastContainer = document.getElementById('forecast-container');
    forecastContainer.style.display = 'block';
  
    try {
      const apiUrl = `https://api.water.noaa.gov/nwps/v1/reaches/${reachId}/streamflow?series=short_range`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error status: ${response.status} - ${response.statusText}`);
      }
  
      const json_data = await response.json();
  
      if (!json_data.shortRange || !json_data.shortRange.series || !json_data.shortRange.series.data || json_data.shortRange.series.data.length === 0) {
          throw new Error("No forecast data available for this Reach ID.");
      }
  
      const streamflowData = json_data.shortRange.series.data;
      const timestamps = streamflowData.map(item => item.validTime);
      const flowValues = streamflowData.map(item => item.flow);
  
      // Update the table
      const table = document.getElementById('timeseries-datatable').getElementsByTagName('tbody')[0];
      table.innerHTML = "";
  
      for (let i = 0; i < streamflowData.length; i++) {
        const row = table.insertRow();
        const timestampCell = row.insertCell();
        const flowCell = row.insertCell();
        timestampCell.textContent = timestamps[i];
        flowCell.textContent = flowValues[i];
      }
  
      // Update or create the chart
      const ctx = document.getElementById('streamflowChart').getContext('2d');
      let chart = Chart.getChart('streamflowChart');
  
      if (chart) {
        chart.destroy();
      }
  
      chart = new Chart(ctx, {
      type: "line",
      data: {
          labels: timestamps,
          datasets: [
              {
                  label: "Streamflow Forecast (Short Range)",
                  data: flowValues,
                  borderColor: "#0077b6", // Deep blue
                  borderWidth: 3,
                  fill: true,
                  backgroundColor: createGradient(ctx),
                  tension: 0.4, // Smooth curved lines
                  pointBackgroundColor: "#ffcc00", // Yellow points
                  pointBorderColor: "#005f99",
                  pointRadius: 5,
                  pointHoverRadius: 8,
                  pointHoverBackgroundColor: "#ff5733", // Bright orange hover effect
              },
          ],
      },
      options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
              legend: {
                  labels: {
                      color: "#333",
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
                  ticks: { color: "#005f99", font: { size: 14 } },
                  grid: { color: "rgba(0, 0, 0, 0.1)" },
                  title: {
                      display: true,
                      text: "Time",
                      color: "#222",
                      font: { size: 16, weight: "bold" },
                  },
              },
              y: {
                  ticks: { color: "#005f99", font: { size: 14 } },
                  grid: { color: "rgba(0, 0, 0, 0.1)" },
                  title: {
                      display: true,
                      text: "Streamflow (cfs)",
                      color: "#222",
                      font: { size: 16, weight: "bold" },
                  },
              },
          },
          animations: {
              tension: {
                  duration: 2000,
                  easing: "easeInOutBounce",
                  from: 0.5,
                  to: 0,
                  loop: false,
              },
          },
      },
  });
  
  // Function to create a water-like gradient
  function createGradient(ctx) {
      let gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
      gradient.addColorStop(0, "rgba(0, 119, 182, 0.5)"); // Deep blue
      gradient.addColorStop(1, "rgba(173, 216, 230, 0.2)"); // Light blue
      return gradient;
  }
  
  
    } catch (error) {
      console.error('Error fetching or processing data:', error);
      alert("Error fetching forecast: " + error.message);
  
      const table = document.getElementById('timeseries-datatable').getElementsByTagName('tbody')[0];
      table.innerHTML = "";
  
      const chartCanvas = document.getElementById('streamflowChart');
      chartCanvas.innerHTML = "";
  
    }
  }
  

