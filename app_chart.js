async function draw() {
    const data = await d3.csv('data/delittiPS2.csv', d3.autoType)
    console.log(data)
    let dimensions = {
        width: 1000,
        height: 500,
        margins: 50,
    };

    dimensions.ctrWidth = dimensions.width - dimensions.margins * 2
    dimensions.ctrHeight = dimensions.height - dimensions.margins * 2

    // Draw Image
    const svg = d3.select('#chart')
        .append("svg")
        .attr("width", dimensions.width)
        .attr("height", dimensions.height)

    const ctr = svg.append("g") // <g>
        .attr(
            "transform",
            `translate(${dimensions.margins}, ${dimensions.margins})`
        )
    //////////
    // GENERAL //
    //////////

    // List of groups = header of the csv files
    var keys = data.columns.slice(1)

    // color palette
    var color = d3.scaleOrdinal()
        .domain(keys)
        .range(d3.schemeSet2);

    //stack the data?
    var stackedData = d3.stack()
        .keys(keys)
        (data)
    //////////
    // AXIS //
    //////////

    // Add X axis
    var x = d3.scaleLinear()
        .domain(d3.extent(data, function (d) { return d.Anno; }))
        .range([0, dimensions.ctrWidth]);
    var xAxis = ctr.append("g")
        .attr("transform", "translate(0," + dimensions.ctrHeight + ")")
        .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format("1")))

    // Add X axis label:
    ctr.append("text")
        .attr("text-anchor", "end")
        .attr("x", dimensions.ctrWidth)
        .attr("y", dimensions.ctrHeight + dimensions.margins)
        .text("Anno");

    // Add Y axis label:
    ctr.append("text")
        .attr("text-anchor", "end")
        .attr("x", 0)
        .attr("y", -20)
        .text("# reati")
        .attr("text-anchor", "start")

    // Add Y axis
    var y = d3.scaleLinear()
        .domain([0, 3636656])   //sostituire con valore max ricavato da dataset.
        .range([dimensions.ctrHeight, 0]);

    ctr.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('~s')))

    //////////
    // BRUSHING AND CHART //
    //////////

    // Add a clipPath: everything out of this area won't be drawn.
    var clip = ctr.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", dimensions.ctrWidth)
        .attr("height", dimensions.ctrHeight)
        .attr("x", 0)
        .attr("y", 0);

    // Add brushing
    var brush = d3.brushX()                 // Add the brush feature using the d3.brush function
        .extent([[0, 0], [dimensions.ctrWidth, dimensions.ctrHeight]]) // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
        .on("end", updateChart) // Each time the brush selection changes, trigger the 'updateChart' function

    // Create the scatter variable: where both the circles and the brush take place
    var areaChart = ctr.append('g')
        .attr("clip-path", "url(#clip)")

    // Area generator
    var area = d3.area()
        .x(function (d) { return x(d.data.Anno); })
        .y0(function (d) { return y(d[0]); })
        .y1(function (d) { return y(d[1]); })

    // Show the areas
    areaChart
        .selectAll("mylayers")
        .data(stackedData)
        .enter()
        .append("path")
        .attr("class", function (d) { return "myArea " + d.key })
        .style("fill", function (d) { return color(d.key); })
        .attr("d", area)

    // Add the brushing
    areaChart
        .append("g")
        .attr("class", "brush")
        .call(brush);

    var idleTimeout
    function idled() { idleTimeout = null; }

    // A function that update the chart for given boundaries
    function updateChart() {

        extent = d3.event.selection

        // If no selection, back to initial coordinate. Otherwise, update X axis domain
        if (!extent) {
            if (!idleTimeout) return idleTimeout = setTimeout(idled, 350); // This allows to wait a little bit
            x.domain(d3.extent(data, function (d) { return d.Anno; }))
        } else {
            x.domain([x.invert(extent[0]), x.invert(extent[1])])
            areaChart.select(".brush").call(brush.move, null) // This remove the grey brush area as soon as the selection has been done
        }

        // Update axis and area position
        xAxis.transition().duration(1000).call(d3.axisBottom(x).ticks(5))
        areaChart
            .selectAll("path")
            .transition().duration(1000)
            .attr("d", area)
    }


}
draw()