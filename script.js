// =============================
// ELEMENTS
// =============================

const forecastBtn =
    document.getElementById("forecastBtn");

const insights =
    document.getElementById("insights");

const downloadBtn =
    document.getElementById("downloadBtn");

const weatherBtn =
    document.getElementById("weatherBtn");

const weatherInfo =
    document.getElementById("weatherInfo");

let forecastData = [];


// =============================
// LIVE WEATHER
// =============================

weatherBtn.addEventListener("click", async ()=>{

    const city =
        document.getElementById("cityInput").value;

    if(!city){

        alert("Please enter city name");

        return;
    }

    weatherInfo.innerHTML =
        "Loading weather...";

    try{

        const response = await fetch(
            `https://agrocast-ai.onrender.com/weather?city=${city}`
        );

        const data = await response.json();

        // Error handling
        if(data.cod && data.cod !== 200){

            weatherInfo.innerHTML =
                "❌ City not found";

            return;
        }

        weatherInfo.innerHTML = `

            <h2>📍 ${data.name}</h2>

            <p>
            🌡️ Temperature:
            ${data.main.temp}°C
            </p>

            <p>
            💧 Humidity:
            ${data.main.humidity}%
            </p>

            <p>
            🌬️ Wind Speed:
            ${data.wind.speed} km/h
            </p>

            <p>
            ⚡ Pressure:
            ${data.main.pressure} hPa
            </p>

            <p>
            ☁️ Condition:
            ${data.weather[0].description}
            </p>
        `;

    }catch(error){

        console.log(error);

        weatherInfo.innerHTML =
            "❌ Failed to fetch weather";
    }
});


// =============================
// FORECAST BUTTON
// =============================

forecastBtn.addEventListener("click", async ()=>{

    insights.innerHTML =
        "Loading predictions...";

    try{

        const response =
            await fetch(
                "https://agrocast-ai.onrender.com/forecast"
            );

        const data =
            await response.json();

        forecastData =
            data.humidity_predictions;

        createChart(forecastData);

        generateInsights(forecastData);

    }catch(error){

        console.log(error);

        insights.innerHTML =
            "❌ Failed to load forecast";
    }
});


// =============================
// CHART FUNCTION
// =============================

function createChart(data){

    const ctx =
        document.getElementById("forecastChart");

    // Destroy old chart
    if(window.myChart){

        window.myChart.destroy();
    }

    window.myChart = new Chart(ctx, {

        type:"line",

        data:{

            labels:
                data.map((_,i)=>`Day ${i+1}`),

            datasets:[{

                label:"Humidity Forecast",

                data:data,

                borderWidth:3,

                tension:0.4,

                fill:true
            }]
        },

        options:{

            responsive:true,

            maintainAspectRatio:false
        }
    });
}


// =============================
// AI INSIGHTS
// =============================

function generateInsights(data){

    let avg =
        data.reduce((a,b)=>a+b,0)
        / data.length;

    insights.innerHTML = `

        <p>
        🌡️ Average Predicted Humidity:
        ${avg.toFixed(2)}%
        </p>

        <p>
        ⚠️ High humidity may increase
        crop disease risk.
        </p>

        <p>
        💧 Monitor irrigation planning
        carefully.
        </p>

        <p>
        🌾 Recommended for agricultural
        weather monitoring.
        </p>
    `;
}


// =============================
// DOWNLOAD CSV
// =============================

downloadBtn.addEventListener("click", ()=>{

    if(forecastData.length === 0){

        alert("Generate forecast first");

        return;
    }

    let csvContent =
        "data:text/csv;charset=utf-8,";

    forecastData.forEach((value,index)=>{

        csvContent +=
            `Day ${index+1},${value}\n`;
    });

    const encodedUri =
        encodeURI(csvContent);

    const link =
        document.createElement("a");

    link.setAttribute(
        "href",
        encodedUri
    );

    link.setAttribute(
        "download",
        "humidity_forecast.csv"
    );

    document.body.appendChild(link);

    link.click();
});


// =============================
// DARK/LIGHT MODE
// =============================

const themeBtn =
    document.getElementById("themeBtn");

themeBtn.addEventListener("click", ()=>{

    document.body.classList.toggle("light");
});