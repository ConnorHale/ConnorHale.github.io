
// Create Map
const map = L.map('map').setView([43.833, -116.55669], 10);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
}).addTo(map);
  


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
      cont depthValues = streamflowData.map(item => item.)
  
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
                  borderColor: "#7a1b06", 
                  borderWidth: 3,
                  fill: true,
                  tension: 0.4, 
                  pointBackgroundColor: "#000000", 
                  pointBorderColor: "#ffffff",
                  pointRadius: 5,
                  pointHoverRadius: 8,
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
                      text: "Timestamp",
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
  
function checkrec (){
    let craft = document.getElementById("rectype").value
    let lowdepth = document.getElementById("low").value
    if(craft=="tube"){
      reqdepth = 0.5
    }
    if(craft=="raft"){
        reqdepth = 0.5
      }
    if(inputunits=="kayak"){
      inconversion = 1
    }
    if(inputunits=="canoe"){
      inconversion = 2
    }
    if(inputunits=="outboard"){
        inconversion = 3
    }
    if(inputunits=="inboard"){
      inconversion = 4
    }
    if (lowdepth < reqdepth){
        check = "No"
    }
    else{check="Yes"}







