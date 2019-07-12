function barplot(json){

  var options = json.options,
      nodes = json.nodes,
      links = json.links;

  var body = d3.select("body");

  if(options.cex)
    body.style("font-size", 10*options.cex + "px")
  else
    options.cex = 1;

  var wordSVG = d3.select("body").append("svg"),
      words = nodes.map(function(node){ return node[options.label?options.label:options.name]; }),
      maxWord = d3.max(words.map(function(word){
        var text = wordSVG.append("text")
          .style("font-family","sans-serif")
          .style("font-size", body.style("font-size"))
          .text(word);
        return text.node().getBoundingClientRect().width;
      }));
  wordSVG.remove();

  maxWord = maxWord + 20;

  if(maxWord<160)
    maxWord = 160;

  var vp = viewport(),
      margin = {top: 80, right: 40, bottom: 80, left: maxWord};

  var width = vp.width - 40 - margin.left - margin.right,
      height = vp.height - 40 - margin.top - margin.bottom;

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
    textLegend = ["coincidences","expected"];
    if(options.confidence)
      textLegend.push("confidence");
  }

  var maxIncidence = d3.max(nodes, function(d){ return d[options.incidences]; }),
      maxExpected = options.expected ? d3.max(links,function(d){
        var conf = [];
        if(options.confidence){
          if(Array.isArray(options.confidence))
            conf = options.confidence.map(function(e){ return d[e]; });
          else
            conf = [d[options.confidence]];
        }
        return d3.max(d3.merge([[d[options.coincidences],d[options.expected]],conf]));
      }) : 0,
      subject = nodes.filter(function(d){ return d[options.incidences]==maxIncidence; });

  subject = subject[0][options.name];

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
  var nodeslist = nodes.map(function(d){
          return [d[options.name],d[options.label]];
        }).sort(function(a,b){
          return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : a[1] >= b[1] ? 0 : NaN;
        });
  eventSelect.selectAll("option")
        .data(nodeslist)
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

  var topBarHeight = topBar.node().offsetHeight;

  height = height - topBarHeight;

  if(options.note){
    var pnote = body.append("p")
        .attr("class","note")
        .style("position","absolute")
        .style("left",margin.left+"px")
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
      var sliderWidth = 200;
      var values = [0,0.0001,0.001,0.01,0.05,0.10,0.20,0.50,1];

      var slider = topBar.append("div")
        .attr("class","slider")
        .style("float","right")
        .style("margin-right","10px");

      slider.append("span")
        .style("margin-right","5px")
        .text("p<");

      slider = slider.append("span")
        .style("position","relative");

      var bubble = slider.append("span")
        .attr("class","slider-text")
        .style("position","absolute")
        .style("top",(14*options.cex)+"px")
        .style("left",bubblePos(8))
        .text("1")

      slider.append("input")
        .attr("type","range")
        .attr("min","0")
        .attr("max","8")
        .attr("value","8")
        .style("width",sliderWidth+"px")
        .on("input",function(){
          var value = +this.value;
          bubble.style("left",bubblePos(value)).text(String(values[value]));
          var names = links.filter(function(d){ return (d.Source==subject || d.Target==subject) && d[options.significance]<=values[value]; }).map(function(d){ return [d.Source,d.Target]; });
          names = d3.set(d3.merge(names)).values();
          displayGraph(names);
        })

      function bubblePos(value){
        return (2+((value)*((sliderWidth-12)/8)))+"px";
      }
    }
  }

  function displayGraph(filter){
    //subject is global

    var data = [],
        whiskers = subject && options.confidence && !options.significance;

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
                if(whiskers)
                  row.c = [d[options.confidence[0]],d[options.confidence[1]]];
                else
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

    if(options.note)
      pnote.style("top",(topBarHeight+margin.top+height+margin.bottom)+"px")

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
      (whiskers ? "" : ".bar, .legend path { stroke: #000; stroke-width: .4px; }") +
      ".a { fill: #677BB2; }"+
      ".b { fill: #87CDDE; }"+
      ".c { fill: #D7EEF4; }" +
      (whiskers ? ".c, " : "") + ".axis path, .axis line { fill: none; stroke: #000; shape-rendering: crispEdges; }"+
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

    legend.selectAll("path")
          .data(subject?textLegend:["incidences"])
        .enter().append("path")
          .attr("class",function(d){
            switch(d){
             case "coincidences":
               return "a";
             case "incidences":
             case "expected":
               return "b";
             case "confidence":
               return "c";
            }
          })
          .attr("d",function(d,i){
            var x = i*110*options.cex,
                y = -7,
                width = 16,
                height = 8;

            if(whiskers){
              if(d=="coincidences"){
                var r = height/2;
                return "M "+(x+width/2)+", "+(y+r)+" m -"+r+", 0 a "+r+","+r+" 0 1,0 "+(r*2)+",0 a "+r+","+r+" 0 1,0 -"+(r*2)+",0";
              }
              if(d=="expected")
                return "M"+(x+((width-height)/2))+","+y+"h"+height+"v"+height+"h"+(-height)+"Z";
              if(d=="confidence")
                return "M"+x+","+y+"v"+height+"v"+(-height/2)+"h"+width+"v"+(height/2)+"v"+(-height);
            }else
              return "M"+x+","+y+"h"+width+"v"+height+"h"+(-width)+"Z";
          })

    var g = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    data.forEach(function(d){
      var gBar = g.append("g").datum(d);
      gBar.attr("transform","translate(0,"+y(d.object)+")");

      if(whiskers){
        display_square(gBar);
        display_whiskers(gBar);
        display_circle(gBar);
      }else{
        if(d.c < d.b){
          display_bar(gBar,"b");
          display_bar(gBar,"c");
        }else{
          display_bar(gBar,"c");
          display_bar(gBar,"b");
        }
        display_bar(gBar,"a");
      }

      if(options.text){
        tooltip(gBar,"t");
      }
    })

    g.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    g.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .selectAll(".tick > text").on("dblclick",function(d){
        subject = d;
        sigSlider();
        displayGraph();
        eventSelect.node().selectedIndex = nodeslist.map(function(d){ return d[1]; }).indexOf(subject);
      })

    function display_bar(g,type){
      var d = g.datum(),
          value = d[type];
      if(typeof value == "undefined")
        return;
      var bar = g.append("rect")
        .attr("class","bar "+type)
        .attr("x", 0)
        .attr("width", 0)
        .attr("y", (type=="a")?bandwidth*0.2:0)
        .attr("height", bandwidth-((type=="a")?bandwidth*0.4:0));

      if(!options.text)
        bar.append("title")
          .text("(" + d.object + ", " + formatter(value) + ")");

      if(options.significance && drawSig(d.sig) && type=="a")
        g.append("text")
          .attr("class","significance")
          .style("text-anchor","end")
          .style("fill","#fff")
          .style("font-size",(bandwidth)+"px")
          .attr("x",x(value)-4)
          .attr("y",bandwidth*1.08)
          .text(drawSig(d.sig))

      bar.transition().duration(1000)
        .attr("width", x(value));
    }

    function display_circle(g){
      var d = g.datum();
      var circle = g.append("circle")
        .attr("class","a")
        .attr("cx", 0)
        .attr("cy", bandwidth/2)
        .attr("r", bandwidth/2);

      if(!options.text)
        circle.append("title")
          .text("(" + d.object + ", " + formatter(d.a) + ")");

      circle.transition().duration(1000)
        .attr("cx", x(d.a));
    }

    function display_square(g){
      var d = g.datum();
      var square = g.append("rect")
        .attr("class","b")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", bandwidth)
        .attr("height", bandwidth);

      if(!options.text)
        square.append("title")
          .text("(" + d.object + ", " + formatter(d.b) + ")");

      square.transition().duration(1000)
        .attr("x", x(d.b)-(bandwidth/2));
    }

    function display_whiskers(g){
      var d = g.datum();
      var whiskers = g.append("path")
        .attr("class","c")
        .attr("d",function(){
          var x1 = x(d.c[0]),
              x2 = x(d.c[1]);
          return "M"+x1+",0v"+bandwidth+"v"+(-bandwidth/2)+"h"+(x2-x1)+"v"+(-bandwidth/2)+"v"+bandwidth;
        })
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
    self.selectAll("path").each(function(){
      var self = d3.select(this),
          y = coors[1],
          d = self.attr("d"),
          x = coors[0],
          color = d3.rgb(self.style("fill")),
          stroke = self.style("stroke")!="none",
          circle = d.indexOf("a")!=-1,
          closed = d.indexOf("Z")!=-1;

      d = d.replace(/M|Z/g,"").split(/[hvam]/);

      var M = d[0].split(",").map(function(e){ return +e; });
      x = x+M[0];
      y = y+M[1];

      if(!isNaN(color.opacity))
        doc.setFillColor(color.r,color.g,color.b);
      if(circle){
        doc.circle(x, y, +d[2].split(",")[0], 'F');
      }else if(closed){
        doc.rect(x, y, +d[1], +d[2], stroke?'FD':'F');
      }else{
        var h = +d[1],
            w = +d[3];
        doc.line(x, y + (h/2), x + w, y + (h/2), 'S');
        doc.line(x, y, x, y + h, 'S');
        doc.line(x + w, y, x + w, y + h, 'S');
      }
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

  d3.selectAll("svg.plot>g:last-child rect.b:not(.bar)").each(function(){
    var self = d3.select(this),
        x = +self.attr("x") + margin.left,
        y = getTranslation(d3.select(this.parentNode).attr("transform"))[1] + (+self.attr("y")) + margin.top,
        w = +self.attr("width"),
        h = +self.attr("height"),
        color = d3.rgb(self.style("fill"));
    doc.setFillColor(color.r,color.g,color.b);
    doc.rect(x, y, w, h, 'F');
  });

  d3.selectAll("svg.plot>g:last-child path.c").each(function(){
    var self = d3.select(this),
        y = getTranslation(d3.select(this.parentNode).attr("transform"))[1] + margin.top,
        d = self.attr("d").substr(1).split(/[hv]/),
        x = margin.left + (+d[0].split(",")[0]);
    
    doc.line(x, y+(+d[1]/2), x + (+d[3]), y+(+d[1]/2), 'S');
    doc.line(x, y, x, y+(+d[1]), 'S');
    doc.line(x + (+d[3]), y, x + (+d[3]), y+(+d[1]), 'S');
  });

  d3.selectAll("svg.plot>g:last-child circle.a").each(function(){
    var self = d3.select(this),
        x = +self.attr("cx") + margin.left,
        y = getTranslation(d3.select(this.parentNode).attr("transform"))[1] + (+self.attr("cy")) + margin.top,
        r = +self.attr("r"),
        color = d3.rgb(self.style("fill"));
    doc.setFillColor(color.r,color.g,color.b);
    doc.circle(x, y, r, 'F');
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
