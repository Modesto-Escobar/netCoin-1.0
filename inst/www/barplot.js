function barplot(json){

  var options = json.options,
      nodes = json.nodes,
      links = json.links;

  var words = nodes.map(function(node){ return node[options.label?options.label:options.name]; }),
      maxWord = d3.max(words.map(function(word){ return word.length; }));

  var vp = viewport(),
      margin = {top: 80, right: 40, bottom: 80, left: maxWord*options.cex*7},
      width = vp.width - 20 - margin.left - margin.right,
      height = vp.height - 55 - margin.top - margin.bottom;

  if(margin.left<160)
    margin.left = 160;

  var x = d3.scaleLinear()
      .range([0, width]);

  var y = d3.scaleBand()

  var xAxis = d3.axisBottom(x);

  var yAxis = d3.axisLeft(y);

  if(options.label)
    yAxis.tickFormat(function(d){ return nodes.filter(function(p){ return d==p[options.name]; })[0][options.label]; })
  else
    options.label = options.name;

  var main = "coincidences",
      textLegend = ["coincidences","incidences"];
  if(options.expected){
    main = "concoincidences";
    textLegend = ["coincidences","expected","expectedconfidence"];
  }

  var maxIncidence = d3.max(nodes, function(d){ return d[options.incidences]; }),
      maxExpected = options.expected ? d3.max(links,function(d){ return Math.max(d[options.coincidences],d[options.expected]); }) : 0,
      subject = nodes.filter(function(d){ return d[options.incidences]==maxIncidence; });

  subject = subject[0][options.name];

  var body = d3.select("body");

  if(options.cex)
    body.style("font-size", 10*options.cex + "px")
  else
    options.cex = 1;

  // top bar
  var topBar = body.append("div")
    .attr("class","topbar")

  iconButton(topBar,"pdf",pdfIcon_b64,"PDF export",svg2pdf);
  iconButton(topBar,"svg",svgIcon_b64,"SVG export",svgDownload);

  // multigraph
  if(typeof multiGraph != 'undefined'){
    topBar.append("h3").text(texts.netselection + ":")
    multiGraph.graphSelect(topBar);
  }

  // subjects
  topBar.append("h3").text(texts.subjectselect + ":")

  var eventSelect = topBar.append("select")
    .on("change",function(){
      subject = this.value;
      sigSlider();
      displayGraph();
    })
  eventSelect.selectAll("option")
        .data(nodes.map(function(d){
          return [d[options.name],d[options.label]];
        }).sort(function(a,b){
          return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : a[1] >= b[1] ? 0 : NaN;
        }))
      .enter().append("option")
        .property("value",function(d){ return d[0]; })
        .text(function(d){ return d[1]; })
        .property("selected",function(d){ return d[0]==subject?true:null; })

  // show barplot of incidences only (of all nodes)
  topBar.append("button")
    .text(texts.total)
    .on("click",function(){
      topBar.select(".topbar>.slider").remove();
      eventSelect.node().selectedIndex = -1;
      subject = null;
      displayGraph();
    })
  topBar.append("span").style("padding","0 10px")

  // node filter
  topFilter(topBar,nodes,options.name,displayGraph);

  sigSlider();

  if(options.note){
      body.append("p")
        .attr("class","note")
        .style("position","absolute")
        .style("left",margin.left+"px")
        .style("top",(margin.top+height+margin.bottom+10)+"px")
        .html(options.note)
  }

  // graph
  displayGraph();

  function sigSlider(){
    if(options.significance){
      var slider = topBar.select(".topbar>.slider");
      if(!slider.empty()){
        slider.remove();
      }
      var sliderWidth = 300;
      var values = [0,0.0001,0.001,0.01,0.05,0.10,0.20,0.50,1];
      var slider = topBar.append("div")
        .attr("class","slider")
        .style("position","relative")
        .style("top","0px")
        .style("float","right")
        .style("margin-right","10px");

      slider.append("input")
        .attr("type","range")
        .attr("min","0")
        .attr("max","8")
        .attr("value","8")
        .style("width",sliderWidth+"px")
        .on("change",function(){
          var value = +this.value;
          var names = links.filter(function(d){ return (d.Source==subject || d.Target==subject) && d[options.significance]<=values[value]; }).map(function(d){ return [d.Source,d.Target]; });
          names = d3.set(d3.merge(names)).values();
          displayGraph(names);
        })
      values.forEach(function(v,i){
        slider.append("span")
          .style("position","absolute")
          .style("top","12px")
          .style("left",-10+(i*(sliderWidth/8.3))+"px")
          .style("width",(sliderWidth/8.3)+"px")
          .style("text-align","center")
          .text(v);
      });
    }
  }

  function displayGraph(filter){
    //subject is global

    var data = [];
    if(subject){
      links.forEach(function(d){
        if(d.Source == subject || d.Target == subject){
          var row = {};
          row.object = (d.Source == subject ? d.Target : d.Source);
          if(!filter || filter.indexOf(row.object)!=-1){
            row.a = d[options.coincidences];
            if(options.expected){
              row.b = d[options.expected];
              if(options.confidence)
                row.c = d[options.confidence];
            }else{
              row.b = nodes.filter(function(p){ return row.object==p[options.name]; })[0][options.incidences];
            }
            if(options.text)
              row.t = nodes.filter(function(p){ return row.object==p[options.name]; })[0][options.text];
              if(options.significance)
                row.sig = d[options.significance];
            data.push(row);
          }
        }
      })
    }else{
      nodes.forEach(function(d){
        if(!filter || filter.indexOf(d[options.name])!=-1){
          var row = {};
          row.object = d[options.name];
          row.b = d[options.incidences];
          if(options.text)
            row.t = d[options.text];
          data.push(row);
        }
      })
    }

    data.sort(function(a,b){
      var ab = a.b?a.b:a.c?a.c:a.a,
          bb = b.b?b.b:b.c?b.c:b.a;
      return b.a < a.a ? -1 : b.a > a.a ? 1 : bb < ab ? -1 : bb > ab ? 1 : 0;
    });

    if(height/data.length < 13)
      height = data.length*13;

    if(subject && options.expected)
      x.domain([0,maxExpected]).nice()
    else
      x.domain([0,maxIncidence]).nice()

    y.range([0, height])
     .paddingInner(.3)
     .paddingOuter(.6)
     .domain(data.map(function(d){ return d.object; }));

    var bandwidth = y.bandwidth();

    body.select("svg.plot").remove();

    var svg = body.append("svg")
      .attr("class","plot")
      .attr("xmlns","http://www.w3.org/2000/svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)

    svg.append("style").text("text { font-family: sans-serif; font-size: "+body.style("font-size")+"; } "+
      ".main { font-size: 200%; }"+
      ".bar, .legend rect { stroke: #000; stroke-width: .4px; }"+
      "rect.a { fill: #677BB2; }"+
      "rect.b { fill: #87CDDE; }"+
      "rect.c { fill: #D7EEF4; }"+
      ".axis path, .axis line { fill: none; stroke: #000; shape-rendering: crispEdges; }"+
      ".y.axis path, .y.axis line { display: none; }"+
      ".line { stroke-dasharray: 2, 2; stroke: #333; }");

    svg.append("text")
        .attr("class","main")
        .attr("x",margin.left)
        .attr("y",margin.top/2)
        .text(subject?texts[main] + " " + texts.ofsomeone + " " + nodes.filter(function(p){ return subject==p[options.name]; })[0][options.label] + " " + texts.withsomeone + "...":texts.total)

    var legend = svg.append("g")
        .attr("class","legend")
        .attr("transform","translate("+(margin.left)+","+margin.top/1.1+")")

    legend.selectAll("text")
          .data(subject?textLegend:["incidences"])
        .enter().append("text")
          .text(function(d){ return texts[d]; })
          .attr("x",function(d,i){ return i*110*options.cex + 20; })

    legend.selectAll("rect")
          .data(subject?textLegend:["incidences"])
        .enter().append("rect")
          .attr("class",function(d){
            switch(d){
             case "coincidences":
               return "a";
             case "incidences":
             case "expected":
               return "b";
             case "expectedconfidence":
               return "c";
             default:
               return "d";
            }
          })
          .attr("width",16)
          .attr("height",8)
          .attr("y",-7)
          .attr("x",function(d,i){ return i*110*options.cex; })

    svg = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    data.forEach(function(d){
      var g = svg.append("g").datum(d);
      g.attr("transform","translate(0,"+y(d.object)+")");

      if(d.c < d.b){
          display_bar(g,"b");
          display_bar(g,"c");
      }else{
          display_bar(g,"c");
          display_bar(g,"b");
      }
      display_bar(g,"a");

      if(options.text){
        tooltip(g,"t");
      }
    })

    function display_bar(g,type){
      var d = g.datum();
      if(typeof d[type] == "undefined")
        return;
      var bar = g.append("rect")
        .attr("class","bar "+type)
        .attr("x", 0)
        .attr("width", 0)
        .attr("y", (type=="a")?bandwidth*0.2:0)
        .attr("height", bandwidth-((type=="a")?bandwidth*0.4:0));

      if(!options.text)
        bar.append("title")
          .text("(" + d.object + ", " + formatter(d[type]) + ")");

      if(options.significance && drawSig(d.sig) && type=="a")
        g.append("text")
          .attr("class","significance")
          .style("text-anchor","end")
          .style("fill","#fff")
          .style("font-size",(bandwidth)+"px")
          .attr("x",x(d[type])-4)
          .attr("y",bandwidth*1.08)
          .text(drawSig(d.sig))

      bar.transition().duration(1000)
        .attr("width", x(d[type]));
    }
  }

  function drawSig(d){
    if(d<=0.001)
      return "***";
    if(d<=0.01)
      return "**";
    if(d<=0.05)
      return "*";
    return "";
  }

  function svgDownload(){
    var svg = d3.select("svg.plot");
    var svgString = new XMLSerializer().serializeToString(svg.node());
    var blob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
    fileDownload(blob, d3.select("head>title").text()+'.svg');
  }

function svg2pdf(){

  var tWidth = width + margin.left + margin.right,
      tHeight = height + margin.top + margin.bottom;

  var doc = new jsPDF(tWidth>tHeight?"l":"p","pt",[tWidth, tHeight]);

  doc.setTextColor(0);
  doc.setDrawColor(0);
  doc.setLineWidth(1);

  d3.selectAll("svg>text").each(function(){
    var self = d3.select(this),
        x = margin.left,
        y = +self.attr("y"),
        txt = self.text(),
        fontsize = parseInt(self.style("font-size"));
    doc.setFontSize(fontsize);
    doc.text(x,y,txt);
  })

  doc.setFontSize(10);

  d3.selectAll(".legend").each(function(){
    var self = d3.select(this),
        coors = getTranslation(self.attr("transform"));
    self.selectAll("text").each(function(){
      var self = d3.select(this),
          x = +self.attr("x") + coors[0],
          txt = self.text();
      doc.text(x,coors[1],txt);
    })
    self.selectAll("rect").each(function(){
      var self = d3.select(this),
        x = +self.attr("x") + coors[0],
        y = coors[1] - 8,
        w = +self.attr("width"),
        h = +self.attr("height"),
        color = d3.rgb(self.style("fill"));
      doc.setFillColor(color.r,color.g,color.b);
      doc.rect(x, y, w, h, 'FD');
    })
  })

  d3.selectAll(".bar").each(function(){
    var self = d3.select(this),
        x = +self.attr("x") + margin.left,
        y = getTranslation(d3.select(this.parentNode).attr("transform"))[1] + (+self.attr("y")) + margin.top,
        w = +self.attr("width"),
        h = +self.attr("height"),
        color = d3.rgb(self.style("fill"));
    doc.setFillColor(color.r,color.g,color.b);
    doc.rect(x, y, w, h, 'FD');
  });

  d3.selectAll(".y.axis .tick text").each(function(){
    var self = d3.select(this),
        y = getTranslation(d3.select(this.parentNode).attr("transform"))[1] + margin.top,
        txt = self.text(),
        txtWidth = doc.getStringUnitWidth(txt) * 10,
        x = margin.left - txtWidth;
    doc.text(x-6, y+3, txt);
  });

  doc.line(margin.left,margin.top+height,margin.left+width,margin.top+height)

  d3.selectAll(".x.axis .tick text").each(function(){
    var self = d3.select(this),
        x = getTranslation(d3.select(this.parentNode).attr("transform"))[0] + margin.left,
        y = height + margin.top,
        txt = self.text();
    doc.line(x,y,x,y+6);
    doc.text(x-3, y+16, txt);
  });

  d3.selectAll("p.note").each(function(){
    var self = d3.select(this),
        x = margin.left,
        y = height + margin.top + margin.bottom/2,
        txt = self.text();
    doc.text(x, y, txt);
  })

  doc.setTextColor(255);
  d3.selectAll("text.significance").each(function(){
    var self = d3.select(this),
        y = getTranslation(d3.select(this.parentNode).attr("transform"))[1] + (+self.attr("y")) + margin.top,
        txt = self.text(),
        fontsize = parseInt(self.style("font-size")),
        txtWidth = doc.getStringUnitWidth(txt) * fontsize,
        x = margin.left + (+self.attr("x")) - txtWidth - 2;
    doc.setFontSize(fontsize);
    doc.text(x, y, txt);
  });

  doc.save(d3.select("head>title").text()+".pdf");
}

} // barplot function end

if(typeof multiGraph == 'undefined'){
  window.onload = function(){
    barplot(JSON.parse(d3.select("#data").text()));
  };
}
