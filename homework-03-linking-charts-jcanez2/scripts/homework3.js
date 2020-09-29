var mapSvg;
var lineSvg;
var lineWidth;
var lineHeight;
var lineInnerHeight;
var lineInnerWidth;
var lineMargin = { top: 20, right: 60, bottom: 60, left: 100 };
var mapData;
var timeData;
let toolTip;

// This runs when the page is loaded
document.addEventListener("DOMContentLoaded", function() {
  mapSvg = d3.select("#map");
  lineSvg = d3.select("#linechart");
  lineWidth = +lineSvg.style("width").replace("px","");
  lineHeight = +lineSvg.style("height").replace("px","");;
  lineInnerWidth = lineWidth - lineMargin.left - lineMargin.right;
  lineInnerHeight = lineHeight - lineMargin.top - lineMargin.bottom;

  // Load both files before doing anything else
  Promise.all([d3.json("data/africa.geojson"),
               d3.csv("data/africa_gdp_per_capita.csv")])
          .then(function(values){
    
    mapData = values[0];
    timeData = values[1];
  // Draw initial map
    drawMap();
  // Update map on change of widgets
   document.getElementById("year-input").addEventListener("change", function(event) {drawMap();});
   document.getElementById("color-scale-select").addEventListener("change", function(event) {drawMap();});
  }) 
});

// Get the min/max values for a year and return as an array
// of size=2. You shouldn"t need to update this function.
function getExtentsForYear(yearData) {
  var max = Number.MIN_VALUE;
  var min = Number.MAX_VALUE;
  for(var key in yearData) {
    if(key == "Year") 
      continue;
    let val = +yearData[key];
    if(val > max)
      max = val;
    if(val < min)
      min = val;
  }
  return [min,max];
}

// Draw the map in the #map svg
function drawMap() {
  
  // create the map projection and geoPath
  let projection = d3.geoMercator()
                      .scale(400)
                      .center(d3.geoCentroid(mapData))
                      .translate([+mapSvg.style("width").replace("px","")/2,
                                  +mapSvg.style("height").replace("px","")/2.3]);
  let path = d3.geoPath()
               .projection(projection);

  // get the selected year based on the input box"s value
  let inputYear = d3.select("#year-input").node().value;
  // get the GDP values for countries for the selected year
  let yearData = timeData.filter( d => d.Year == inputYear)[0];
  // get the min/max GDP values for the selected year
  let extent = getExtentsForYear(yearData);
  // get the selected color scale based on the dropdown value
  let inputColor = d3.select("#color-scale-select").node().value;
  let colorScale = d3.scaleSequential(d3[inputColor])
                     .domain(extent);
  
  // Create a tooltip object to use
  let backGroundColorNumber = d3.max(colorScale.domain())/ 2
  toolTip = d3.select("body")
  .append("div")
    .style("border-radius", "5px")
    .style("color", colorScale(backGroundColorNumber * 2))
    .style("position", "absolute")
    .style("background-color", colorScale(backGroundColorNumber))
    .style("border", "solid")
    .style("border-width", "2px")
    .style("border-color", colorScale(4))
    .style("padding", "px")
    .style("opacity", 0);
  
  // draw the map on the #map svg
  let g = mapSvg.append("g");
  g.selectAll("path")
    .data(mapData.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("id", d => { return d.properties.name})
    .attr("class","countrymap")
    .style("fill", d => {
      let val = +yearData[d.properties.name];
      if(isNaN(val)) 
        return "white";
      return colorScale(val);
    })
    .on("mouseover", function(d) {
      // Change Border to cyan
      d3.select(this)
      .style("stroke-width", 4)
      .style("stroke", "cyan");
    })
    .on("mousemove",function(d) {
      // Display tool tip
      toolTip.html("Country : " + d.properties.name + "<br>" + "GDP : " + yearData[d.properties.name])
      .style("top", (d3.event.pageY - 20) + "px")
      .style("left", (d3.event.pageX + 25) + "px")
      .style("opacity", 1);
    })
    .on("mouseout", function(d,i) {
      // Remove tool tip
      toolTip.style("opacity", 0);
      // Change Border back
      d3.select(this)
      .style("stroke-width", 1)
      .style("stroke", "black");
    })
    .on("click", function(d) {
      console.log("clicked on " + d.properties.name);
      drawLineChart(d.properties.name);
    });

    // Draw Legend
    d3.select("#linear-gradient").remove();
    d3.select("g.x-axis").remove();
    
    let tickCount = 5;
    let barWidth = 200;
    let barHeight = 20;
    let fontSize = 9;

    const defs = mapSvg.append("defs");
    const linearGradient = defs.append("linearGradient")
      .attr("id", "linear-gradient");  

    let axisScale = d3.scaleLinear()
    .domain(colorScale.domain())
    .range([40, 240]);

    let axisBottom = g => g
    .attr("class", "gradientAxis")
    .attr("transform", `translate(${-barHeight},${lineInnerHeight})`)
    .call(d3.axisBottom(axisScale)
      .ticks(tickCount)
      .tickSize(-barHeight));

    linearGradient.selectAll("stop")
      .data(colorScale.ticks().map((t, i, n) => ({ offset: `${100*i/n.length}%`, color: colorScale(t)})))
      .enter().append("stop")
      .attr("offset", d => d.offset)
      .attr("stop-color", d => d.color);

    mapSvg.append("g")
      .attr("transform", `translate(0,${lineInnerHeight - barHeight})`)
      .append("rect")
      .attr("transform", `translate(${barHeight}, 0)`)
    .attr("width", barWidth)
    .attr("height", barHeight)
    .style("fill", "url(#linear-gradient)");
  
    mapSvg.append("g")
      .call(axisBottom);

    d3.selectAll(".x-axis text")
    .style("font-size",fontSize+"px"); 
}
// Draw the line chart in the #linechart svg for
// the country argument (e.g., `Algeria").
function drawLineChart(country) {
  // Remove old chart if needed
  d3.select("g.lineChart").remove();
  // Get datapoints
  let timeLine = timeData;
  timeLine.forEach(dataPoint => {
    for(let point in dataPoint) {
          dataPoint[point] = +dataPoint[point]
    }
});
// get x values
let x = d3.scaleLinear();
  x.domain(d3.extent(timeLine, function(d) { return d.Year; }))
    .range([ 0, lineInnerWidth ]);
// get y values
let y = d3.scaleLinear().domain([0, d3.max(timeLine, d => d[country] )])
  .range([lineInnerHeight,0]);
// append line chart
let g = lineSvg.append("g")
        .attr("class","lineChart")
        .attr("transform",`translate(${lineMargin.left},${lineMargin.top})`);
// attach x axis label
g.append("text")
.style("fill", "grey")
.style("text-anchor","middle")
.attr("transform",`translate(${lineInnerWidth/2},${lineInnerHeight + 40})`)
.style("font-size", "22px")
.attr("font-family", "sans-serif")
.text("Year");
// attach y axis label
g.append("text")
.style("fill", "grey")
.attr("dy","-50")
.attr("dx", -60)
.style("font-size", "22px")
.attr("font-family", "sans-serif")
.style("text-anchor","end")
.attr("transform","rotate(-90)")
.text(`GDP for ${country} (based on current USD)`);
// attach horizontal lines
console.log("number needed" + (-lineWidth + lineMargin.left + lineMargin.right + "  " + lineInnerWidth ));
g.append("g")
  .style("font-size", "14px")
  .attr("font-family", "sans-serif")
  .attr("color", "grey")
  .call(d3.axisLeft(y).tickSize(-lineInnerWidth))
  .call(g => g.select(".domain")
        .remove())
  .call(g => g.selectAll(".tick:not(:first-of-type) line")
        .attr("stroke-opacity", 0.5)
        .attr("stroke-dasharray", "5,10"));
// format and attach bottom axis
g.append("g")
  .attr("class","xAxis")   
  .attr("font-family", "sans-serif")
  .attr("color", "grey")
  .style("font-size", "16px")
  .attr("transform",`translate(0,${lineInnerHeight})`)
  .call(d3.axisBottom(x)
  .ticks(d3.Number)
  .tickFormat(d3.format("0")));
//attach line
  const line = d3.line()
  .x(d => x(d.Year))
  .y(d => y(d[country] || 0))  
  .curve(d3.curveLinear);
g.append("path")
  .datum(timeLine)  
  .style("stroke-width","2")
  .style("r", 0)      
  .style("fill","none")
  .style("stroke","black")
  .attr("d", line);
//****************************Add Circle and Tool Tip */
// Retrive the closest x corrdinate 
let bisect = d3.bisector(function(d) { return d.Year; }).left;
// Create circle
let lineCircle = lineSvg
  .append("g")
  .append("circle")
    .style("fill", "none")
    .attr("stroke", "black")
    .attr("stroke-width", 4)
    .attr("r", 10)
    .style("opacity", 0);
  // Create tool tip
    let toolTipLine = d3.select("body")
  .append("div")
    .style("position", "absolute")
    .style("opacity", 0)
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style("border-radius", "5px")
    .style("padding", "10px");
  // Add ghost Rectangle and logic for movement
  lineSvg
    .append("rect")
    .style("fill", "none")
    .style("pointer-events", "all")
    .attr("width", lineInnerWidth)
    .attr("height", lineHeight)
    .on("mouseover", function(d){
      lineCircle.style("opacity", 1);
      toolTipLine.style("opacity", 1);
    })
    .on("mouseout", function(d){
      lineCircle.style("opacity", 0);
      toolTipLine.style("opacity", 0);
    })
    .on("mousemove",function(d) {
      let x0 = x.invert(d3.mouse(this)[0]);
      let i = bisect(timeLine, x0, 1);
      let selectedData = timeLine[i];

      lineCircle.attr("cx", x(selectedData.Year) + 100)
          .attr("cy", y(selectedData[country]) + 20);
          
      toolTipLine.html("Year :" + selectedData.Year + "<br>" + "GDP :" + selectedData[country]) 
        .style("top", (d3.event.pageY - 70) + "px")
        .style("left", (d3.event.pageX - 50) + "px")
      })
      .attr("transform",`translate(${130},0)`); 

    d3.selectAll("g.xAxis text")
    .each(function(d){
      if(d % 2 !== 0){
        d3.select(this).remove();
      }
    }); 
}


