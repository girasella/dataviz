async function draw() {
  // Data
  const dataset = await d3.csv('data.csv')

  const parseDate = d3.timeParse('%Y-%m-%d')  //ritorna una funzione capace di parsificare una stringa e ritornare un oggetto data
  //Dobbiamo fare la conversione da stringa a oggetto data perchè scaletime() si aspetta degli oggetti data.
  const xAccessor = d => parseDate(d.date)  //in questo modo l'accesso al dato ritornerà un oggetto data come previsto
  const yAccessor = d => parseInt(d.close)  //convertiamo in interi i dati letti dal csv.

  // Dimensions
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
  const tooltip = d3.select("#tooltip")
  
  //il punto che verrà visualizzato passando col mouse sulla linea.
  const tooltipDot = ctr.append('circle')
      .attr('r',5)
      .attr('fill', '#fc8781')
      .attr('stroke-width',2)
      .attr('stroke','black')
      .style('opacity',0)
      .style('pointer-events','none') //disattiviamo gli eventi sul punto

  // Scales
  const yScale = d3.scaleLinear()
    .domain(d3.extent(dataset, yAccessor))
    .range([dimensions.ctrHeight, 0])
    .nice()

  /*const xScale = d3.scaleTime()   //scaleTime lavora con date locali, cioè quelle del pc utente
      .domain(d3.extent(dataset, xAccessor)) //la extent funziona anche con le date: ritorna la data più vecchia e la più nuova.
      .range([0,dimensions.ctrWidth])
      console.log(xScale(xAccessor(dataset[0])),dataset[0])
    }*/
  const xScale = d3.scaleUtc() //a differenza di scaleTime, ScaleUtc lavora con date utc
    .domain(d3.extent(dataset, xAccessor)) //la extent funziona anche con le date: ritorna la data più vecchia e la più nuova.
    .range([0,dimensions.ctrWidth])    

//LINE GENERATION
  const lineGenerator = d3.line()     //crea una funzione che genera una linea, un path svg
    .x((d) => xScale(xAccessor(d)))   //in questo modo indico dove leggere le x dei punti della linea dall'array.
    .y((d) => yScale(yAccessor(d)))   //in questo modo indico dove leggere le y dei punti della linea dall'array.
    //console.log(lineGenerator(dataset)) //stampa tutto il path della linea
    ctr.append('path')  //il valore generato dal linegenerator è compativile solo con un svg path
      .datum(dataset)   //invece di usare data, usiamo datum perchè associamo un singolo dato al path.
      .attr('d',lineGenerator)  //la funzione lineGenerator verrà applicata al dataset creando la linea. L'attributo d del path svg descrive i punti del path.
      .attr('fill', 'none')     //in questo modo il contenuto del path non viene riempito, di default i path svg sono riempiti di nero.
      .attr('stroke','#30475e') //d'altronde se non diamo un colore allo stroke non vedremo la linea di contorno del path, quindi dobbiamo settarlo.
      .attr('stroke-width',2)   //cambiamo lo spessore della linea
      
//AXIS 
    const xAxis = d3.axisBottom(xScale)
      .ticks(8)
      .tickFormat(d3.timeFormat("%m/%d/%y"))  //formattiamo la data sui tick sull'asse orizzontale
    const xAxisGroup = ctr.append('g')
    .call(xAxis) 
    .style('transform',`translateY(${dimensions.ctrHeight}px)`)

    const yAxis = d3.axisLeft(yScale)
      .tickFormat((d) =>`$${d}`)  //aggiungiamo il simbolo dollaro al tick sull'asse verticale
    const yAxisGroup = ctr.append('g')
      .call(yAxis)
//Tooltip 
//Creiamo un rettangolo trasparente a cui associamo gli eventi sul movimento del mouse.
//Questo perchè mettere gli eventi solo sul passaggio sulla linea è problematico. 
    ctr.append('rect')
      .attr('width',dimensions.ctrWidth)
      .attr('height',dimensions.ctrHeight)
      .style('opacity', 0)   // questo rettangolo sarà trasparente
      .on('touchmouse mousemove', function(event){
        const mousePos= d3.pointer(event, this)  //d3.pointer ritorna le coordinate correnti del mouse. 
        //passando this d3.pointer calcola le coordinate del mouse in base al contenitore, non in assoluto.le coordinate sono relative al container.
        
        //dobbiamo ottenere la data a partire dalla coordinata x ottenuta leggendo la posizione del mouse nel container.
        const date = xScale.invert(mousePos[0])  //la invert è una funzione che fa l'inverso della scala, in questo modo gli passiamo la x del mouse
        //così otteniamo la data a partire dalla coordinata x.
        //per ottenere la data più vicina nell'array a quella ottenuta dal mouse, usiamo 
        //d3.bisect. La funzione però non confronta oggetti ma solo numeri, quindi dobbiamo creare una funzione apposita per prendere l'oggetto più vicino alla data che ci interessa

        //Custom Bisector - left, center, right sono le tre prorietà dell'oggetto ritornato da d3.bisector
        //left: indice più basso possibile 
        //center: indice di mezzo
        //right: indice più alto possibile
        const bisector = d3.bisector(xAccessor).left //la funzione bisector permette di creare una funzione bisect customizzata per prendere l'oggetto che ci interessa
        const index = bisector(dataset,date)   //adesso la funzione ritornerà l'indice dell'oggetto con data più vicina a quella passata come parametro. 
        const stock = dataset[index -1]         //il dato che ci interessa in realtà è all'index - 1. 

        //Mostra il pallino sulla linea, cambiandone l'opacità. Le sue coordinate sono le stesse del punto sulla linea. 
        tooltipDot.style('opacity',1)
          .attr('cx',xScale(xAccessor(stock)))
          .attr('cy',yScale(yAccessor(stock)))
          .raise()    //portiamo il punto in primo piano rispetto al resto. 

        //Rendiamo visibile il tooltip cambiandone il css. Le coordinate sono le stesse del punto ma 20 px più in alto. 
        tooltip.style('display','block')
          .style('top', yScale(yAccessor(stock)) - 20 + "px")
          .style('left', xScale(xAccessor(stock))+"px")

        //Scriviamo il valore del prezzo (coordinata y) nel tooltip 
        tooltip.select('.price')
          .text(`$${yAccessor(stock)}`)
        
        //Scriviamo la data (coordinata x) nel tooltip 
        const dateFormatter = d3.timeFormat('%B %-d, %Y')
        tooltip.select('.date')
          .text(`${dateFormatter(xAccessor(stock))}`)     
      }) 
      
      //Quando il mouse è uscito dal grafico, facciamo sparire sia il pallino sulla linea che il tooltip. 
      .on('mouseleave',function(event){
        tooltipDot.style('opacity', 0)

        tooltip.style('display','none')

      }) 

  }
draw()