function network(Graph){

  var docSize = viewport(),
      width = docSize.width,
      height = docSize.height,
      images = false,
      images64 = false,
      egoNet = false,
      transform = d3.zoomIdentity,
      backupNodes = false,
      frameControls = false,
      Sliders = {},
      Legends = {},
      Controllers = {},
      GraphNodesLength = 0,
      GraphLinksLength = 0,
      options = Graph.options;

  delete Graph.options;

  var defaultColor = categoryColors[0], // nodes and areas default color
      defaultLinkColor = "#999", // links default color
      defaultShape = "Circle", // node shape by default
      symbolTypes = ["Circle","Square","Diamond","Triangle","Cross","Star","Wye"], // list of available shapes
      nodeSizeRange = [0.5,4], // node size range
      nodeLabelSizeRange = [8,20], // node label size range
      linkWeightRange = [200,40], // link weight range (link distance)
      linkWidthRange = [1,5], // link width range
      zoomRange = [0.1, 10], // zoom range
      chargeRange = [0,-1000], // charge range
      linkDistanceRange = [0,500], // link distance range
      timeRange = [5000,500], // speed range for dynamic net
      axisExtension = 50, // pixels to increase the axes size
      sliderWidth = 100, // width of the sliders
      sidebarOffset = options.help ? 240 : 220, // initial sidebar width (will increase with cex)
      infoLeft = 0, // global variable for panel left position
      findNodeRadius = 20, // radius in which to find a node in the canvas
      legendControls = true, // display legend checkboxes and buttons
      hiddenFields = ["Source","Target","x","y","source","target","fx","fy","hidden","childNodes","parentNode","_frame_"]; // not to show in sidebar controllers or tables

  var simulation = d3.forceSimulation()
      .force("link", d3.forceLink())
      .force("charge", d3.forceManyBody())
      .on("end", forceEnd)
      .stop();

  var scaleCoorX,
      scaleCoorY;

  var body = d3.select("body");

  body.on("keydown.shortcut",function(){
    if(d3.event.ctrlKey) d3.event.preventDefault();
  });

  // get primary color for user interface;
  var a = body.append("a"),
      UIcolor = a.style("color"),
      disUIcolor = applyOpacity(d3.rgb(UIcolor),0.4);
  a.remove();

  var zoom = d3.zoom()
    .scaleExtent(zoomRange)
    .on("end",function(){
      d3.select(this).style("cursor","grab");
    }) 
    .on("zoom", function() {
      transform = d3.event.transform;
      options.zoomScale = transform.k;
      Sliders.zoom.update(options.zoomScale).brushedValue(true);
    })

  checkGraphData();

  // main title
  if(options.main){
    body.append("div")
      .attr("class", "main")
      .html(typeof options.main == "string" ? options.main : options.main[0]);
  }

  // panel
  var panel = body.append("div")
      .attr("class", "panel");

  if(options.main)
    panel.style("top",(body.select("div.main").node().offsetHeight+8) + "px")

  var plot = panel.append("div")
      .attr("class", "plot")
      .style("position","relative")

  body.on("keyup.shortcut",function(){
    var key = getKey(d3.event);
    if(key == "Enter"){
      if(selectedNodesLength()) switchEgoNet();
      return;
    }
    if(d3.event.ctrlKey){
      switch(key){
        case "+":
          if(d3.event.shiftKey){
            Sliders.repulsion.update(options['charge']+(chargeRange[1]/100));
          }else{
            plot.select(".zoombutton.zoomin").dispatch("click");
          }
          return;
        case "-":
          if(d3.event.shiftKey){
            Sliders.repulsion.update(options['charge']-(chargeRange[1]/100));
          }else{
            plot.select(".zoombutton.zoomout").dispatch("click");
          }
          return;
        case "0":
          plot.select(".zoombutton.zoomreset").dispatch("click");
          return;
        case "1":
          body.select("div.search > button.burger-box").dispatch("click");
          return;
        case "2":
          plot.select(".showhideArrow.showButtons2").dispatch("click");
          return;
        case "3":
          plot.select(".showhideArrow.showTables").dispatch("click");
          return;
        case "4":
          plot.select(".showhideArrow.showButtons").dispatch("click");
          return;
        case "5":
          if(typeof options.showExport != "undefined"){
            options.showExport = !options.showExport;
            displayBottomPanel();
          }
          return;
        case "a":
          plot.select(".button.showArrows > rect").dispatch("click");
          return;
        case "b":
          if(selectedNodesLength()) addNeighbors();
          return;
        case "c":
          resetPan();
          return;
        case "d":
          plot.select(".button.dynamicNodes > rect").dispatch("click");
          return;
        case "e":
          if(selectedNodesLength()) switchEgoNet();
          return;
        case "f":
          if(selectedNodesLength()) filterSelection();
          return;
        case "g":
          plot.select(".button.heatmapTriangle > rect").dispatch("click");
          return;
        case "h":
          if(options.help){
            displayInfoPanel(options.help);
          }
          return;
        case "i":
          applyInitialFilter();
          return;
        case "l":
          plot.select(".button.showLegend > rect").dispatch("click");
          return;
        case "m":
          plot.select(".button.heatmap > rect").dispatch("click");
          return;
        case "n": // warning: new window
          return;
        case "o":
          if(selectedNodesLength()) selectNodesFromTable();
          return;
        case "p":
          treeAction();
          return;
        case "r":
          showHidden();
          return;
        case "s":
          selectAllNodes();
          return;
        case "t": // warning: new tab
          return;
        case "x":
          plot.select(".button.showAxes > rect").dispatch("click");
          return;
        case "ArrowUp":
        case "ArrowLeft":
        case "ArrowDown":
        case "ArrowRight":
          movePan(key);
          return;
      }
    }
  })

  if(options.note){
    var divNote = plot.append("div")
      .attr("class", "note")
      .html(typeof options.note == "string" ? options.note : "");
  }

  plot.style("width",computeWidth()+"px")

  adaptLayout();

  displayArrows();
  displayBottomPanel();
  displaySidebar();
  applyInitialFilter();

  if(options.helpOn){
    displayInfoPanel(options.help);
  }

  function selectedNodesLength(){
    return Graph.nodes.filter(function(d){ return d.selected; }).length;
  }

  function checkGraphData(){

    simulation.force("link").id(function(d) { return d[options.nodeName]; });

    if(options.background){
      var s = new Option().style;
      s.background = options.background;
      if(s.background != ""){
        body.style("background",s.background);
        s.color = options.background;
        if(s.color!="")
          options.background = s.color;
        else
          delete options.background;
      }else
        delete options.background;
    }

    if(options.frames){
      if(options.frames.length>1 && Graph.linknames.indexOf("_frame_")!=-1){

        var speed = 50;
        if(options.hasOwnProperty("speed"))
          speed = options.speed;
        speed = speed/100 * (timeRange[1]-timeRange[0]) + timeRange[0];

        var frame = 0;
        if(options.frame && options.frame<options.frames.length)
          frame = options.frame;

        frameControls = {
          "play": true,
          "frame": frame,
          "frames": options.frames,
          "frameInterval": null,
          "time": speed,
          "loop": false
        };

        ["zoom","repulsion","distance"].forEach(function(d){
          if(options.hasOwnProperty(d) && Array.isArray(options[d])){
            frameControls[d] = options[d];
            options[d] = options[d][0];
          }
        });
      }
      delete options.frames;
    }

    var nodes = [],
        len = 0;

    len = Graph.nodes[0].length;
    for(var i = 0; i<len; i++){
      var node = {};
      Graph.nodenames.forEach(function(d,j){
        node[d] = Graph.nodes[j][i];
      })
      node.degree = 0;
      splitMultiVariable(node);
      node[options.nodeName] = String(node[options.nodeName]);
      nodes.push(node);
    }
    Graph.nodenames.push("degree");

    Graph.nodes = nodes;

    if(frameControls){
      Graph.nodes.forEach(function(node){
        if(node.hasOwnProperty("fx") && !Array.isArray(node.fx))
          node.fx = frameControls.frames.map(function(){ return node.fx; });
        if(node.hasOwnProperty("fy") && !Array.isArray(node.fy))
          node.fy = frameControls.frames.map(function(){ return node.fy; });
      })
      backupNodes = JSON.parse(JSON.stringify(Graph.nodes));
    }

    if(Graph.links){
      var links = [];

      len = Graph.links[0].length;
      for(var i = 0; i<len; i++){
        var link = {};
        Graph.linknames.forEach(function(d,j){
          link[d] = Graph.links[j][i];
        })
        splitMultiVariable(link);
        link.source = Graph.nodes[link.Source];
        link.Source = link.source[options.nodeName];
        link.target = Graph.nodes[link.Target];
        link.Target = link.target[options.nodeName];
        links.push(link);
      }

      Graph.links = links;
    }else{
      Graph.links = [];
      Graph.linknames = [];
    }

    GraphNodesLength = Graph.nodes.length;
    GraphLinksLength = Graph.links.length;

    loadTree();

    ["nodeText","nodeInfo"].forEach(function(d){
      if(options[d] && options[d]!=options.nodeName)
        hiddenFields.push(options[d]);
    });

    if(options.defaultColor)
      defaultColor = options.defaultColor;

    options.colorScalenodeColor = "RdWhGn"; // default linear scale for nodes
    options.colorScalelinkColor = "RdBkGn"; // default linear scale for links

    if(options.nodeBipolar){
      switch(defaultColor) {
        case "black":
        case "#000":
        case "#000000":
          options.colorScalenodeColor = "RdWhBk";
          break;
        case "#2ca02c":
          options.colorScalenodeColor = "RdWhGn";
          break;
        default:
          colorScales['custom1'] = ["#d62728","#ffffff",defaultColor];
          colorScales['custom2'] = [defaultColor,"#ffffff","#d62728"];
          options.colorScalenodeColor = "custom1";
      }
    }else{
      switch(defaultColor) {
        case "black":
        case "#000":
        case "#000000":
          options.colorScalenodeColor = "WhBk";
          break;
        case "#1f77b4":
          options.colorScalenodeColor = "WhBu";
          break;
        case "#2ca02c":
          options.colorScalenodeColor = "WhGn";
          break;
        case "#d62728":
          options.colorScalenodeColor = "WhRd";
          break;
        default:
          var custom = d3.scaleLinear()
            .domain([0,2])
            .range(["#ffffff",defaultColor])
          colorScales['custom1'] = [defaultColor,custom(1),"#ffffff"];
          colorScales['custom2'] = ["#ffffff",custom(1),defaultColor];
          options.colorScalenodeColor = "custom2";
      }
    }

    if(options.cex){
      body.style("font-size", 10*options.cex + "px")
      sidebarOffset = sidebarOffset * Math.sqrt(options.cex);
    }else{
      options.cex = 1;
    }

    if(!options.hasOwnProperty("zoom"))
      options.zoom = 1;

    if(!options.hasOwnProperty("repulsion"))
      options.repulsion = 25;

    if(!options.hasOwnProperty("distance"))
      options.distance = 10;

    if(options.imageNames){
      if(!Array.isArray(options.imageNames))
        options.imageNames = [options.imageNames];
    }else
      options.imageNames = [];
    if(options.imageItems){
      if(!Array.isArray(options.imageItems))
        options.imageItems = [options.imageItems];
      options.nodeShape = options.imageNames[0];
      images = {};
      Graph.nodes.forEach(function(node){
        options.imageItems.forEach(function(col){
          var img = new Image();
          img.src = node[col];
          images[node[col]] = img;
        })
      })
    }else
      options.imageItems = [];

    options.imageItems.forEach(function(d){
      hiddenFields.push(d);
    })

    options.showSidebar = showControls(1);
    options.showButtons2 = showControls(2);
    options.showTables = showControls(3);
    options.showButtons = showControls(4);
    options.showExport = showControls(5);

    if(Array.isArray(options.axesLabels)){
      if(options.axesLabels.length>4)
        options.axesLabels.length = 4;
    }else{
      if(options.axesLabels)
        options.axesLabels = [options.axesLabels];
      else
        options.axesLabels = [];
    }

    options.heatmap = false;
    options.heatmapTriangle = false;
    if(options.mode && (options.mode=="h" || options.mode[0]=="h")){
      options.heatmap = true;
    }

    function splitMultiVariable(d){
      for(var p in d) {
        if(p!=options.nodeName){
          if(typeof d[p] == "string" && d[p].indexOf("|")!=-1){
            var aux = d[p].split("|");
            if(!frameControls || aux.length==frameControls.frames.length){
              d[p] = aux.map(function(d){ return d=="" ? null : (isNaN(parseInt(d)) ? d : +d); });
            }
          }
        }
      }
    }

    function showControls(n){
      if(options.hasOwnProperty("controls")){
        if(options.controls===0)
          return undefined;
        if(options.controls==-n)
          return undefined;
        if(options.controls==n)
          return true;
        if(Array.isArray(options.controls)){
          if(options.controls.indexOf(-n)!=-1)
            return undefined;
          if(options.controls.indexOf(n)!=-1)
            return true;
        }
      }
      return false;
    }
  } // end of checkGraphData

  function loadFrameData(frame){
    for(var i=0; i<Graph.nodes.length; i++){
      Graph.nodenames.forEach(function(col){
        if(Array.isArray(backupNodes[i][col]))
          Graph.nodes[i][col] = backupNodes[i][col][frame];
      })
    }
    loadTree(frameControls.frame);
  }

  function loadTree(frame){
      if(!Graph.tree)
        return;
      if(frameControls && frame===undefined)
        return;

      Graph.nodes.forEach(function(node){
        node.childNodes = [];
        node.parentNode = false;
      })
      var len = Graph.tree[0].length;
      for(var i = 0; i<len; i++){
        if(frame===undefined || frame==Graph.tree[2][i]){
          var source = Graph.tree[0][i],
              target = Graph.tree[1][i];
          Graph.nodes[source].childNodes.push(Graph.nodes[target]);
          Graph.nodes[target].parentNode = Graph.nodes[source];
        }
      }
  }

function displayArrows(){

  var buttonsArrow = visArrow()
    .item("showButtons")
    .top("10px")
    .left("0px")
    .title(texts.showhidebuttons)
    .callback(function(){ plot.call(drawSVG); })

  panel.call(buttonsArrow);

  var tablesArrow = visArrow()
    .item("showTables")
    .vertical(true)
    .bottom("5px")
    .left("0px")
    .title(texts.showhidetables)
    .callback(displayBottomPanel)

  panel.call(tablesArrow);

  var buttons2Arrow = visArrow()
    .item("showButtons2")
    .vertical(true)
    .bottom("5px")
    .left("24px")
    .title(texts.showhidebuttons)
    .callback(displayBottomPanel)

  panel.call(buttons2Arrow);
}

function displayBottomPanel(){

  panel.select("div.panel-dragbar").remove();
  panel.select("div.tables").remove();

  height = computeHeight();
  plot.style("height",height+"px");

  if(!plot.selectAll("svg, canvas").empty())
    plot.call(drawSVG);

  if(options.showButtons2 || options.showTables){

    // panel dragbar
    var dragbar = panel.append("div")
      .attr("class","panel-dragbar")

    var dragOffset;

    dragbar.call(d3.drag()
      .on("start", function() {
        body.style("cursor","row-resize");
        plot.select("canvas").remove();
        plot.select("svg").remove();
        dragOffset = d3.mouse(body.node())[1]-height;
      })
      .on("drag", function() {
        var value = d3.mouse(body.node())[1];
        if(value > 200){
          height = value-dragOffset;
          plot.style("height",height+"px");
        }
      })
      .on("end", function() {
        body.style("cursor",null);
        plot.call(drawSVG);
      })
    );

    // tables
    var tables = panel.append("div")
      .attr("class", "tables")

  if(options.showTables){
    var tablesoffset = 18+12*options.cex*1.2;
    dragbar.style("margin-bottom",tablesoffset+"px");
    tables.style("min-height","150px");
    tables.style("margin-top",-tablesoffset+"px")
    tables.append("div")
      .attr("class","switchNodeLink")
      .selectAll("div")
        .data(["nodes","links"])
        .enter().append("div")
          .style("top","-"+ tablesoffset +"px")
          .on("click",function(d){
              tables.selectAll("div.switchNodeLink > div")
                .style("background",null)
                .style("border-bottom-color",null)
              d3.select(this)
                .style("background","#f5f5f5")
                .style("border-bottom-color","#f5f5f5")
              tables.selectAll("div.nodes,div.links").style("display","none")
              tables.select("div."+d).style("display",null)
          })
          .append("h3")
            .text(function(d){ return texts[d]; })
    tables.select("div.switchNodeLink > div")
      .style("background","#f5f5f5")
      .style("border-bottom-color","#f5f5f5")
  }

  if(options.showExport){

    if(options.showTables){
      tables.call(iconButton()
        .alt("xlsx")
        .src(b64Icons.xlsx)
        .title(texts.downloadtable)
        .job(tables2xlsx));
    }

    tables.call(iconButton()
        .alt("pdf")
        .src(b64Icons.pdf)
        .title(texts.pdfexport)
        .job(function(){ embedImages(svg2pdf); }));

    tables.call(iconButton()
      .alt("png")
      .src(b64Icons.png)
      .title(texts.pngexport)
      .job(function(){
        if(options.heatmap){
          svg2png(getFile);
        }else{
          plot.select("canvas").node().toBlob(getFile)
        }

        function getFile(blob){
          fileDownload(blob, d3.select("head>title").text()+'.png');
        }
      }));

/*
    if(inIframe()){
      tables.call(iconButton()
        .alt("png")
        .src(b64Icons.newtab)
        .title(texts.newtab)
        .job(function(){
          window.open(window.location);
        }));
    }
*/
  }

  if(frameControls){
    var divFrameCtrl = tables.append("div")
      .attr("class", "divFrameCtrl")

    var buttonBackColor = "#888";

    divFrameCtrl.append("select")
      .attr("class","selectFrame")
      .on("change",function(){
        frameControls.play = false;
        clickThis();
        handleFrames(+(this.value));
      })
      .selectAll("option")
        .data(frameControls.frames)
      .enter().append("option")
        .property("value",function(d,i){ return i; })
        .text(function(d,i){
          if(Array.isArray(options.main))
            return options.main[i];
          else
            return d;
        })

    divFrameCtrl.append("button") // prev
      .call(getSVG().d(d4paths.prev))
      .on("click",function(){
        var val = frameControls.frame-1;
        if(val < 0)
          val = frameControls.frames.length+val;
        frameControls.play = false;
        clickThis();
        handleFrames(val);
      })
    divFrameCtrl.append("button") // loop
      .call(getSVG().d(d4paths.loop))
      .on("click",function(){
        frameControls.loop = !frameControls.loop;
        d3.select(this).style("background-color",frameControls.loop?buttonBackColor:null)
          .selectAll("path").style("fill",frameControls.loop?"#f5f5f5":null);
      })
    var stopRecord = function(){
          frameControls.recorder.stop();
          frameControls.recorder.save(Math.round((new Date()).getTime() / 1000)+'record.webm');
          delete frameControls.recorder;
          divFrameCtrl.select("button.rec").style("background-color",null)
            .select("path").style("fill",null);
    }
    divFrameCtrl.append("button") // rec
      .attr("class","rec")
      .call(getSVG().d(d4paths.rec))
      .on("click",function(){
        if(options.heatmap){
          displayWindow(texts.alertrecordheatmap);
        }else{
          if(frameControls.recorder){
            stopRecord();
          }else{
            frameControls.recorder = new CanvasRecorder(d3.select("div.plot > canvas").node());
            simulation.restart();
            if(frameControls.recorder.start && frameControls.recorder.start()){
              d3.select(this).style("background-color",buttonBackColor)
                .select("path").style("fill","Red");
            }else{
              delete frameControls.recorder;
            }
          }
        }
      }).style("background-color", frameControls.recorder ? buttonBackColor : null)
      .select("path").style("fill", frameControls.recorder ? "#d62728" : null);
    divFrameCtrl.append("button") // stop
      .call(getSVG().d(d4paths.stop))
      .on("click",function(){
        frameControls.play = false;
        clickThis();
        handleFrames(0);
        if(frameControls.recorder){
          stopRecord();
        }
      })
    divFrameCtrl.append("button") // pause
      .attr("class","pause")
      .call(getSVG().d(d4paths.pause))
      .on("click",function(){
        frameControls.play = false;
        clickThis();
        clearInterval(frameControls.frameInterval);
      })
    divFrameCtrl.append("button") // play
      .attr("class","play")
      .call(getSVG().d(d4paths.play))
      .on("click",function(){
        frameControls.play = true;
        clickThis(true);
        handleFrames(frameControls.frame+1);
      })
    divFrameCtrl.append("button") // next
      .call(getSVG().d(d4paths.next))
      .on("click",function(){
        frameControls.play = false;
        clickThis();
        handleFrames(frameControls.frame+1);
      })

    clickThis(frameControls.play);

    function clickThis(play){
      divFrameCtrl.selectAll("button.pause, button.play")
        .style("background-color",null)
        .selectAll("path").style("fill",null);
      if(play)
        divFrameCtrl.select("button.play")
          .style("background-color",buttonBackColor)
          .selectAll("path").style("fill","LawnGreen");
      else
        divFrameCtrl.select("button.pause")
          .style("background-color",buttonBackColor)
          .selectAll("path").style("fill","#f5f5f5");
    }
  }

  if(options.showButtons2){
    var buttonsSelect = tables.append("div")
          .attr("class","selectButton")

    buttonsSelect.append("span").text(texts.select+": ");
    buttonsSelect.append("input")
      .attr("type", "text")
      .attr("placeholder",texts.search)
      .on("keyup",function(){
        var txt = d3.select(this).property("value");
        if(txt.length>1){
          txt = new RegExp(txt,'i');
          Graph.nodes.forEach(function(node){
            node.selected = false;
            if(checkSelectable(node)){
              var i = 0;
              while(!node.selected && i<Graph.nodenames.length){
                if(String(node[Graph.nodenames[i++]]).match(txt))
                  node.selected = true;
              }
            }
          });
          showTables();
        }
      })
    buttonsSelect.append("span").text(" ");

    var selectButton = function(id,clk,tooltip,enable){
          buttonsSelect.append("button")
            .attr("id",id)
            .attr("class",enable?"":"disabled")
            .text(texts[id])
            .on("click",clk)
            .attr("title",tooltip)
        }

    selectButton("selectall",selectAllNodes,"ctrl + s",true);
    selectButton("tableselection",selectNodesFromTable,"ctrl + o");
    selectButton("selectneighbors",addNeighbors,"ctrl + b");
    selectButton("isolateselection",filterSelection,"ctrl + f");
    selectButton("egonet",switchEgoNet,"ctrl + e");
    if(Graph.tree)
      selectButton("expandcollapse",treeAction,"ctrl + p",true);
    selectButton("resetfilter",showHidden,"ctrl + r",(simulation.nodes().length!=GraphNodesLength) || (simulation.force("link").links().length!=GraphLinksLength));
  }

    if(options.showTables){
      if(options.scenarios)
        tables.append("h3").text(texts.scenarios + ": " + options.scenarios);
      tables.append("div").attr("class","nodes");
      tables.append("div").attr("class","links").style("display","none");
      showTables();
    }
  }
}

function displaySidebar(){
  var sidebar = body.select("div.sidebar"),
      dragbar = body.select("body>div.dragbar");

  if(sidebar.empty()){

    sidebar = body.append("div")
      .attr("class", "sidebar")
      .style("width", (sidebarOffset-15) + "px")

    var subFixed = sidebar.append("div").attr("class","fixed");

    if(typeof multiGraph != 'undefined'){
      var multiSel = subFixed.append("div")
        .attr("class","multigraph");
      multiSel.append("div").append("h3").text(texts.netselection+":");
      multiGraph.graphSelect(multiSel.append("div"));
    }

    var searchSel = subFixed.append("div")
      .attr("class","search");
    searchSel.append("button")
      .attr("class","burger-box")
      .style("display", typeof options.showSidebar=="undefined" ? "none" : null)
      .call(getSVG()
        .d(d4paths.burger)
        .width(20).height(20))
      .on("click",typeof options.showSidebar=="undefined" ? null : function(){
          options.showSidebar = !options.showSidebar;
          displaySidebar();
        })

    var searchBox = searchSel.append("div")
      .attr("class","search-box")
    searchBox.append("div")
      .append("input")
        .attr("type","text")
        .attr("placeholder",texts.search)
        .on("focus",function(){
          searchBox.classed("shadowed",true);
        })
        .on("blur",function(){
          searchBox.classed("shadowed",false);
        })
        .on("keydown",function(){
          var key = getKey(d3.event);
          if(key == "Tab" && !dropdownList.selectAll("li").empty()){
            dropdownList.select("li.active").dispatch("click");
          }
        })
        .on("keyup",function(){
          var key = getKey(d3.event);
          if(key == "Enter" && !dropdownList.selectAll("li").empty()){
            dropdownList.select("li.active").dispatch("click");
            d3.event.stopPropagation();
            return;
          }
          if(key == "ArrowUp" || key == "ArrowDown"){
            var li = dropdownList.selectAll('li');
            if(li.size() > 1){
              var current = 0;
              li.each(function(d,i){
                if(d3.select(this).classed("active"))
                  current = i;
              });
              li.classed("active",false);
              if(key == "ArrowUp") current--;
              if(key == "ArrowDown") current++;
              if(current<0) current = li.size()-1;
              if(current>=li.size()) current = 0;
             li.filter(function (d, i) { return i === current; }).classed("active",true);
            }
            return;
          }

          var searchBox = this,
              column = options.nodeLabel ? options.nodeLabel : options.nodeName;
          dropdownList.selectAll("*").remove();
          if(searchBox.value.length>1){
            simulation.nodes().forEach(function(node){
              if(String(node[column]).toLowerCase().search(searchBox.value.toLowerCase())!=-1){
                dropdownList
                  .append("li")
                  .text(node[column])
                  .on("click",function(){
                    searchBox.value = "";
                    searchIcon.classed("disabled",true);
                    dropdownList.style("display","none").selectAll("*").remove();
                    Graph.nodes.forEach(function(node){
                      delete node.selected;
                    })
                    node.selected = true;
                    if(options.nodeInfo){
                      displayInfoPanel(node[options.nodeInfo]);
                    }
                    showTables();
                  });
              }
            })
          }
          dropdownList.select("li").classed("active","true");
          dropdownList.style("display",dropdownList.selectAll("li").empty()?"none":"block");
          searchIcon.classed("disabled",dropdownList.selectAll("li").empty())
        })

    var searchIcon = searchSel.append("button")
      .attr("class","search-icon disabled")
      .style("right",options.help ? "40px" : null)
      .call(getSVG()
        .d(d4paths.search)
        .width(20).height(20))
      .on("click",function(){
          dropdownList.select("li.active").dispatch("click");
      })

    if(options.help){
      var helpIcon = searchSel.append("button")
      .attr("class","help-icon")
      .call(getSVG()
        .d(d4paths.info)
        .width(20).height(20))
      .on("click",function(){
        displayInfoPanel(options.help);
      })
      .attr("title","info")
      helpIcon.select("path").style("fill",UIcolor);
    }

    var dropdownList = searchSel.append("ul")
      .attr("class","dropdown-list");

    body.on("click.dropdownlist",function(){
      dropdownList.style("display","none").selectAll("*").remove();
    })

  // dragbar
  if(dragbar.empty()){
    dragbar = body.append("div")
      .attr("class","dragbar")
      .style("width","5px")
      .style("cursor","col-resize")
      .style("position","absolute")
      .style("top","0px")
      .style("left",(sidebarOffset-15) + "px")
      .style("z-index",1);

    dragbar.call(d3.drag()
      .on("start", function() {
        body.style("cursor","col-resize");
        if(options.showSidebar){
          plot.select("canvas").remove();
          plot.select("svg").remove();
          sidebar.selectAll(".sidebar > div").style("visibility","hidden");
        }
      })
      .on("drag", function() {
        var value = d3.mouse(body.node())[0];
        if(value > 177 && value < 400){
          dragbar.style("left", value + "px")
          sidebar.style("width", (value) + "px")
          if(options.showSidebar){
            sidebarOffset = value+15;
            panel.style("left", sidebarOffset + "px")
            width = computeWidth();
            plot.style("width",width+"px");
          }
        }
      })
      .on("end", function() {
        body.style("cursor",null);
        if(Controllers.nodeFilter){
          Controllers.nodeFilter.update();
        }
        if(Controllers.linkFilter){
          Controllers.linkFilter.update();
        }
        sidebar.selectAll(".sidebar > div").style("visibility",null);
        if(options.showSidebar)
          plot.call(drawSVG);
      })
    );
  }

  }else{
    sidebar.selectAll("div.sidebar>div:not(.fixed)").remove();
  }

  if(options.showSidebar){

    sidebarOffset = parseInt(sidebar.style("width"))+15;
    panel.style("left", sidebarOffset + "px");

  var divControl, applyFuncObject = {}, visData;
    
// sidebar nodes
  var sideNodes = sidebar.append("div")
    .attr("class","subSidebar nodes")

  sideNodes.append("h3").text(texts.nodes);

  if(options.heatmap){
    visData = ["Label","Color","Shape","Legend","OrderA","OrderD"];
  }else{
    visData = ["Label","Size","LabelSize","Color","Shape","Legend","Group"];
  }
  divControl = sideNodes.append("div")
      .attr("class", "nodeAuto")

  Controllers.nodeVisual = addVisualController()
    .item("nodes")
    .visual(visData);
  divControl.call(Controllers.nodeVisual); // nodes visualization

  applyFuncObject[texts.select] = applySelection;
  applyFuncObject[texts.egonet] = function(query,data){
        applySelection(query,data);
        switchEgoNet();
    };

  divControl = sideNodes.append("div")
      .attr("class","nodeFilter");

  Controllers.nodeFilter = addFilterController()
    .item("nodes")
    .functions(applyFuncObject);
  divControl.call(Controllers.nodeFilter); // nodes filter

// sidebar links
  var sideLinks = sidebar.append("div")
      .attr("class", "subSidebar links")

  sideLinks.append("h3").text(texts.links);

  if(options.heatmap){
    visData = ["Intensity","Color","Text"];
  }else{
    visData = ["Width","Weight","Color","Text"];
  }
  divControl = sideLinks.append("div")
      .attr("class", "linkAuto");

  Controllers.linkVisual = addVisualController()
    .item("links")
    .visual(visData);
  divControl.call(Controllers.linkVisual); // links visualization

  divControl = sideLinks.append("div")
      .attr("class","linkFilter");

  Controllers.linkFilter = addFilterController()
    .item("links")
  divControl.call(Controllers.linkFilter); // links filter

  }else{
    sidebarOffset = 0;
    panel.style("left", null);
  }
  sidebar.classed("expanded",options.showSidebar);
  dragbar.style("height",(8 + parseInt(sidebar.style("height"))) + "px");
  plot.call(drawSVG);
}

// arrows to hide/show controls
function visArrow(){
    var item,
        vertical = false,
        top = null,
        left = null,
        bottom = null,
        title = null,
        callback = false,
        arrows = ["&#9666;","&#9656;"];

    function exports(panel){
      if(typeof options[item]!="undefined"){
        plot.append("div")
          .attr("class","showhideArrow "+item)
          .style("top",top)
          .style("left",left)
          .style("bottom",bottom)
          .attr("title",title)
          .call(changeArrow)
          .on("click",function(){
            options[item] = !options[item];
            d3.select(this).call(changeArrow);
            if(callback)
              callback();
          })
      }
    }

    function changeArrow(div){
        div.html(function(){ return options[item] ? arrows[0] : arrows[1]});
    }

    exports.item = function(x) {
      if (!arguments.length) return item;
      item = x;
      return exports;
    };

    exports.vertical = function(x) {
      if (!arguments.length) return vertical;
      vertical = x;
      arrows = vertical?["&#9662;","&#9652;"]:["&#9666;","&#9656;"];
      return exports;
    };

    exports.top = function(x) {
      if (!arguments.length) return top;
      top = x;
      return exports;
    };

    exports.left = function(x) {
      if (!arguments.length) return left;
      left = x;
      return exports;
    };

    exports.bottom = function(x) {
      if (!arguments.length) return bottom;
      bottom = x;
      return exports;
    };

    exports.title = function(x) {
      if (!arguments.length) return title;
      title = x;
      return exports;
    };

    exports.callback = function(x) {
      if (!arguments.length) return callback;
      callback = x;
      return exports;
    };

    return exports;
}

// sidebar controller for visual aspects
function addVisualController(){
  var items,
      item,
      data,
      visData,
      attrData,
      onlyNumeric = ["Size","LabelSize","Width","Weight","Intensity"];

  function exports(sel){
    var sels = sel.selectAll("visSel")
        .data(visData)
      .enter().append("div")
        .attr("class","visSel")
        .property("value",String)

    sels.append("div")
      .append("span")
          .text(function(d){ return texts[d]+" "; })
          .append("img")
            .attr("width","10")
            .attr("height","10")
            .attr("src",b64Icons.info)
            .attr("title",function(d){ return texts[d+"Info"]; });

    sels.each(function(visual){
      var tmpData = attrData.filter(function(d){
          var t = dataType(data,d,true);
          if(onlyNumeric.indexOf(visual)!=-1 && t!="number")
              return false;
          return true;
        });
      tmpData.unshift("-"+texts.none+"-");

      d3.select(this).append("div")
        .append("select")
      .on("change", function(){
        var attr = this.value;
        applyAuto(visual,attr);
        if((visual=="Color"|| visual=="Group") && dataType(data,attr) == "number"){
          displayPicker(attr,function(val){
            options["colorScale"+item+visual] = val;
            drawNet();
          });
        }
      })
      .selectAll("option")
        .data(tmpData)
      .enter().append("option")
        .property("selected",function(d){
          if(options[item+visual]==d)
            return true;
          else
            return null;
        })
        .property("value",String)
        .text(String)
    })

    sel.append("div").attr("class","clear")
  }

  function applyAuto(visual, attr){
    if(attr=="-"+texts.none+"-"){
      delete options[item+visual];
    }else{
      options[item+visual] = attr;
    }
    if(item+visual == "nodeOrderA")
        delete options.nodeOrderD;
    if(item+visual == "nodeOrderD")
        delete options.nodeOrderA;
    drawNet();
  }

  exports.item = function(x) {
      if (!arguments.length) return items;
      items = x;
      data = Graph[items];
      item = items.slice(0, 4);
      attrData = Graph[item+"names"].filter(function(d){ return hiddenFields.indexOf(d)==-1; });
      return exports;
  };

  exports.visual = function(x) {
      if (!arguments.length) return visData;
      visData = x;
      return exports;
  };

  return exports;
} // end of Visual Controller

// sidebar controller for filters and selections
function addFilterController(){
  var items,
      item,
      data = [],
      applyFunc = {},
      attrData = [],
      show = false,
      selectedValues = {},
      appliedFilters = {},
      itemFilter,
      attrSelect,
      valSelector,
      filterTags,
      expandCtrl;

  function exports(sel){

    expandCtrl = sel.append("div")
      .attr("class","filter-switch")
      .append("h4")
      .text(texts.filter)
      .on("click", function(){
        showFilter(true);
        expandCtrlSwitch();
      })
    expandCtrlSwitch();

    itemFilter = sel.append("div");

    if(!show){
      itemFilter.style("display", "none");
    }

    attrSelect = itemFilter.append("select")
      .attr("class","attrSel");

    attrSelect.selectAll("option")
      .data(attrData)
      .enter().append("option")
        .property("value",String)
        .text(String)

    attrSelect.on("change", function() { 
      changeAttrSel(this.value);
    })

    valSelector = itemFilter.append("div")
      .attr("class","valSel")
      .style("margin-bottom",0);

    itemFilter.append("button")
      .text(texts.filter)
      .on("click", function(){
        updateAppliedFilters();
        updateTags();
        applyFilter(selectedValues2str(appliedFilters,data));
      })

    itemFilter.append("button")
      .text(texts.clear)
      .on("click", function(){
        selectedValues = {};
        changeAttrSel(attrSelect.property("value"));
        Graph.nodes.forEach(function(d){
          delete d.selected;
        });
        applyInitialFilter();
      });

    filterTags = itemFilter.append("div")
      .attr("class","filter-tags")

    if(typeof applyFunc == 'object'){
      for(var i in applyFunc){
        itemFilter.append("button")
          .text(i)
          .on("click", function(){
            applyFunc[this.textContent](prepareQuery(),data);
          });
      }
    }

    itemFilter.append("div")
      .attr("class","collapse-ctrl")
      .style("transform","rotate(90deg)")
      .html("&#x2039;")
      .on("click",function(){
        showFilter(false);
        expandCtrlSwitch();
      })
  }

  function expandCtrlSwitch(){
    expandCtrl
      .style("cursor",show ? null : "pointer")
      .style("pointer-events",show ? "none" : "all")
      .classed("expanded", show)
  }

  function applyFilter(query){
        data.forEach(function(d){ 
          if(eval(query)){
            delete d._hidden;
          }else{
            d._hidden = true;
            delete d.selected;
          }
        });
        drawNet();
  }

  function updateAppliedFilters(){
    for(var k in selectedValues){
          if(typeof selectedValues[k][0] == 'number'){
            appliedFilters[k] = selectedValues[k].slice();
          }else{
            selectedValues[k].forEach(function(v){
              if(appliedFilters[k]){
                if(appliedFilters[k].indexOf(v)==-1)
                  appliedFilters[k].push(v);
              }else{
                appliedFilters[k] = [v];
              }
            });
          }
    }
  }

  function updateTags(){
    var tags = filterTags.selectAll("div").data(d3.keys(appliedFilters),String);

    tags.enter().append("div")
      .text(String)
      .append("span")
        .html("&#x2716;")
        .on("click",function(k){
          delete appliedFilters[k];
          updateTags();
          applyFilter(selectedValues2str(appliedFilters,data));
          data.forEach(function(d){
            if(d.hidden){
              d._hidden = true;
            }
          });
          drawNet();
        })

    tags.exit().remove();
  }

  function prepareQuery(){
    return selectedValues2str(selectedValues,data);
  }

  function changeAttrSel(val){
      valSelector.selectAll("*").remove();
      var tmpData = items=="nodes" ? simulation.nodes() : simulation.force("link").links();
      var type = dataType(tmpData,val);
      if(type == 'number'){
        var extent = d3.extent(tmpData, function(d){ return d[val]; }),
            baseWidth = parseInt(valSelector.style("width"));
        if(!selectedValues[val])
          selectedValues[val] = extent.slice();
        valSelector.call(brushSlider()
          .domain(extent)
          .current(selectedValues[val])
          .callback(function(s){ selectedValues[val] = s; })
          .baseWidth(baseWidth));
      }else{
        var loadSelValues = function(){
          selectedValues[val] = [];
          valSelector.selectAll("option").each(function(){
            if(this.selected)
              selectedValues[val].push(this.value);
          })
          if(selectedValues[val].length == 0)
            delete selectedValues[val];
        }
        var dat = tmpData.map(function(d){ return d[val]; });
        if(type != 'string')
          dat = dat.reduce(function(a,b) { return b ? a.concat(b) : a; }, []);
        valSelector.style("height",null);
        valSelector.append("select")
          .attr("multiple","multiple")
          .on("blur",loadSelValues)
          .selectAll("option")
        .data(d3.set(dat).values().sort())
          .enter().append("option")
          .property("value",function(d){ return d.replace(/\'/g, "\\'"); })
          .text(stripTags)
          .each(function(d){
            if(selectedValues[val] && selectedValues[val].indexOf(d)!=-1)
              this.selected = true;
          })
      }
  }

  function showFilter(x) {
      show = x;
      if(itemFilter){
        if(show){
          itemFilter
            .style("display","block")
            .style("opacity", 0)
            .style("height",null);
          var height = itemFilter.style("height");
          itemFilter.style("height", "0px")
            .transition()
              .style("height", height)
              .on("end",function(){
                itemFilter.style("height",null)
                  .transition()
                    .style("opacity", 1)
                    .style("overflow",null);
              })
          attrSelect.dispatch("change");
        }else{
          itemFilter
            .style("opacity", 1)
            .style("height", itemFilter.style("height"))
            .transition().style("opacity", 0)
              .on("end",function(){
                itemFilter.transition()
                  .style("overflow","hidden")
                  .style("height", "0px")
                  .on("end",function(){
                    itemFilter.style("display","none");
                  })
              })
          selectedValues = {};
        }
      }
      return exports;
  };

  exports.cleanFilterTags = function(){
    appliedFilters = {};
    updateTags();
  }

  exports.update = function(){
    selectedValues = {};
    attrSelect.dispatch("change");
  }

  exports.item = function(x) {
      if (!arguments.length) return items;
      items = x;
      data = Graph[items];
      item = items.slice(0, 4);
      attrData = Graph[item+"names"].filter(function(d){ return hiddenFields.indexOf(d)==-1; });
      return exports;
  };

  exports.functions = function(x) {
      if (!arguments.length) return applyFunc;
      applyFunc = x;
      return exports;
  };

  return exports;
} // end of Filter Controller

function applyInitialFilter(){
    showHidden();
    Graph.nodes.forEach(function(d){
      if(d.hidden){
        d._hidden = true;
        delete d.selected;
      }
    });
    Graph.links.forEach(function(d){
      if(d.hidden){
        d._hidden = true;
      }
    });
    drawNet();
}

function checkInitialFilters(){
  for(var i = 0; i<Graph.nodes.length; i++){
    if((Graph.nodes[i].hidden ? 1 : 0) != (Graph.nodes[i]._hidden ? 1 : 0)){
      return false;
    }
  }
  return true;
}

function applySelection(query,data){
  data.forEach(function(d){
    if(eval(query))
      d.selected = true;
    else
      delete d.selected;
  });
  showTables();
}

// draw canvas and svg environment for plot
function drawSVG(sel){

  adaptLayout();

  sel.select("canvas").remove();
  sel.select("svg").remove();

  width = computeWidth();
  sel.style("width",width+"px");

  var size = Math.min(width,height);

  simulation
      .force("x", d3.forceX().strength(0.1))
      .force("y", d3.forceY().strength(0.1))

  body
    .on("keydown.viewbrush", keyflip)
    .on("keyup.viewbrush", keyflip)
  
  var svg = sel.insert("svg",":first-child")
      .attr("xmlns","http://www.w3.org/2000/svg")
      .attr("width", width)
      .attr("height", height)
    .style("position","absolute")
    .style("top",0)
    .style("left",0)

  var canvas = sel.insert("canvas",":first-child")
    .attr("width", width)
    .attr("height", height)

    svg.append("style")
     .text("text { font-family: sans-serif; font-size: "+body.style("font-size")+"; } "+
".axisLabel { stroke-width: 0.5px; font-size: 100%; fill: #999; } "+
".label { font-size: 100%; fill: #444; } "+
"line.axis { stroke: #aaa; }"+
"g.heatmap path.cluster { stroke: #666; fill: none; }"+
".cellText { font-weight: bold; fill: #fff; }");

  var defs = svg.append("defs");
  d3.keys(colorScales).forEach(function(d){ addGradient(defs,d,colorScales[d]); });

  defs.append("clipPath")
    .attr("id","heatmapClip")
    .append("rect")
      .attr("x",-height)
      .attr("y",-height/2 - 10)
      .attr("width",height*2)
      .attr("height",height)

  var rect = svg.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", height)
    .attr("pointer-events","all")
    .style("fill","none")
    .on("click",clickNet)
    .on("dblclick",dblClickNet)
    .on("mousemove",hoverNet)
    .on("mousedown.grabbing",function(){
      d3.select(this).style("cursor","grabbing");
    })
    .on("mouseup.grabbing",function(){
      d3.select(this).style("cursor","grab");
    })
    .call(d3.drag()
          .subject(dragsubject)
          .on("start", dragstarted)
          .on("drag", options.constructural ? dragged_constructural : dragged)
          .on("end", dragended))
    .call(zoom)
    .on("dblclick.zoom",null)

  if(typeof options.zoomScale != "undefined"){
    rect.call(zoom.transform,transform);
  }

  if(!options.heatmap && options.showCoordinates){
      var range = getLayoutRange();

      var xAxisScale = d3.scaleLinear()
        .range(range.x)
        .domain([scaleCoorX.invert(range.x[0]),scaleCoorX.invert(range.x[1])]);

      var yAxisScale = d3.scaleLinear()
        .range(range.y)
        .domain([scaleCoorY.invert(range.y[0]),scaleCoorY.invert(range.y[1])]);

      var gxaxis = svg.append("g")
        .attr("class", "x axis")
        .style("opacity",options.showAxes?1:0)
        .attr("transform", "translate(0," + (range.y[1]) + ")")

      if(options.axesLabels.length>0){
        svg.append("text")
          .attr("class","axisLabel")
          .style("opacity",options.showAxes?1:0)
          .attr("x", range.x[1])
          .attr("y", range.y[1]-4)
          .style("text-anchor", "end")
          .text(options.axesLabels[0]);
      }

      var xAxis = d3.axisBottom();

      var gyaxis = svg.append("g")
        .attr("class", "y axis")
        .style("opacity",options.showAxes?1:0)
        .attr("transform", "translate(" + (range.x[0]) + ",0)")

      if(options.axesLabels.length>1){
        svg.append("text")
          .attr("class","axisLabel")
          .style("opacity",options.showAxes?1:0)
          .attr("transform", "rotate(-90)")
          .attr("x", -range.y[0])
          .attr("y", range.x[0]+(10*options.cex))
          .style("text-anchor", "end")
          .text(options.axesLabels[1]);
      }

      var yAxis = d3.axisLeft();
  }

  var net = svg.append("g")
    .attr("class","net")

  var brush = d3.brush()
      .filter(function(){
        return !d3.event.button && d3.event.shiftKey;
      })
      .extent( [ [0,0], [width,height] ] )
        .on("start", function() {
          brushg.selectAll('.selection').style("display",null);
        })
        .on("end", function() {
          d3.selectAll(".legend > g > text").style("stroke",function(){
            delete this.parentNode.selected;
            return null;
          });
          var extent = d3.event.selection;
          if(extent){
            extent[0][0] = transform.invertX(extent[0][0]);
            extent[0][1] = transform.invertY(extent[0][1]);
            extent[1][0] = transform.invertX(extent[1][0]);
            extent[1][1] = transform.invertY(extent[1][1]);
            Graph.nodes.forEach(function(node) {
              node.selected = checkSelectable(node) && (node.selected ^ (extent[0][0] <= node.x && node.x < extent[1][0] && extent[0][1] <= node.y && node.y < extent[1][1]));
            });
          }
          showTables();
          brushg.selectAll('.selection').style("display","none");
        });

  var brushg = svg.append("g")
    .attr("class","brush")
    .call(brush)

  brushg.selectAll('.handle').remove();

  brushg.style("display","none");

  svg.append("g").attr("class","scale")
    .attr("transform", "translate("+(width-20)+",20)");

  chargeRange = [0,-(size*2)];
  linkDistanceRange = [0,size*3/4];

  if(!options.hasOwnProperty("charge"))
      options.charge = chargeRange[1] * (options.repulsion/100);
  if(!options.hasOwnProperty("linkDistance"))
      options.linkDistance = linkDistanceRange[1] * (options.distance/100);

  Sliders.zoom = displaySlider()
      .domain(zoomRange)
      .text("Zoom")
      .prop('zoomScale')
      .callback(function(value){
          options.zoomScale = value;
          transform.k = options.zoomScale;
          net.attr("transform", transform);
          if(!options.heatmap){
            if(options.showCoordinates){
              gxaxis.call(xAxis.scale(transform.rescaleX(xAxisScale)));
              gyaxis.call(yAxis.scale(transform.rescaleY(yAxisScale)));
            }
            simulation.restart();
          }
      });

  resetZoom();


  if(frameControls){
      Sliders.frame = displaySlider()
      .domain([0,frameControls.frames.length-1])
      .domain2([1,frameControls.frames.length])
      .rounded(true)
      .text("Frame")
      .prop('frames')
      .callback(frameStep);

      Sliders.time = displaySlider()
      .domain(timeRange)
      .domain2([0,100])
      .text(texts.speed)
      .prop('time')
      .callback(function(value){
        frameControls.time = value;
        if(frameControls.play)
          handleFrames(frameControls.frame);
      });
  }

  var top = !options.showSidebar && !d3.select(".sidebar").empty() ? parseInt(body.select(".sidebar .fixed").style("height"))+30 - (options.main ? parseInt(body.select("div.main").style("height")) : 0) : 10;

  sel.select(".showhideArrow.showButtons").style("top",top+"px");

  var buttons = svg.append("g")
        .attr("class", "buttons")
        .style("display",options.showButtons ? null : "none")
        .attr("transform", "translate(30,"+(10 + top)+")")

  var sliders = buttons.append("g")
        .attr("class","sliders")

  var countY = 8;

  Sliders.distance = displaySlider()
      .y(countY*options.cex)
      .domain(linkDistanceRange)
      .domain2([0,100])
      .text(texts.distance)
      .prop('linkDistance')
      .callback(function(value){
        options['linkDistance'] = value;
        update_forces();
      })
  sliders.call(Sliders.distance);
  Sliders.distance.update(options['linkDistance']);

  countY += 18;

  Sliders.repulsion = displaySlider()
      .y(countY*options.cex)
      .domain(chargeRange)
      .domain2([0,100])
      .text(texts.repulsion)
      .prop('charge')
      .callback(function(value){
        options['charge'] = value;
        update_forces();
      })
  sliders.call(Sliders.repulsion);
  Sliders.repulsion.update(options['charge']);

  countY += 18;

  Sliders.zoom.y(countY*options.cex)
  sliders.call(Sliders.zoom);

  countY += 18;

  if(frameControls){
      Sliders.frame.y(countY*options.cex)
      sliders.call(Sliders.frame);
      Sliders.frame.update(frameControls.frame);

      countY += 18;

      Sliders.time.y(countY*options.cex)
      sliders.call(Sliders.time);
      Sliders.time.update(frameControls.time);

      countY += 18;
  }

  countY += 8;

  loadSVGbuttons(countY);

  var makeZoomButton = function(y,n){
    var zoombutton = svg.append("g")
      .attr("class","zoombutton "+n)
      .attr("transform","translate("+(width-35)+","+(height-y)+")")

    zoombutton.append("rect")
      .attr("x",0)
      .attr("y",0)
      .attr("rx",3)
      .attr("ry",3)
      .attr("width",30)
      .attr("height",30)

    return zoombutton;
  }

  // zoom in
  var zoomin = makeZoomButton(110,"zoomin");
  zoomin.on("click",function(){
        transform.k = transform.k + 0.1;
        if(transform.k>zoomRange[1]){
          transform.k = zoomRange[1];
          return;
        }
        options.zoomScale = transform.k
        Sliders.zoom.update(options.zoomScale).brushedValue(true);
      })
  zoomin.append("rect")
      .attr("x",7)
      .attr("y",12)
      .attr("width",16)
      .attr("height",6)
  zoomin.append("rect")
      .attr("x",12)
      .attr("y",7)
      .attr("width",6)
      .attr("height",16)
  zoomin.append("title").text(texts.zoomin + " (ctrl + '+')")

  // reset zoom
  var zoomreset = makeZoomButton(75,"zoomreset");
  zoomreset.on("click",function(){
        resetZoom();
      })
  zoomreset.append("title").text(texts.resetzoom + " (ctrl + 0)")
  zoomreset.select("rect")
      .style("fill",UIcolor)
  zoomreset.append("path")
      .attr("transform","translate(7,6)")
      .style("fill","#fff")
      .attr("d",d4paths.resetzoom)

  // zoom out
  var zoomout = makeZoomButton(40,"zoomout");
  zoomout.on("click",function(){
        transform.k = transform.k - 0.1;
        if(transform.k<zoomRange[0]){
          transform.k = zoomRange[0];
          return;
        }
        options.zoomScale = transform.k
        Sliders.zoom.update(options.zoomScale).brushedValue(true);
      })
  zoomout.append("rect")
      .attr("x",7)
      .attr("y",12)
      .attr("width",16)
      .attr("height",6)
  zoomout.append("title").text(texts.zoomout + " (ctrl + '-')")

  Sliders.zoom.update(options.zoomScale);

  if(frameControls){
    handleFrames(frameControls.frame);
  }else{
    drawNet();
  }

  function keyflip() {
    if(d3.event.shiftKey){
      if(!options.heatmap){
        brushg.style("display",null);
      }
    }else{
      brushg.style("display","none");
    }
  }

  function loadSVGbuttons(count){
    var dat = [],
        datStopResume = {txt: texts.stopresume, key: "dynamicNodes", tooltip: "ctrl + d", callback: stopResumeNet},
        datDirectional = {txt: texts.directional, key: "showArrows", tooltip: "ctrl + a", callback: function(){
          if(options.heatmap)
            drawNet();
          else
            simulation.restart();
        }, gap: 5},
        datLegend = {txt: texts.showhidelegend, key: "showLegend", tooltip: "ctrl + l", callback: function(){
          if(options.showLegend){
            drawNet();
            d3.selectAll(".scale").style("opacity", 0)
            clickHide(d3.selectAll(".scale"), true);
          }else{
            clickHide(d3.selectAll(".scale"), false, drawNet);
          }
        }},
        datAxes = {txt: texts.showhideaxes, key: "showAxes", tooltip: "ctrl + x", callback: function(){
          if(!options.showCoordinates){
            clickHide(d3.selectAll(".net .axis, .net .axisLabel"), options.showAxes);
          }else{
            clickHide(d3.selectAll(".plot > svg > .axis, .plot > svg > .axisLabel"), options.showAxes);
          }
        }},
        datMode = {txt: texts.netheatmap, key: "heatmap", tooltip: "ctrl + m", callback: function(){
          displaySidebar();
        }, gap: 5},
        datPyramid = {txt : texts.trianglesquare, key: "heatmapTriangle", tooltip: "ctrl + g", callback: drawNet};

    if(options.heatmap){
      dat = [datPyramid];
    }else if(!options.constructural){
      dat = [datStopResume];
    }

    dat.push(datDirectional);
    dat.push(datLegend);
    if(!options.heatmap)
      dat.push(datAxes);

    if(Array.isArray(options.mode))
      dat.push(datMode);
  
    var gButton = buttons.selectAll(".button")
        .data(dat, function(d){ return d.key; })

    gButton.exit().remove();

    gButton.enter().append("g")
    .attr("class",function(d){ return "button "+d.key; })
    .each(function(d,i){

      var self = d3.select(this);

      self.append("rect")
      .attr("x",0)
      .attr("y",5*(options.cex-1))
      .attr("rx",5)
      .attr("ry",5)
      .attr("width",20)
      .attr("height",10)
      .on("click",function(){
        options[d.key] = !options[d.key];
        activeButton(250);
        d.callback();
      }).append("title")
        .text(function(d){
          return d.tooltip;
        })

      self.append("circle")
      .attr("cx",5)
      .attr("cy",5*(options.cex-1)+5)
      .attr("r",5)
      .attr("pointer-events","none")

      self.append("text")
        .attr("x",30)
      .attr("y",9*options.cex)
      .text(d.txt);

      activeButton(0);

      function activeButton(time){
        var circle = self.select("circle");
        if(time){
          circle = circle.transition()
            .duration(time)
            .on("end",function(){
              changeColor();
            });
        }else{
          changeColor();
        }
        circle.attr("cx",options[d.key] ? 15 : 5);

        function changeColor(){
          self.select("circle").style("fill",options[d.key] ? UIcolor : null);
          self.select("rect").style("fill",options[d.key] ? disUIcolor : null);
        }
      }

    })
    .merge(gButton)
    .attr("transform",function(d){
      if(d.gap)
        count += d.gap;
      var val = "translate(0,"+(count*options.cex)+")";
      count += 15;
      return val;
    })

    count += 10;

    var resetButton = buttons.append("g")
          .attr("transform","translate(0,"+(count*options.cex)+")"),
        resetButtonSize = 20,
        resetButtonPathScale = 1.4,
        resetButtonPad = (resetButtonSize-8*resetButtonPathScale)/2;

    resetButton.append("rect")
      .attr("x",0)
      .attr("y",0)
      .attr("rx",5)
      .attr("ry",5)
      .attr("width",resetButtonSize)
      .attr("height",resetButtonSize)
      .style("cursor","pointer")
      .style("fill",UIcolor)
      .on("click",function(){
        location.reload();
      })
      .append("title")
        .text("F5")

    resetButton.append("text")
      .attr("x",30)
      .attr("y",10*options.cex + (resetButtonSize-13*options.cex)/2)
      .text(texts.reset);

    resetButton.append("path")
      .style("fill","#fff")
      .attr("pointer-events","none")
      .attr("transform","translate("+resetButtonPad+","+resetButtonPad+")scale("+resetButtonPathScale+")")
      .attr("d",d4paths.loop)
  }

  function displaySlider(){
    var scale,
        brush,
        slider,
        bubble,
        y = 0,
        domain = [1,0],
        domain2 = false,
        scale2 = false,
        text = "",
        prop = "",
        callback = null,
        rounded = false,
        brushedValue = false,
        handleRadius = 5;

    function exports(sliders){
      scale = d3.scaleLinear()
        .clamp(true)
        .domain(domain)
        .range([0, sliderWidth])

      scale2 = d3.scaleLinear()
        .clamp(true)
        .domain(domain2 ? domain2 : domain)
        .range([0, sliderWidth])

      brush = d3.brushX().extent([[-handleRadius,0], [sliderWidth + handleRadius, handleRadius*2]]);

      sliders = sliders.append("g")
            .attr("class","slider "+prop)

      var x = 0;

      sliders.append("text")
        .attr("x", x + sliderWidth + 10)
        .attr("y", y + 3*options.cex)
        .text(text);

      slider = sliders.append("g")
        .attr("transform", "translate("+ x +","+ y +")")
        .attr("class", "x axis brushSlider")
        .call(d3.axisBottom(scale)
          .tickSize(0)
          .ticks(0))
        .append("g")
          .attr("class", "slider")
          .attr("transform", "translate(0,-5)")
          .call(brush)
          .call(function(g){
            g.select(".overlay")
             .datum({type:"selection"})
             .on("mousedown touchstart", beforebrushstarted);
          });

      slider.selectAll('.handle').remove();
      slider.selectAll('rect.selection')
      .attr("fill",null)
      .attr("fill-opacity",null)
      .attr("stroke",null)
      .attr("shape-rendering",null)
      .attr("rx",handleRadius)
      .attr("ry",handleRadius)
      .on("mouseover",function(){ bubble.style("visibility","visible"); })
      .on("mouseleave",function(){ bubble.style("visibility","hidden"); })

      bubble = slider.append("text")
        .attr("text-anchor","start")
        .style("visibility","hidden");

      brush.on("brush", brushed)
           .on("start",function(){
             slider.selectAll('rect.selection').on("mouseleave",null);
             bubble.style("visibility","visible");
           })
           .on("end",function(){
             bubble.style("visibility","hidden");
             slider.selectAll('rect.selection').on("mouseleave",function(){ bubble.style("visibility","hidden"); });
           })
    }

    function innerBrushed(brValue,value) {
      var renderedValue = scale2.invert(brValue);
      renderedValue = rounded ? Math.round(renderedValue) : formatter(renderedValue);
      bubble.text(renderedValue);
      if(rounded){
        value = Math.round(value);
        var tomove = scale2(renderedValue);
        slider.call(brush.move,[tomove-handleRadius,tomove+handleRadius]);
        bubble.attr("x",tomove+7);
      }else{
        bubble.attr("x",brValue+7);
      }
      return value;
    }

    function beforebrushstarted() {
      exports.update(scale.invert(d3.mouse(this)[0]));
      brushedValue = true;
    }

    function brushed() {
      if (!d3.event.sourceEvent || ["mousemove","click"].indexOf(d3.event.sourceEvent.type)==-1) return;
      brushedValue = d3.mean(d3.event.selection);
      callback(innerBrushed(brushedValue,scale.invert(brushedValue)));
    }

    exports.update = function(value) {
      if(slider && (value >= d3.min(domain) && value <= d3.max(domain))){
        brush.on("brush", null);
        slider.call(brush.move,[scale(value)-handleRadius,scale(value)+handleRadius]);
        callback(innerBrushed(scale(value),value));
        brush.on("brush", brushed);
      }
      return exports;
    }

    exports.y = function(x) {
      if (!arguments.length) return y;
      y = x;
      return exports;
    };

    exports.domain = function(x) {
      if (!arguments.length) return domain;
      domain = x;
      return exports;
    };

    exports.domain2 = function(x) {
      if (!arguments.length) return domain2;
      domain2 = x;
      return exports;
    };

    exports.text = function(x) {
      if (!arguments.length) return text;
      text = x;
      return exports;
    };

    exports.prop = function(x) {
      if (!arguments.length) return prop;
      prop = x;
      return exports;
    };

    exports.callback = function(x) {
      if (!arguments.length) return callback;
      callback = x;
      return exports;
    };

    exports.rounded = function(x) {
      if (!arguments.length) return rounded;
      rounded = x;
      return exports;
    };

    exports.brushedValue = function(x) {
      if (!arguments.length) return brushedValue;
      brushedValue = x;
      return exports;
    };

    return exports;
  }
}

function update_forces(){
      if(options.dynamicNodes){
        simulation.force("charge")
          .strength(options.charge)
        if(!options.linkWeight)
          simulation.force("link")
            .distance(options.linkDistance)

        simulation.alpha(frameControls?0.1:1).restart();
      }else
        simulation.restart();
}

function handleFrames(value){
      clearInterval(frameControls.frameInterval);
      Sliders.frame.update(checkLoop(value));

      if(frameControls.play){
        frameControls.frameInterval = setInterval(function(){
          Sliders.frame.update(checkLoop(frameControls.frame+1));
        }, frameControls.time);
      }

      function checkLoop(value){
        if(value>=frameControls.frames.length)
          return 0; 
        return value;
      }
}

function frameStep(value){
        frameControls.frame = value;

        var selectFrame = d3.select(".divFrameCtrl .selectFrame");
        if(!selectFrame.empty())
          selectFrame.node().selectedIndex = frameControls.frame;
        loadFrameData(frameControls.frame);

        if(Array.isArray(options.main))
          body.select("div.main").html(options.main[frameControls.frame]);
        if(Array.isArray(options.note))
          body.select("div.note").html(options.note[frameControls.frame]);

        Graph.nodes.forEach(function(node){
          node._hideFrame = true;
        });

        Graph.links.forEach(function(link){
          link._hideFrame = link['_frame_']!=frameControls.frame;
          if(!link._hideFrame){
            delete link.source._hideFrame;
            delete link.target._hideFrame;
            delete link._hideFrame;
          }
        });

        GraphNodesLength = Graph.nodes.filter(function(node){ return !node._hideFrame; }).length;
        GraphLinksLength = Graph.links.filter(function(link){ return !link._hideFrame; }).length;

        drawNet();

        if(frameControls.hasOwnProperty("zoom")){
          options.zoom = frameControls.zoom[frameControls.frame];
          if(Sliders.zoom.brushedValue()===false){
            resetZoom();
          }
        }
        if(frameControls.hasOwnProperty("repulsion")){
          options.repulsion = frameControls.repulsion[frameControls.frame];
          if(Sliders.repulsion.brushedValue()===false){
            options.charge = chargeRange[1] * (options.repulsion/100);
            Sliders.repulsion.update(options.charge).brushedValue(false);
          }
        }
        if(frameControls.hasOwnProperty("distance")){
          options.distance = frameControls.distance[frameControls.frame];
          if(Sliders.distance.brushedValue()===false){
            options.linkDistance = linkDistanceRange[1] * (options.distance/100);
            Sliders.distance.update(options.linkDistance).brushedValue(false);
          }
        }

        if(frameControls.frame==frameControls.frames.length-1 && !frameControls.loop)
          d3.select(".divFrameCtrl .pause").dispatch("click");
}

function drawNet(){
  d3.selectAll(".slider.charge, .slider.linkDistance")
    .style("opacity",options.heatmap||!options.dynamicNodes?0:1);
  
  var svg = d3.select(".plot svg g.net");

  var ctx = d3.select(".plot canvas").node().getContext("2d");

  var gScale = d3.select(".plot svg g.scale")
  gScale.selectAll("*").remove();

  if(Graph.tree){
    var hideChildren = function(d){
      d.childNodes.forEach(function(d){
        d._hidden = true;
        d.selected = false;
        hideChildren(d);
      });
    }
    Graph.nodes.forEach(function(d){
      if(checkSelectable(d) && d.childNodes.length)
        hideChildren(d);
    });
  }

  var nodes = Graph.nodes.filter(function(node){
    node.degree = 0;
    return checkSelectable(node);
  });

  var links = Graph.links.filter(checkSelectableLink);

  enableSelectButtons("#resetfilter",(nodes.length!=GraphNodesLength) || (links.length!=GraphLinksLength));

  for(var i=1; i<links.length; i++){
    for(var j = i-1; j>=0; j--){
      if((links[i].Source == links[j].Source && links[i].Target == links[j].Target)||(links[i].Source == links[j].Target && links[i].Target == links[j].Source)){
        if(!links[j].linkNum)
          links[j].linkNum = 1;
        links[i].linkNum = links[j].linkNum + 1;
        break;
      }
    }
  }

  links.forEach(function(link){
    link.source.degree = +link.source.degree+1;
    link.target.degree = +link.target.degree+1;
  })

  var imgidx = options.imageNames.indexOf(options.nodeShape);
  options.imageItem = imgidx!=-1 ? options.imageItems[imgidx] : false;

  // compute colors
  var colorNodesScale = setColorScale(options.nodeColor=="degree" ? nodes : Graph.nodes,'node',"nodeColor"),
      colorGroupsScale = setColorScale(options.nodeGroup=="degree" ? nodes : Graph.nodes,'node',"nodeGroup"),
      colorLinksScale = setColorScale(Graph.links,'link',"linkColor"),
  colorNodes = colorNodesScale?function(d){ return colorNodesScale(d[options.nodeColor]); }:defaultColor,
  colorGroups = colorGroupsScale?(function(d){ return colorGroupsScale(d[options.nodeGroup]); }):defaultColor,
  colorLinks = colorLinksScale?(function(d){ return colorLinksScale(d[options.linkColor]); }):defaultLinkColor;

  // compute link attributes
  if(options.heatmap){
    var getLinkIntensity = getNumAttr(Graph.links,'linkIntensity',[0.1,1],1);
  }else{
    var getLinkDistance = getNumAttr(Graph.links,'linkWeight',linkWeightRange,options.linkDistance),
        getLinkWidth = getNumAttr(links,'linkWidth',linkWidthRange,1);

    // compute node size
    var getNodeSize = getNumAttr(nodes,'nodeSize',nodeSizeRange,options.imageItem?3:1),
        getNodeLabelSize = getNumAttr(nodes,'nodeLabelSize',nodeLabelSizeRange,10*options.cex);
    nodes.forEach(function(node){
      node.nodeSize = getNodeSize(node) * 4.514;
      node.nodeLabelSize = getNodeLabelSize(node);
    });
  }

  // compute shapes
  var getShape = function() { return d3["symbol"+defaultShape]; };
  if(options.nodeShape){
    var symbolList = d3.scaleOrdinal()
         .range(symbolTypes)
         .domain(d3.map(Graph.nodes, function(d) { return d[options.nodeShape]; }).keys());

    getShape = function(d) { return d3["symbol"+symbolList(d[options.nodeShape])]; }
  }

  svg.attr("clip-path", options.heatmap && options.heatmapTriangle?"url(#heatmapClip)":null);
  if(options.heatmap){ // draw heatmap

    ctx.clearRect(0, 0, width, height);
    svg.selectAll("*").remove();
    svg = svg.append("g")
               .attr("class","heatmap")

    var n = nodes.length,
        x = d3.scaleBand().range([0, n*20]),
        matrix = [];

    var size = Math.min(width, height),
        side = x.range()[1],
        k = 14/30 + n/150,
        scale = size * (k < 0.8 ? k : 0.8) / side,
        scaledSide = side*scale;

    svg.attr("transform", options.heatmapTriangle ?
      "translate(" + -(Math.sqrt(scaledSide*scaledSide*2))/2 + "," + (height/2 - 10) + ")scale(" + scale + ")rotate(-45)" :
      "translate(" + (-scaledSide/2) + "," + (height/2 - scaledSide - 10) + ")scale(" + scale + ")");

    nodes.forEach(function(node, i) {
      node.index = i;
      matrix[i] = d3.range(n).map(function(j) { return {x: j, y: i}; });
    });

    links.forEach(function(link) {
      var val = options.linkIntensity?link[options.linkIntensity]:1,
          valColor = options.linkColor?link[options.linkColor]:1,
          loadMatrix = function(i,j){
            matrix[i][j][options.linkIntensity] = val;
            matrix[i][j].color = valColor;
            if(options.linkText)
              matrix[i][j].txt = link[options.linkText];
          }
      if(options.linkBipolar)
        val = Math.abs(val);
      loadMatrix(link.source.index,link.target.index);
      if(!options.showArrows || options.heatmapTriangle)
        loadMatrix(link.target.index,link.source.index);
    });

  if(options.nodeOrderA || options.nodeOrderD){
    if(options.nodeOrderA)
      options.nodeOrder = options.nodeOrderA;
    else
      options.nodeOrder = options.nodeOrderD;
    x.domain(d3.range(n).sort(function(a, b) {
          a = nodes[a][options.nodeOrder];
          b = nodes[b][options.nodeOrder]
          if(options.nodeOrderD)
            b = [a, a = b][0];
          return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
        }));
  }else
    x.domain(d3.range(n));

  svg.append("rect")
      .style("fill","#eee")
      .attr("width", side)
      .attr("height", side);

  var row = svg.selectAll(".row")
      .data(matrix)
    .enter().append("g")
      .attr("class", "row")
      .attr("transform", function(d, i) { return "translate(0," + x(i) + ")"; })
      .each(rowFunc);

  row.append("line")
      .attr("x2", side)
    .style("stroke","#fff");

  appendText(row,true);
      
  var column = svg.selectAll(".column")
      .data(matrix)
    .enter().append("g")
      .attr("class", "column")
      .attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });

  column.append("line")
      .attr("x1", -side)
    .style("stroke","#fff");

  appendText(column,false);

  if(options.nodeOrder){
    var clusters = nodes.map(function(d){ return d[options.nodeOrder]; }).sort(function(a, b) { 
          if(options.nodeOrderD)
            b = [a, a = b][0];
          return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
        }),
        step = NaN,
        lines = {};
    for(var i=0; i<clusters.length; i++){
      if(step!=String(clusters[i])){
        step = String(clusters[i]);
        lines[step] = [i,i];
      }else
        lines[step][1] = i;
    }
    svg.selectAll(".cluster")
        .data(d3.values(lines))
      .enter().append("path")
        .attr("class","cluster")
        .attr("d",function(d){
            var x1 = d[0]*x.bandwidth() + x.bandwidth()/2,
                x2 = d[1]*x.bandwidth() + x.bandwidth()/2;
            return "M"+x1+",-6L"+x1+",-12L"+x2+",-12L"+x2+",-6";
        })

    delete options.nodeOrder;
  }

  function appendText(sel,row){
    if(options.nodeLabel){
    sel.append("text")
      .attr("class","label")
      .attr("x", row? (options.heatmapTriangle? side + 6 : -6) : ((options.heatmapTriangle?-1:1) * (options.nodeOrder?18:6)))
      .attr("y", (!row && options.heatmapTriangle? -1 : 1) * (x.bandwidth() / 2))
      .attr("text-anchor", row ^ options.heatmapTriangle? "end" : "start")
      .attr("transform", !row && options.heatmapTriangle? "rotate(180)" : null)
      .attr("dy", ".32em")
      .style("font-size",(x.bandwidth()-2)+"px")
      .style("fill",colorNodesScale? function(d, i) {
        var col = d3.rgb(colorNodesScale(nodes[i][options.nodeColor]));
        if(col.r==255 && col.g==255 && col.b==255)
          col = col.darker(1);
        return col;
      } : null)
      .style("opacity",0)
      .text(function(d, i) { return (!row ? nodes[i][options.nodeLabel] : nodes[i][options.nodeName]); })
      .on("click",function(d,i){
        var name = nodes[i][options.nodeName];
        nodes.forEach(function(p){
            if(d3.event.ctrlKey || d3.event.metaKey)
              p.selected = p.selected ^ name == p[options.nodeName];
            else
              p.selected = name == p[options.nodeName];
        });
        showTables();
      })
      .on("dblclick", row || !options.linkIntensity ? function(){
        d3.event.stopPropagation();
        switchEgoNet();
      } : function(d,i){
        d3.event.stopPropagation();
        var order = d3.transpose(matrix)[i].sort(function(a,b){
              var aIntensity = a[options.linkIntensity]?a[options.linkIntensity]:0,
                  bIntensity = b[options.linkIntensity]?b[options.linkIntensity]:0;
              if(bIntensity==aIntensity){
                if(a.y==i) return -1;
                if(b.y==i) return 1;
                return a.y-b.y;
              }else
                return bIntensity-aIntensity;
            }).map(function(p){ return p.y; })
        x.domain(order);

        var t = svg.transition().duration(2500);

        svg.selectAll("path.cluster").remove();

        t.selectAll(".column .label").attr("x",((options.heatmapTriangle?-1:1) * 6))

        t.selectAll(".row")
          .delay(function(d, i) { return x(i) * 4; })
          .attr("transform", function(d, i) { return "translate(0," + x(i) + ")"; })
         .selectAll(".cell")
          .delay(function(d) { return x(d.x) * 4; })
          .attr("x", function(d) { return x(d.x); });

        t.selectAll(".row .cellText")
          .delay(function(d) { return x(d.x) * 4; })
          .attr("x", function(d) { return x(d.x) + x.bandwidth()/2; });

        t.selectAll(".column")
          .delay(function(d, i) { return x(i) * 4; })
          .attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });
      })
      .on("mouseover", function(){
        d3.select(this).style("font-weight","bold");
      })
      .on("mouseout", mouseout)
      .transition()
      .duration(500)
      .style("opacity",1)
    }
  }

  function rowFunc(row) {
    d3.select(this).selectAll(".cell")
        .data(row.filter(function(d) { return d[options.linkIntensity]; }))
      .enter().append("rect")
        .attr("class", "cell")
        .attr("x", function(d) { return x(d.x); })
        .attr("width", x.bandwidth())
        .attr("height", x.bandwidth())
        .style("fill-opacity", getLinkIntensity)
        .style("fill", colorLinksScale?function(d) { return colorLinksScale(d.color); }:defaultColor)
        .on("mouseover", mouseover)
        .on("mouseout", mouseout)
        .on("click",click)
        .on("dblclick",dblclick)
    if(options.linkText){
      d3.select(this).selectAll(".cellText")
        .data(row.filter(function(d) { return d[options.linkIntensity]; }))
      .enter().append("text")
        .attr("class", "cellText")
        .attr("x", function(d) { return x(d.x) + x.bandwidth()/2; })
        .attr("y", x.bandwidth()/2)
        .attr("dy", ".32em")
        .attr("text-anchor", "middle")
        .style("font-size", x.bandwidth()*2/5 + "px")
        .on("mouseover", mouseover)
        .text(function(d){
            if(!isNaN(+d.txt))
              return d.txt.toFixed(1);
            return d.txt;
        })
    }
  }

  function mouseover(p) {
    d3.selectAll(".row .label").style("font-weight", function(d, i) {
      if(i == p.y) return "bold"; else return null;
    });
    d3.selectAll(".column .label").style("font-weight", function(d, i) {
      if(i == p.x) return "bold"; else return null;
    });
  }

  function mouseout() {
    d3.selectAll(".label").style("font-weight",null);
  }
  
  function click(p){
    links.forEach(function(l){ checkNeighbors(l,p); });
    nodes.forEach(function(n){
      n.selected = !n._hidden && n.__neighbor;
      delete n.__neighbor;
    });
    showTables();
  }

  function dblclick(p){
    d3.event.stopPropagation();
    links.forEach(function(l){ checkNeighbors(l,p); });
    nodes.forEach(function(n){
      n.selected = (checkSelectable(n) && (n.index == p.x || n.index == p.y))? true : false;
      delete n.__neighbor;
    });
    switchEgoNet();
  }

    function checkNeighbors(l,p){
      if(!l._hidden && !l._hideFrame && (((!options.showArrows || options.heatmapTriangle) && (l.target.index==p.x || l.target.index==p.y)) || (l.source.index==p.x || l.source.index==p.y))){
        l.source.__neighbor = l.target.__neighbor = true;
      }
    }

  }else{ // draw network

    svg.select("g.heatmap").remove();

    //hide sliders
    d3.select(".slider.charge").style("display",nodes.length<2?"none":null)
    d3.select(".slider.linkDistance").style("display",!links.length || options.linkWeight?"none":null)

    simulation.nodes(nodes)

    simulation.force("link")
      .links(links)
      .distance(getLinkDistance);

    simulation.on("tick", tick);

    update_forces();

    // update sidebar filters
    if(Controllers.nodeFilter){
      Controllers.nodeFilter.update();
    }
    if(Controllers.linkFilter){
      Controllers.linkFilter.update();
    }

    //axes
    if(!options.showCoordinates){
      var axes = svg.selectAll(".axis")
      .data([[0,1],[1,0]])
      .enter().append("line")
      .attr("class","axis")
      .attr("pointer-events","none")
      .style("opacity",0)

      var axesLabelsAnchors = ["start","middle","end","middle"],
          axesLabels = svg.selectAll(".axisLabel")
        .data(options.axesLabels)
      .enter().append("text")
      .attr("class","axisLabel")
      .attr("pointer-events","none")
      .style("opacity",0)
      .text(String)
      .attr("text-anchor",function(d,i){
        return axesLabelsAnchors[i];
      })

      if(!options.dynamicNodes){
        updateAxes();
      }
    }

    //groups
    var groups = getGroups(nodes);
  }

  // display legends
  if(options.showLegend){
    Legends = {};
    var data;

  if(options.nodeLegend){
    data = nodes.map(function(d){ return d[options.nodeLegend]; });
    if(dataType(nodes,options.nodeLegend) == 'object')
      data = data.reduce(function(a,b) { return a.concat(b); }, []);
    data = d3.set(data).values();
    Legends.legend = displayLegend()
      .key(options.nodeLegend)
      .data(data.sort(sortAsc));
  }

  if(!options.imageItem){
    if(options.nodeColor && dataType(nodes,options.nodeColor)!='number'){
      data = d3.map(nodes.filter(function(d){ return d[options.nodeColor]!==null; }), function(d){ return d[options.nodeColor]; }).keys();
      Legends.color = displayLegend()
        .key(options.nodeColor)
        .data(data.sort(sortAsc))
        .color(colorNodesScale);
    }

    if(options.nodeShape){
      data = d3.map(nodes, function(d){ return d[options.nodeShape]; }).keys();
      Legends.shape = displayLegend()
        .key(options.nodeShape)
        .data(data.sort(sortAsc))
        .shape(symbolList)
    }
  }

  if(!options.heatmap && options.imageItem){
    if(options.imageItems && options.imageNames){
      var title = options.imageNames[options.imageItems.indexOf(options.imageItem)],
      data = nodes.map(function(d){ return [d[title],d[options.imageItem]]; })
      data.sort(function(a,b){
          return sortAsc(a[0],b[0]);
      })
      var data2 = d3.map(data, function(d){ return d[0]; }).keys();
      data = d3.map(data, function(d){ return d[1]; }).keys()
      var textFunc = function(d,i){ return data2[i]; };
      if(data2.length!=data.length){
        title = options.imageItem;
        textFunc = getImageName;
      }
      Legends.image = displayLegend()
        .key(options.imageItem)
        .data(data)
        .title(title)
        .text(textFunc)
        .color("image")
    }
  }

    for(var k in Legends){
      gScale.call(Legends[k]);
    }
  } // end legends

  showTables();

  //render network
  function tick() {
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    if(frameControls.recorder){
      ctx.fillStyle = options.background ? options.background : "#ffffff";
      ctx.fillRect(0, 0, width, height);
      var text = frameControls.frames[frameControls.frame];
      if(options.main && Array.isArray(options.main))
        text = options.main[frameControls.frame];
      ctx.font = 10*options.cex+"px sans-serif";
      ctx.textAlign = "right";
      ctx.fillStyle = "#333";
      ctx.fillText(text,width-10,height-10);
    }

    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    // draw areas
    ctx.lineJoin = "round";
    if(options.nodeGroup){
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = 3;
      groups.forEach(function(group){
        ctx.strokeStyle = colorGroups(group);
        ctx.fillStyle = d3.rgb(ctx.strokeStyle).brighter(0.6);
        var points = getArea(group,nodes);
        ctx.beginPath();
        ctx.rect(points[0],points[1],points[2],points[3]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      })
    }

    // draw links
    links.forEach(function(link) {
      ctx.globalAlpha = link._back? 0.2 : 0.6;
      var points = getLinkCoords(link);
      if(!points)
        return;
      ctx.beginPath();
      ctx.lineWidth = getLinkWidth(link);
      ctx.strokeStyle = link._selected? "#F00" : (colorLinksScale ? colorLinks(link) : defaultLinkColor);
      ctx.moveTo(points[0][0], points[0][1]);
      if(link.linkNum)
        ctx.quadraticCurveTo(points[2][0], points[2][1], points[1][0], points[1][1]);
      else
        ctx.lineTo(points[1][0], points[1][1]);
      if(options.showArrows){
        var arrow;
        if(link.linkNum)
          arrow = getArrow(points[2][0], points[2][1], points[1][0], points[1][1], ctx.lineWidth);
        else
          arrow = getArrow(points[0][0], points[0][1], points[1][0], points[1][1], ctx.lineWidth);
        ctx.lineTo(arrow[2][0], arrow[2][1]);
        ctx.lineTo(arrow[0][0], arrow[0][1]);
        ctx.lineTo(points[1][0], points[1][1]);
      }
      ctx.stroke();
    });

    ctx.lineJoin = "miter";
    ctx.globalAlpha = 1;

    if(options.linkText){
      ctx.fillStyle = "#999";
      ctx.beginPath();
      ctx.font = 10*options.cex+"px sans-serif";
      links.forEach(function(link) {
        var coords = getLinkTextCoords(link);

        ctx.textAlign = "left";
        if(link.linkNum && link.linkNum%2==0)
          ctx.textAlign = "right";

        ctx.fillText(formatter(link[options.linkText]), coords[0], coords[1]);
      });
      ctx.fill();
    }

    // draw nodes
    nodes.forEach(function(node) {
      var nodeSize = checkNodeBigger(node);
      ctx.globalAlpha = node._back? 0.2 : 1;
      ctx.lineWidth = node.selected || node._selected ? 2 : 1;
      var strokeStyle = node._selected ? "#F00" : (node.selected ? "#FF0" : false);
      ctx.strokeStyle = strokeStyle;
      ctx.translate(node.x, node.y);
      if(options.imageItem){
        var img = images[node[options.imageItem]],
            imgHeight = img.height*2/img.width;
        try{
          ctx.drawImage(img, -nodeSize, -(imgHeight/2)*nodeSize, nodeSize * 2, nodeSize * imgHeight);
        }catch(e){}
        if(strokeStyle){
          ctx.beginPath();
          ctx.arc(0, 0, nodeSize, 0, 2 * Math.PI);
          ctx.closePath();
          ctx.stroke();
        }
      }else{
        ctx.fillStyle = colorNodesScale?colorNodes(node):defaultColor;
        if(!strokeStyle)
          ctx.strokeStyle = d3.rgb(ctx.fillStyle).darker(1);
        ctx.beginPath();
        d3.symbol().type(getShape(node)).size(nodeSize * nodeSize * Math.PI).context(ctx)();
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.translate(-node.x, -node.y);
    });

    // write labels
    if(options.nodeLabel){
      ctx.textAlign = "left";
      ctx.fillStyle = "#444";
      ctx.beginPath();
      ctx.font = 10*options.cex+"px sans-serif";
      nodes.forEach(function(node) {
        var fontSize = node._bigger ? 10/transform.k : 0;
        ctx.globalAlpha = node._back? 0.2 : 1;
        if(options.nodeLabelSize){
          if(node[options.nodeLabelSize]<0)
            return;
          fontSize = node.nodeLabelSize+fontSize;
        }else{
          fontSize = 10+fontSize;
        }
        ctx.font = fontSize*options.cex+"px sans-serif";
        ctx.fillText(node[options.nodeLabel], node.x + checkNodeBigger(node) + 4, node.y + 4);
      });
      ctx.fill();
    }
    ctx.restore();

    function checkNodeBigger(node){
      return node._bigger ? node.nodeSize + 10/transform.k : node.nodeSize;
    }

    if(options.nodeText){
      plot.selectAll("div.tooltip")
        .style("top",function(node){ return (transform.applyY(node.y)+findNodeRadius-10)+"px"; })
        .style("left",function(node){ return (transform.applyX(node.x)+findNodeRadius-10)+"px"; })
    }
  }

  // generate pdf
  svg2pdf = function(){

    var doc = new jsPDF({
      orientation: (width>height)?"l":"p",
      unit: 'pt',
      format: [width,height]
    });

    doc.polygon = pdfPolygon;

    var translate = [transform.x,transform.y],
        scale = transform.k;

    doc.setLineWidth(scale);

    if(options.heatmap){ // heatmap display
      doc.setDrawColor(255);
      doc.setFillColor(238,238,238);
      var size = parseInt(d3.select("g.heatmap>rect").attr("width")) * scale,
          dim = parseInt(d3.select("g.heatmap rect.cell").attr("width")) * scale;
      for(i=0;i<size/dim;i++){
        for(j=0;j<size/dim;j++){
          doc.rect(((i*dim)+translate[0]),((j*dim)+translate[1]), dim, dim, 'FD');
        }
      }

      d3.selectAll("g.heatmap rect.cell").each(function(){
        var self = d3.select(this),
            x = (+self.attr("x")*scale) + translate[0],
            y = (getTranslation(d3.select(this.parentNode).attr("transform"))[1]*scale) + translate[1],
            o = self.style("fill-opacity"),
            color = d3.rgb(self.style("fill"));
        color = applyOpacity(color,o,{r:238,g:238,b:238});
        doc.setFillColor(color.r,color.g,color.b);
        doc.rect(x, y, dim, dim, 'FD');
      });

      doc.setTextColor(64);
      d3.selectAll("g.heatmap .row text").each(function(){
        var self = d3.select(this),
            y = (getTranslation(d3.select(this.parentNode).attr("transform"))[1]*scale) + translate[1],
            txt = self.text(),
            x = translate[0],
            fontSize = parseInt(self.style("font-size"))*scale;
        doc.setFontSize(fontSize);
        doc.text(x-6, y+fontSize, txt, { align: "right" });
      });
      d3.selectAll("g.heatmap .column text").each(function(){
        var self = d3.select(this),
            x = (getTranslation(d3.select(this.parentNode).attr("transform"))[0]*scale) + translate[0],
            txt = self.text(),
            y = translate[1],
            fontSize = parseInt(self.style("font-size"))*scale;
        doc.setFontSize(fontSize);
        doc.text(x+fontSize, y-6, txt, null, 90);
      });

    }else{ // network display
      var areas = [];
      groups.forEach(function(group){
        var d = {},
            color = colorGroups(group),
            points = getArea(group,nodes);
        d.colorf = applyOpacity(d3.rgb(color).brighter(0.6),0.2);
        d.colord = applyOpacity(d3.rgb(color),0.2);
        d.x = (points[0]*scale)+translate[0];
        d.y = (points[1]*scale)+translate[1];
        d.width = points[2]*scale;
        d.height = points[3]*scale;
        areas.push(d);
      });
      areas.sort(function(a,b){
        var areaA = a.width * a.height,
            areaB = b.width * b.height;
        if (areaA < areaB) {
          return 1;
        }
        if (areaA > areaB) {
          return -1;
        }
        return 0;
      });
      areas.forEach(function(d){
        doc.setFillColor(d.colorf.r,d.colorf.g,d.colorf.b);
        doc.setDrawColor(d.colord.r,d.colord.g,d.colord.b);
        doc.roundedRect(d.x,d.y,d.width,d.height,10,10,"FD");
      });

      links.forEach(function(link){
        var color = applyOpacity(d3.rgb(colorLinksScale ? colorLinks(link) : defaultLinkColor),0.6),
            w = getLinkWidth(link)*scale,
            points = getLinkCoords(link);

        if(!points)
          return;

        var x1 = (points[0][0]*scale)+translate[0],
            y1 = (points[0][1]*scale)+translate[1],
            x2 = (points[1][0]*scale)+translate[0],
            y2 = (points[1][1]*scale)+translate[1];

        doc.setDrawColor(color.r,color.g,color.b);
        doc.setLineWidth(w);
        if(link.linkNum){
          var cpx = (points[2][0]*scale)+translate[0]-x1,
              cpy = (points[2][1]*scale)+translate[1]-y1;
          doc.lines([[cpx,cpy,cpx,cpy,x2-x1,y2-y1]],x1,y1);
        }else
          doc.line(x1, y1, x2, y2);

        if(options.showArrows){
          var arrow;
          if(link.linkNum)
            arrow = getArrow(cpx+x1, cpy+y1, x2, y2, w);
          else
            arrow = getArrow(x1, y1, x2, y2, w);
          doc.line(x2, y2, arrow[2][0], arrow[2][1]);
          doc.line(arrow[2][0], arrow[2][1], arrow[0][0], arrow[0][1]);
          doc.line(arrow[0][0], arrow[0][1], x2, y2);
        }
      });

      if(options.linkText){
        doc.setFontSize(10*options.cex*scale);
        doc.setTextColor("#999");
        links.forEach(function(link){
          var coords = getLinkTextCoords(link),
              x = (coords[0]*scale)+translate[0],
              y = (coords[1]*scale)+translate[1],
              t = String(formatter(link[options.linkText])),
              tAlign = "left";
          if(link.linkNum && link.linkNum%2==0)
            tAlign = "right";
          doc.text(x, y, t, { align: tAlign });
        });
      }

      nodes.forEach(function(node){
        var color = d3.rgb(colorNodesScale?colorNodes(node):defaultColor),
            sColor = d3.rgb(node.selected ? "#FF0" : d3.rgb(color).darker(1)),
            size = node.nodeSize*scale,
            x = (node.x*scale)+translate[0],
            y = (node.y*scale)+translate[1];
        doc.setLineWidth((node.selected ? 2 : 1)*scale);
        doc.setDrawColor(sColor.r,sColor.g,sColor.b);
        doc.setFillColor(color.r,color.g,color.b);
        if(options.imageItem){
          var imgSrc = node[options.imageItem];
          if(images64[imgSrc]){
            var imgHeight = images[imgSrc].height*2/images[imgSrc].width;
            doc.addImage(images64[imgSrc], 'PNG', x-size, y-(imgHeight/2)*size, 2*size, imgHeight*size);
            if(node.selected){
              doc.circle(x, y, size);
            }
          }
        }else{
          var points = d3.symbol().type(getShape(node))();
          doc.polygon(points, x, y, [size/4.514,size/4.514], 'FD');
        }
      });

      if(options.nodeLabel){
        doc.setFontSize(10*options.cex*scale);
        doc.setTextColor("#444");
        nodes.forEach(function(node){
          var x = ((node.x + node.nodeSize + 8)*scale)+translate[0],
              y = ((node.y + 4)*scale)+translate[1],
              txt = String(node[options.nodeLabel]);
          doc.setFontSize(node.nodeLabelSize*scale);
          doc.text(x, y, txt);
        });
      }
    }

    doc.setTextColor("#333");

    d3.selectAll("div.main").each(function(){
      doc.setFontSize(parseInt(d3.select(this).style("font-size")));
      doc.setFontType("bold");
      doc.text(12, 28, this.textContent);
    })

    doc.setFontType("normal");

    d3.selectAll("div.note").each(function(){
      doc.setFontSize(parseInt(d3.select(this).style("font-size")));
      doc.text(12, height-12, this.textContent);
    })

    var gScale = d3.select(".scale");
    if(gScale.style("opacity")!=0){
      // scale
      if(!gScale.select(".scale>rect").empty()) {
          var colors = colorScales[d3.select(".scale rect").attr("fill").replace(/(url\()|(\))/g, "").replace("#","")];
          var canvas = document.createElement("canvas");
          canvas.width = 300;
          canvas.height = 10;
          var ctx = canvas.getContext("2d");
          var grd = ctx.createLinearGradient(0,0,300,0);
          grd.addColorStop(0,colors[0]);
          grd.addColorStop(0.5,colors[1]);
          grd.addColorStop(1,colors[2]);
          ctx.fillStyle = grd;
          ctx.fillRect(0,0,300,10);
          var uri = canvas.toDataURL();
          doc.addImage(uri, 'PNG', (width-320), 40, 300, 10);
          gScale.selectAll(".scale>text").each(function(){
            var self = d3.select(this),
                x = +(self.attr("x"))+(width-20),
                y = +(self.attr("y"))+20,
                t = self.text();

            doc.setFontSize(parseInt(self.style("font-size")));
            doc.text(x, y, t, { align: "center" });
          });
      }

      // legend
      if(!gScale.select(".legend").empty()) {
        legendControls = false;
        drawNet();
        gScale.selectAll(".legend").each(function(){
          var sel = d3.select(this),
              y = getTranslation(sel.attr("transform"))[1]+10,
              fontSize = parseInt(sel.select(".title").style("font-size")),
              t = sel.select(".title").text();
          doc.setFontSize(fontSize);
          doc.text(width-60, y+10, t, { align: "right" });
          fontSize = parseInt(sel.selectAll("g>text").style("font-size"));
          doc.setFontSize(fontSize);
          doc.setDrawColor(170, 170, 170);
          sel.selectAll(".legend-separator").each(function(){
            var self = d3.select(this),
                x1 = width-60 + (+self.attr("x2")),
                y1 = +self.attr("y1")+y,
                x2 = width-60 + (+self.attr("x1")),
                y2 = +self.attr("y2")+y;

            doc.line(x1, y1, x2, y2);
          })
          sel.selectAll("g.legend-item").each(function(d,i){
            var el = d3.select(this),
                gy = getTranslation(el.attr("transform"))[1],
                x = width-60,
                t = el.select("text").text();
            if(el.select("image").empty()){
              var color = d3.rgb(el.select("path").style("fill")),
                  d = el.select("path").attr("d");
              doc.setFillColor(color.r,color.g,color.b);
              doc.polygon(d,x,y+gy,[1,1],"F");
            }else{
              var imgSrc = el.select("image").attr("href");
              if(images64[imgSrc]){
                var imgHeight = images[imgSrc].height*10/images[imgSrc].width;
                doc.addImage(images64[imgSrc], 'PNG', x, y+gy-4, 10, imgHeight);
              }
            }
            doc.text(x-10, y+gy+4, t, { align: "right" });
          });
        })
        legendControls = true;
        drawNet();
      }
    }

    // axes
    doc.setLineWidth(scale);
    doc.setDrawColor(170, 170, 170);
    doc.setTextColor(170, 170, 170);
    d3.selectAll(".net .axis").each(function(){
      var self = d3.select(this);
      if(self.style("opacity")=="1"){
        var x1 = (+self.attr("x1")*scale)+translate[0],
            y1 = (+self.attr("y1")*scale)+translate[1],
            x2 = (+self.attr("x2")*scale)+translate[0],
            y2 = (+self.attr("y2")*scale)+translate[1];

        doc.line(x1, y1, x2, y2);
      }
    })
    d3.selectAll(".net .axisLabel").each(function(){
      var self = d3.select(this);
      if(self.style("opacity")=="1"){
        var x = (+self.attr("x")*scale)+translate[0],
            y = (+self.attr("y")*scale)+translate[1],
            anchors = {"start":"left","middle":"center","end":"right"},
            tAlign = anchors[self.attr("text-anchor")];

        doc.text(x, y, self.text(), { align: tAlign });
      }
    })

    doc.save(d3.select("head>title").text()+".pdf");
  } // end pdf function
}

function showTooltip(node,fixed){
    if(options.nodeText && node[options.nodeText] && plot.select("div.tooltip").filter(function(d){ return node[options.nodeName]==d[options.nodeName]; }).empty()){
        plot.append("div")
             .attr("class","tooltip"+(fixed?" fixed":""))
             .datum(node)
             .html(node[options.nodeText])
    }
}

function findNode(){
  return simulation.find(transform.invertX(d3.mouse(d3.event.target)[0]), transform.invertY(d3.mouse(d3.event.target)[1]), findNodeRadius);
}

function clickNet(){
  var node = findNode();
  if(options.nodeText){
    plot.selectAll("div.tooltip").remove();
  }
  if(node){
    if(d3.event.ctrlKey || d3.event.metaKey){
      node.selected = !node.selected;
    }else{
      Graph.nodes.forEach(function(n){
        n.selected = false;
      });
      node.selected = true;
    }
    if(options.nodeText){
      showTooltip(node,true);
    }
    if(options.nodeInfo){
      displayInfoPanel(node[options.nodeInfo]);
    }
  }else{
    Graph.nodes.forEach(function(n){
      n.selected = false;
    });
  }
  showTables();
}

function dblClickNet(){
  var node = findNode();
  if(node){
    if(Graph.tree && (d3.event.ctrlKey || d3.event.metaKey)){
      node.selected = true;
      treeAction();
    }else{
      switchEgoNet();
    }
  }else{
    applyInitialFilter();
  }
}

var someBigger = false;
function hoverNet(){
  var node = findNode();
  if(someBigger){
    Graph.nodes.forEach(function(node){
      delete node._bigger;
    })
    someBigger = false;
    simulation.restart();
  }
  if(options.nodeText){
    plot.selectAll("div.tooltip:not(.fixed)").remove();
  }
  if(node){
    someBigger = true;
    node._bigger = true;
    simulation.restart();
    d3.select(this).style("cursor","pointer");
    if(options.nodeText && plot.select("div.tooltip.fixed").empty())
      showTooltip(node);
  }else{
    d3.select(this).style("cursor","grab");
  }
}

function dragsubject() {
  var node = simulation.find(transform.invertX(d3.event.x), transform.invertY(d3.event.y), findNodeRadius);
  if(node){
    node.position = [node.x,node.y];
    node.x = transform.applyX(node.x);
    node.y = transform.applyY(node.y);
  }
  return node;
}

function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  var node = d3.event.subject;
  if(typeof node.fx == 'number' || typeof node.fy == 'number')
    node.fixed = true;
  node.fx = transform.invertX(node.x);
  node.fy = transform.invertY(node.y);
}

function dragged(d) {
    d3.event.subject.fx = transform.invertX(d3.event.x);
    d3.event.subject.fy = transform.invertY(d3.event.y);
}

function dragged_constructural(d) {
    var node = d3.event.subject;
    if(node.type=="parent"){
      var dx = node.fx,
          dy = node.fy;
    }
    node.fx = transform.invertX(d3.event.x);
    node.fy = transform.invertY(d3.event.y);
    if(node.type=="parent"){
      dx = node.fx-dx;
      dy = node.fy-dy;
      Graph.links.filter(function(link){ return link.Source==node[options.nodeName] && link.Constructural })
        .forEach(function(link){
          link.target.fx = link.target.fx + dx;
          link.target.fy = link.target.fy + dy;
        })
    }
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  var node = d3.event.subject;

  if(node.position[0].toFixed(3)==node.fx.toFixed(3) && node.position[1].toFixed(3)==node.fy.toFixed(3)){
    // only click (not dragging)
    node.fx = node.x = node.position[0];
    node.fy = node.y = node.position[1];
  }
  delete node.position;

  if (options.dynamicNodes && !node.fixed) {
    node.fx = null;
    node.fy = null;
  }
  if(node.fixed)
    delete node.fixed;

  d3.select(this).style("cursor","grab");
}

function getGroups(nodes){
    var groups = [];
    if(options.nodeGroup){
      groups = d3.map(nodes.filter(function(node){ return node[options.nodeGroup] !== null; }), function(node){ return node[options.nodeGroup]; }).keys()
      .map(function(g){
        var group = {};
        group[options.nodeGroup] = g;
        group.xExt = [0,0];
        group.yExt = [0,0];
        return group;
      });
    }
    return groups;
}

function getArea(group,nodes){
    var points = nodes.filter(function(node){ return node[options.nodeGroup]==group[options.nodeGroup]; }).map(function(node){ return [node.x,node.y]; }),
        xExt = d3.extent(points,function(point){ return point[0];}),
        yExt = d3.extent(points,function(point){ return point[1];});
    return [xExt[0]-3,yExt[0]-3,xExt[1]-xExt[0]+6,yExt[1]-yExt[0]+6];
}

function getLinkCoords(link){
      var sx = link.source.x,
          sy = link.source.y,
          tx = link.target.x,
          ty = link.target.y,
          offSetX,
          offSetY;

      if(sx==tx && sy==ty)
        return 0;

      if(options.showArrows || link.linkNum){
        var dx = tx - sx,
            dy = ty - sy;

        var dr = Math.sqrt((dx * dx) + (dy * dy));

        if(options.showArrows){
          var radius = (link.target.nodeSize),
              offsetX = (dx * radius) / dr,
              offsetY = (dy * radius) / dr;

          tx = tx - offsetX;
          ty = ty - offsetY;
        }

        if(link.linkNum){
          var offset = (Math.ceil(link.linkNum/2))*10;

          var midpoint_x = (sx + tx) / 2,
              midpoint_y = (sy + ty) / 2;

          var offSetX = offset*(dy/dr),
              offSetY = offset*(dx/dr);

          if(link.linkNum%2 ^ (link.Target<link.Source)){
            offSetX = midpoint_x + offSetX;
            offSetY = midpoint_y - offSetY;
          }else{
            offSetX = midpoint_x - offSetX;
            offSetY = midpoint_y + offSetY;
          }
        }
      }

      return [[sx,sy],[tx,ty],[offSetX,offSetY]];
}

function getArrow(x1,y1,x2,y2,w){
    var w = w ? Math.log(w+1)/Math.log(10) : 1;
    var dx = x2-x1,
        dy = y2-y1,
        dr = Math.sqrt(dx*dx+dy*dy),
        tx = dx/dr*8,
        ty = dy/dr*8,
        x3 = x2-(ty/2*w)-tx,
        y3 = y2+(tx/2*w)-ty,
        x4 = x2+(ty/2*w)-tx,
        y4 = y2-(tx/2*w)-ty;
    return [[x4,y4],[x2,y2],[x3,y3]];
}

function getLinkTextCoords(link){
        var x = ((link.target.x)+(link.source.x))/2,
            y = ((link.target.y)+(link.source.y))/2;

        if(link.linkNum){
          x = x + (link.linkNum%2==0? -1 : 1) * (Math.ceil(link.linkNum/2)*6);
          y = y + (Math.floor(link.linkNum/2)%2==0? -1 : 1) * ((6*Math.ceil(link.linkNum/2))-3);
        }

        return [x,y];
}

function forceEnd(){
  if(options.dynamicNodes && !options.showCoordinates){
    updateAxes();
  }
}

function updateAxes(){
    var nodes = simulation.nodes();

    if(nodes.length>1){
      var extX = d3.extent(nodes, function(d){ return d.x; }),
          extY = d3.extent(nodes, function(d){ return d.y; });
      var size = d3.max([extX[1],extX[0],extY[1],extY[0]].map(function(d){ return Math.abs(d); }));
      size = size*2 + axisExtension;
    }else{
      var size = Math.min(width,height)-axisExtension;
    }

    d3.selectAll(".net .axis")
        .attr("x1",function(d){ return -(d[0]*size/2); })
        .attr("y1",function(d){ return -(d[1]*size/2); })
        .attr("x2",function(d){ return (d[0]*size/2); })
        .attr("y2",function(d){ return (d[1]*size/2); })
        .style("opacity",+options.showAxes)

    d3.selectAll(".net .axisLabel")
      .style("opacity",+options.showAxes)
      .attr("x",function(d,i){
        switch(i){
          case 1:
            return 0;
          case 2:
            return (-size-4)/2;
          case 3:
            return 0;
          default:
            return size/2;
        }
      })
      .attr("y",function(d,i){
        switch(i){
          case 1:
            return (-size-4)/2;
          case 2:
            return 4*options.cex;
          case 3:
            return size/2 + 8*options.cex;
          default:
            return 4*options.cex;
        }
      })
}

function setColorScale(data,item,itemAttr){
    if(options[itemAttr]){
      var scale;
      if(dataType(data,options[itemAttr]) == "number"){
        var colorDomain = d3.extent(data.filter(function(d){ return d !== null; }), function(d) { return d[options[itemAttr]]; }),
            nameScale = options["colorScale"+itemAttr];
        if(options[item+"Bipolar"]){
          var absmax = Math.max(Math.abs(colorDomain[0]),Math.abs(colorDomain[1]));
          colorDomain = [-absmax,+absmax];
        }
        if(!options.imageItem && ((itemAttr=="nodeColor" && !options.heatmap) || (itemAttr=="linkColor" && options.heatmap)))
          displayScale(colorDomain, "url(#"+nameScale+")", options[itemAttr]);
        scale = d3.scaleLinear().range(colorScales[nameScale])
          .domain([colorDomain[0],d3.mean(colorDomain),colorDomain[1]]);
      }else{
        scale = d3.scaleOrdinal().range(categoryColors)
          .domain(d3.map(data.filter(function(d){ return d[options[itemAttr]] !== null; }), function(d){ return d[options[itemAttr]]; }).keys());
      }
      return function(d){
               return (d === null)? (item == "node"? "#ffffff" : "#000000") : scale(d);
             };
    }else{
      return false;
    }
  }

function getNumAttr(data,itemAttr,range,def){
    if(options[itemAttr]){
      if(data.length){
        if(dataType(data,options[itemAttr]) == "number"){
          var item = itemAttr.slice(0,4),
              attrDomain;
          if(options[item+"Bipolar"])
            attrDomain = [0,d3.max(data, function(d) { return Math.abs(d[options[itemAttr]]); })];
          else
            attrDomain = d3.extent(data, function(d) { return +d[options[itemAttr]]; });
          if(attrDomain[0]!=attrDomain[1]){
            var scaleAttr = d3.scaleLinear()
              .range(range)
              .domain(attrDomain);

            return function(d){
              if(d[options[itemAttr]] === null && (itemAttr == 'linkWidth' || itemAttr == 'linkIntensity'))
                return 0;
              if(options[item+"Bipolar"]){
                return scaleAttr(Math.abs(d[options[itemAttr]]));
              }else{
                if(d[options[itemAttr]] === null && attrDomain[0]<0)
                  return range[0];
                return scaleAttr(+d[options[itemAttr]]);
              }
            }
          }
        }
      }
    }
    return function(){ return def; }
}

function addGradient(defs,id, stops){
  var offset = 100/(stops.length-1);
  var gradient = defs.append("linearGradient")
    .attr("id",id)
    .attr("x1","0%")
    .attr("y1","0%")
    .attr("x2","100%")
    .attr("y2","0%");

  stops.forEach(function(d, i){
    gradient
    .append("stop")
    .attr("offset",(offset*i)+"%")
    .style("stop-color",d);
  });
}

function displayInfoPanel(info){

  var div = body.select("div.infopanel"),
      prevPanel = !div.empty();

  if(info){
    div.remove();
    if(!infoLeft){
      infoLeft = docSize.width * 2/3;
    }
    div = body.append("div")
          .attr("class","infopanel");
    var infoHeight = (options.showTables ? 10 + computeHeight() + (options.showButtons2 ? panel.select(".tables > .selectButton").node().offsetHeight : 0) : docSize.height - 10)
      - parseInt(div.style("top"))
      - parseInt(div.style("padding-top"))
      - parseInt(div.style("padding-bottom"));
    div.style("height",infoHeight+"px");
    div.style("left",docSize.width+"px").transition().duration(prevPanel?0:500)
      .style("left",infoLeft+"px")
    div.append("div")
      .attr("class","drag")
      .call(d3.drag()
        .on("start", function() {
          contentDiv.style("display","none");
        })
        .on("drag", function() {
          var left = d3.mouse(body.node())[0]-parseInt(div.style("border-left-width"));
          if(left>(docSize.width*2/4) && left<(docSize.width*3/4)){
            infoLeft = left;
            div.style("left",infoLeft+"px");
          }
        })
        .on("end", function() {
          contentDiv.style("display",null);
        })
      )
    div.append("div")
          .attr("class","close-button")
          .html("&#x2716;")
          .on("click", function(){
            div.transition().duration(500)
              .style("left",docSize.width+"px")
              .on("end",function(){
                div.remove();
              })
          });
    var contentDiv = div.append("div").html(info);
  }else{
    div.select("div.infopanel > div.close-button").dispatch("click");
  }
}

function selectAllNodes(){
  if(Graph.nodes.filter(function(d){ return !d.selected && checkSelectable(d); }).length){
    Graph.nodes.forEach(function(d){
      if(checkSelectable(d))
        d.selected = true;
    });
  }else{
    Graph.nodes.forEach(function(d){
      delete d.selected;
    });
  }
  showTables();
}

function filterSelection(){
    Graph.nodes.forEach(function(d){
      if(!d.selected)
        d._hidden = true;
    });
    drawNet();
}

function showHidden(){
  if(Controllers.nodeFilter){
    Controllers.nodeFilter.cleanFilterTags();
  }
  if(Controllers.linkFilter){
    Controllers.linkFilter.cleanFilterTags();
  }
  egoNet = false;
  Graph.nodes.forEach(function(d){
    delete d._hidden;
    delete d._neighbor;
  });
  Graph.links.forEach(function(d){
    delete d._hidden;
  });
  drawNet();
}

function addNeighbors(){
    Graph.links.forEach(function(d){
      if(checkSelectableLink(d))
        if(d.source.selected || d.target.selected)
          d.source.__neighbor = d.target.__neighbor = true;
    });
    Graph.nodes.forEach(function(d){
      d.selected = checkSelectable(d) && d.__neighbor;
      delete d.__neighbor;
    });
    showTables();
}

function switchEgoNet(){
    egoNet = true;
    Graph.nodes.forEach(function(d){
      if(d.selected){
        d._neighbor = true;
      }else{
        delete d._neighbor;
      }
    });
    Graph.links.forEach(function(d){
      if(!d._hidden && !d._hideFrame)
        if(d.source.selected || d.target.selected)
          d.target._neighbor = d.source._neighbor = true;
    });
    drawNet();
}

function checkSelectable(node){
  var selectable = !node._hidden && !node._hideFrame;
  if(egoNet)
    selectable = selectable && node._neighbor;
  return selectable;
}

function checkSelectableLink(link){
  var selectable = !link._hidden && !link.target._hidden && !link.source._hidden && !link._hideFrame;
  if(egoNet)
    selectable = selectable && ((link.source.select || link.source._neighbor) && (link.target.select || link.target._neighbor));
  return selectable;
}

function treeAction(){
  if(!selectedNodesLength()){
      Graph.nodes.forEach(function(d){
        if(checkSelectable(d))
          d.selected = true;
      });
  }

  Graph.nodes.filter(function(d){
      return d.selected;
  }).forEach(function(d){
    if(d.childNodes.length){
        d.childNodes.forEach(function(c){
          c.selected = true;
          delete c._hidden;
        });
        d._hidden = true;
        delete d.selected;
    }else{
        return2roots(d);
    }
  });

  if(egoNet){
      switchEgoNet();
  }else{
      drawNet();
  }

  function return2roots(d){
    if(d.parentNode){
      delete d.selected;
      return2roots(d.parentNode);
    }else{
      d.selected = true;
      delete d._hidden;
    }
  }
}

function stopResumeNet(){
  if(options.dynamicNodes){
    Graph.nodes.forEach(function(node){
        delete node.fx;
        delete node.fy;
    });
    if(backupNodes){
      backupNodes.forEach(function(node){
        delete node.fx;
        delete node.fy;
      });
    }
    update_forces();
  }else{
    Graph.nodes.forEach(function(node){
        node.fx = node.x ? node.x : 0;
        node.fy = node.y ? node.y : 0;
    });
    simulation.stop();
  }
  d3.selectAll(".slider.charge, .slider.linkDistance")
      .style("opacity",options.dynamicNodes ? 1 : 0);
}

function clickHide(items, show, callback) {
    items.transition()
      .duration(500)
      .style("opacity", +show)
      .on("end",callback ? callback : null)
}

function displayLegend(){
  var parent,
      legend,
      key,
      title,
      text = stripTags,
      color = "#000000",
      shape = defaultShape,
      data = [],
      y = 0,
      defCheckOffset = 26,
      checkOffset = 0,
      legendWidth = 120;

  function exports(sel){

    if(!data.length)
      return 0;

    parent = d3.select(sel.node().parentNode);
    parent.selectAll(".legend-bottom-button").remove();
    y = sel.node().getBBox().height;
    if(y!=0)
      y = y + 40*options.cex;
    else
      y = y + 20*options.cex;

    if(data.length > (height-y-100)/(30*options.cex))
      return 0;

    checkOffset = (data.length==1 || !legendControls) ? 0 : defCheckOffset;

    legend = sel.append("g")
    .attr("class","legend")
    .attr("transform", "translate(0,"+y+")")
    .property("key",key)

    y = 5*options.cex;
    var textTitle = legend.append("text")
    .attr("class","title")
    .attr("x", 0)
    .attr("y", y)
    .text(typeof title == "undefined" ? key : title)

    if(legendControls && parent.select(".goback").empty() && (!checkInitialFilters() || egoNet)){
      var lineApart = textTitle.node().getBBox().width>=legendWidth;
      if(lineApart){
        y = 25*options.cex;
      }
      legend.append("text")
        .attr("class","goback")
        .attr("x",-legendWidth)
        .attr("y",y)
        .style("text-anchor",lineApart ? "start" : "end")
        .style("fill",UIcolor)
        .style("cursor","pointer")
        .on("click",applyInitialFilter)
        .text("‹ "+texts.goback)
        .append("title")
          .text("ctrl + i")
    }
    y = y + 10*options.cex;

    if(checkOffset && parent.select(".legend-selectall").empty()){
      var gSelectAll = legend.append("g")
      .attr("class","legend-selectall")
      .attr("transform", "translate(0,"+y+")");
      gSelectAll.append("text")
      .attr("x", -20)
      .attr("y", 10*options.cex)
      .style("text-anchor", "end")
      .text(texts.selectall)
      displaycheck(gSelectAll,0);

      y = y + 18*options.cex;
    }
    displaySeparator(legend,y);

    var g = legend.selectAll("g.legend-item")
      .data(data)
    .enter().append("g")
      .attr("class","legend-item")
      .attr("transform", function(d, i){
        y = y + 20*options.cex;
        return "translate(0," + y + ")";
      });

    if(color == "image"){
      g.append("image")
        .attr("xlink:href", String)
        .attr("x",-checkOffset-6)
        .attr("y",-8)
        .attr("width",16)
        .attr("height",16)
    }else{
      g.append("path")
      .attr("transform", "translate(-"+checkOffset+",0)")
      .attr("d", d3.symbol().type(typeof shape=="function" ? function(d){ return d3["symbol"+shape(d)]; } : d3["symbol"+shape]))
      .style("fill", color)
    }

    g.append("text")
      .attr("x", -checkOffset-10)
      .attr("y", 4*options.cex)
      .style("text-anchor", "end")
      .text(text)

    if(checkOffset){
      displaycheck(g,-5,true);

      y = y + 20*options.cex;
      displaySeparator(legend,y);

      y = y + 10*options.cex;

      displayBottomButton(legend,1,y,"egonet","ctrl + e",switchEgoNet);
      displayBottomButton(legend,2,y,"filter","ctrl + f",filterSelection);
    }

    sel.transition()
      .duration(500)
      .style("opacity",+options.showLegend);

  }

  function displaySeparator(sel,y){
    sel.append("line")
    .attr("class","legend-separator")
    .attr("x1",0)
    .attr("y1",y)
    .attr("x2",-legendWidth)
    .attr("y2",y)
  }

  // render checkbox
  function displaycheck(sel,y,item){

    if(item)
      sel.property("item",true);

    sel.append("rect")
    .attr("x",-105)
    .attr("y",y-5)
    .attr("width",110)
    .attr("height",20)
    .attr("pointer-events","all")
    .style("fill","none")

    sel.append("rect")
    .attr("class","legend-check-box")
    .attr("x",-10)
    .attr("y",y)
    .attr("width",10)
    .attr("height",10)
    .attr("rx",2)

    sel.style("cursor","pointer")
    .on("click",function(){
      var value = String(d3.select(this).datum()),
          selected = this.selected = !this.selected;
      if(!this.item){
        // select all/none nodes
        Graph.nodes.forEach(function(d){
            if(selected && checkSelectable(d)){
              d.selected = true;
            }else{
              delete d.selected;
            }
        });
      }else{
        // select especific nodes
        Graph.nodes.forEach(function(d){
          if(d[key] && (String(d[key])==value || (typeof d[key] == "object" && (d[key].indexOf(value)!=-1 || d[key].join(",")==value)))){
            if(selected && checkSelectable(d)){
              d.selected = true;
            }else{
              delete d.selected;
            }
          }
        });
      }
      showTables();
    })

    sel.append("path")
      .attr("class","legend-check-path")
      .attr("transform","translate("+(-10)+","+y+")")
      .attr("d",item ? "M1,3L4,6L9,1L10,2L4,8L0,4Z" : "M2,4L8,4L8,6L2,6z")
  }

  function displayBottomButton(sel,x,y,text,tooltip,callback){
      var w = 50;
      x = -w*x;
      var g = sel.append("g")
      .attr("class","legend-bottom-button "+text)
      .attr("transform","translate("+x+","+y+")")
      g.append("rect")
      .attr("x",3)
      .attr("y",0)
      .attr("width",w-6)
      .attr("height",15)
      .attr("rx",2)
      .on("click",callback)
      .append("title")
        .text(tooltip)
      g.append("text")
      .attr("x",w/2)
      .attr("y",10)
      .text(texts[text])
  }

  exports.key = function(x) {
      if (!arguments.length) return key;
      key = x;
      return exports;
  };

  exports.data = function(x) {
      if (!arguments.length) return data;
      data = x;
      return exports;
  };

  exports.title = function(x) {
      if (!arguments.length) return title;
      title = x;
      return exports;
  };

  exports.text = function(x) {
      if (!arguments.length) return text;
      text = x;
      return exports;
  };

  exports.color = function(x) {
      if (!arguments.length) return color;
      color = x;
      return exports;
  };

  exports.shape = function(x) {
      if (!arguments.length) return shape;
      shape = x;
      return exports;
  };

  return exports;
}

function getImageName(path){
  var name = path.split("/");
  name = name.pop().split(".");
  name.pop();
  return name.join(".");
}

function stripTags(text){
  text = String(text);
  if(text=="null"){
    return "NA";
  }
  return text.replace(/(<([^>]+)>)/ig,"");
}

function displayScale(domain, fill, title){
    var scale = d3.select(".plot svg .scale");

    scale.style("opacity",0);

    scale.append("text")
    .attr("class","title")
    .attr("x",-150)
    .attr("y",10)
    .text(title);

    scale.append("rect")
    .attr("x",-300)
    .attr("y",20)
    .attr("height",10)
    .attr("width",300)
    .attr("rx",2)
    .attr("fill", fill);
    scale.append("text")
    .attr("x",-300)
    .attr("y",12*options.cex + 32)
    .text(formatter(domain[0]));
    scale.append("text")
    .attr("x",0)
    .attr("y",12*options.cex + 32)
    .attr("text-anchor", "end")
    .text(formatter(domain[domain.length-1]));
    scale.transition()
    .duration(500)
    .style("opacity",+options.showLegend);
}

function showTables() {
  var hidden = hiddenFields.slice((options.showCoordinates && !options.heatmap) ? 4 : 2);

  var totalItems = {};
  ["nodes","links"].forEach(function(name){
    totalItems[name] = (frameControls ? Graph[name].filter(function(d){ return !d._hideFrame; }).length : Graph[name].length);
  });

  var tableWrapper = function(dat, name, columns){
    var currentData;
    if(name=="nodes")
      currentData = simulation.nodes();
    else
      currentData = simulation.force("link").links();
    var table = d3.select("div.tables div."+name),
        last = -1,
    drawTable = function(d){
      var tr = table.append("tr")
        .datum(d.index)
        .classed("selected",function(dd){
          return currentData[dd]._selected;
        });
      columns.forEach(function(col){
          var txt = d[col],
              textAlign = null;
          if(txt == null)
            txt = "";
          if(typeof txt == 'object'){
            if(frameControls)
              txt = txt[frameControls.frame];
            else
              txt = txt.join("; ");
          }
          if(typeof txt == 'number'){
            txt = formatter(txt);
            textAlign = "right";
          }
          tr.append("td").html(txt)
              .style("text-align",textAlign)
              .on("mousedown",function(){ d3.event.preventDefault(); });
      });
      tr.on("click",function(origin,j){
          if(d3.event.shiftKey && last!=-1)
            var selecteds = d3.range(Math.min(last,this.rowIndex),Math.max(last,this.rowIndex)+1);
          table.selectAll("tr").classed("selected", function(d,i){
            var selected = d3.select(this).classed("selected");
            if(selecteds){
              if(d3.event.ctrlKey || d3.event.metaKey)
                selected = selected || selecteds.indexOf(i)!=-1;
              else
                selected = selecteds.indexOf(i)!=-1;
            }else{
              if(d3.event.ctrlKey || d3.event.metaKey){
                selected = selected ^ d == origin;
              }else{
                selected = d == origin;
                if(options.nodeText){
                  plot.selectAll("div.tooltip").remove();
                  if(name=="nodes"){
                    showTooltip(currentData[origin],true);
                  }else{
                    showTooltip(currentData[origin].source,true);
                    showTooltip(currentData[origin].target,true);
                  }
                }
              }
            }
            if(!options.heatmap){
              currentData[d]._selected = selected;                
            }
            return selected;
          })
          if(!options.heatmap)
            simulation.restart();

          enableSelectButtons("#tableselection",!table.selectAll("tr.selected").empty());

          if(d3.select(this).classed("selected"))
            last = this.rowIndex;
          else
            last = -1;
        });
    },

    drawHeader = function() {
        var thead = table.append("thead"),
            tbody = table.append("tbody"),
            desc = columns.map(function(){ return false; });
        columns.forEach(function(d,i){
          var sort1 = function(a,b){
                var rv = [1,-1];
                if(a[d]==null) return rv[0];
                if(b[d]==null) return rv[1];
                a = a[d][options.nodeName]?a[d][options.nodeName]:a[d];
                b = b[d][options.nodeName]?b[d][options.nodeName]:b[d];
                if(typeof a == "number" && typeof b == "number"){
                  if(!desc[i])
                    rv = rv.reverse();
                }else{
                  if(desc[i])
                    rv = rv.reverse();
                }
                if (a > b) {
                  return rv[0];
                }
                if (a < b) {
                  return rv[1];
                }
                return 0;
              };
          thead.append("th")
            .attr("class","sorting")
            .text(d)
            .on("click",function(){
              tbody.html("");
              dat.sort(sort1);
              var desci = desc[i];
              desc = columns.map(function(){ return false; });
              thead.selectAll("th").attr("class","sorting");
              desc[i] = !desci;
              d3.select(this).attr("class",desci ? "sorting_desc" : "sorting_asc");
              dat.forEach(drawTable);
            });
        });
        return tbody;
    }

    table.html("");
    table.append("div")
      .attr("class","title")
      .html("<span>"+texts[name+"attributes"] + "</span> ("+dat.length+" "+texts.outof+" "+totalItems[name]+")");
    table = table.append("div");
    if(dat.length==0){
      table.style("cursor",null);
      table.on('mousedown.drag', null);
      table.text(texts.noitemsselected);
    }else{
      table = table.append("table");
      table.on("mousedown", function(){ d3.event.stopPropagation(); })
      table = drawHeader();
      dat.forEach(drawTable);
      table.each(function(){
        var twidth = this.parentNode.offsetWidth;
        d3.select(this.parentNode.parentNode)
            .style("width",(twidth+8)+"px")
            .style("cursor","col-resize")
            .call(d3.drag()
              .on("drag",function(){
                var coorx = d3.mouse(this)[0],
                    self = d3.select(this),
                    selfTable = self.select("table");
                selfTable.style("width",(coorx-8)+"px");
                if(selfTable.node().offsetWidth > (coorx-8))
                  selfTable.style("width",selfTable.node().offsetWidth+"px");
                else
                  self.style("width",coorx+"px");
              })
            )
      })
    }
  },

  cleanData = function(d){
    var dReturn = {}, key;
    for(key in d)
      if(hidden.indexOf(key)==-1)
        dReturn[key] = d[key];
    return dReturn;
  },

  filterHidden = function(d){
    return hidden.indexOf(d)==-1;
  };

  var nodesData = Graph.nodes.filter(function(d){
        delete d._selected;
        return checkSelectable(d) && d.selected;
      }).map(cleanData),
      linksData = Graph.links.filter(function(d){
        delete d._selected;
        return checkSelectableLink(d) && (d.source.selected && d.target.selected);
      }).map(cleanData),
      nodeColumns = Graph.nodenames.filter(filterHidden),
      linkColumns = Graph.linknames.filter(filterHidden);

  if(options.showCoordinates && !options.heatmap){
    nodeColumns = d3.merge([nodeColumns,["x","y"]]);

    nodesData.forEach(function(d){
      d["x"] = scaleCoorX.invert(d["x"]).toFixed(2);
      d["y"] = scaleCoorY.invert(d["y"]).toFixed(2);
    });
  }

  tableWrapper(nodesData,"nodes",nodeColumns);
  tableWrapper(linksData,"links",linkColumns);

  // highlight egonet of selection
  if(!options.heatmap){
    var names = nodesData.map(function(node){ return node[options.nodeName]; });
    if(nodesData.length && nodesData.length!=totalItems["nodes"]){
      Graph.nodes.forEach(function(node){
        delete node._back;
        if(checkSelectable(node) && !node.selected){
          node._back = true;
        }
      })
      Graph.links.forEach(function(link){
        if(names.indexOf(link.Source)!=-1 || names.indexOf(link.Target)!=-1){
          delete link.source._back;
          delete link.target._back;
          delete link._back;
        }else{
          link._back = true;
        }
      })
    }else{
      Graph.links.forEach(function(link){
        delete link._back;
      })
      Graph.nodes.forEach(function(node){
        delete node._back;
      })
    }
    simulation.restart();
  }

  // check legend items checked
  checkLegendItemsChecked();

  // enable/disable selection buttons
  if(options.showButtons2){
    if(nodesData.length){
      enableSelectButtons("#selectneighbors, #isolateselection, #egonet", nodesData.length<totalItems["nodes"]);
    }else{
      enableSelectButtons("#tableselection, #selectneighbors, #isolateselection, #egonet", false);
    }
  }
}

// check checkboxes after node selections
function checkLegendItemsChecked() {
    var parent = plot.select("svg > .scale"),
        legendSelectAll = parent.select(".legend-selectall");
    if(!legendSelectAll.empty()){
      var items = parent.selectAll("g.legend-item");
      if(!items.empty()){
        var selectedNodes = simulation.nodes().filter(function(d){ return d.selected; });

        items.each(function(value){
          checkInBox(this,false);
          var key = this.parentNode.key;
          for(var i = 0; i<selectedNodes.length; i++){
            var d = selectedNodes[i];
            if(d[key] && (String(d[key])==value || (typeof d[key] == "object" && (d[key].indexOf(value)!=-1 || d[key].join(",")==value)))){
              checkInBox(this,true);
              break;
            }
          }
        })

        var size = parent.selectAll(".legend-item").filter(function(){ return this.selected; }).size(),
            enable = selectedNodes.length && simulation.nodes().length > selectedNodes.length;
        parent.selectAll(".legend-bottom-button > rect")
        .style("fill", enable ? UIcolor : disUIcolor)
        .style("pointer-events", enable ? "all" : null)
        checkInBox(legendSelectAll.node(), size ? true : false);
      }
    }

    // visually mark/unmark checkbox
    function checkInBox(thiz,select){
        var checkBox = d3.select(thiz).select(".legend-check-box");
        if(select){
          thiz.selected = true;
          checkBox
            .style("fill",UIcolor)
            .style("stroke","none")
        }else{
          thiz.selected = false;
          checkBox
            .style("fill",null)
            .style("stroke",null)
        }
    }
}

function enableSelectButtons(buttons,enable){
    panel.select(".selectButton").selectAll(buttons)
      .attr("class",enable?"":"disabled")
}

function tables2xlsx(){
      var nodes = [],
          links = [],
          tableNodes = d3.select(".tables .nodes table"),
          tableLinks = d3.select(".tables .links table"),
          loadData = function(table){
            var items = [];
            items.push([]);
            table.selectAll("th").each(function(){
              items[0].push(d3.select(this).text());
            })
            table.selectAll("tr").each(function(){
              var row = [];
              d3.select(this).selectAll("td").each(function(){
                var dat = d3.select(this).text();
                if(d3.select(this).style("text-align")=="right") dat = +dat;
                row.push(dat);
              })
              items.push(row);
            })
            return items;
          }
      if(!tableNodes.empty()){
        nodes = loadData(tableNodes);
      }
      if(!tableLinks.empty()){
        links = loadData(tableLinks);
      }
      if(nodes.length == 0 && links.length == 0)
        displayWindow(texts.noitemsselected);
      else
        downloadExcel({nodes: nodes, links: links}, d3.select("head>title").text());
}

function selectNodesFromTable(){
        var names = [],
            index = 0,
            trSelected;
        if(d3.select("div.tables div.nodes").style("display")=="block"){
          trSelected = d3.selectAll("div.nodes table tr.selected");
          if(!trSelected.empty()){
            d3.selectAll("div.nodes table th").each(function(d,i){
              if(this.textContent == options.nodeName)
                index = i+1;
            })
            trSelected
              .each(function(){
                names.push(d3.select(this).select("td:nth-child("+index+")").text());
              })
              .classed("selected",false);
          }
        }else{
          trSelected = d3.selectAll("div.links table tr.selected");
          if(!trSelected.empty()){
            trSelected
              .each(function(){
                for(var i=1; i<=2; i++){
                  index = d3.select(this).select("td:nth-child("+i+")").text();
                  if(names.indexOf(index)==-1)
                    names.push(index);
                }
              })
              .classed("selected",false);
          }
        }
        if(!trSelected.empty()){
          Graph.nodes.forEach(function(d){
            d.selected = names.indexOf(d[options.nodeName]) != -1;
          });
          showTables();
        }
}

function getLayoutRange(){
  var xrange, yrange,
      compWidth = computeWidth(),
      compHeight = computeHeight();
  if(options.showCoordinates){
      var offsetTop = 50,
          offsetRight = 240,
          offsetBottom = 50*Math.max(options.cex,1),
          offsetLeft = 240;

      if(options.note){
        offsetBottom = offsetBottom + divNote.node().clientHeight;
      }

      xrange = [offsetLeft,compWidth-offsetRight],
      yrange = [offsetTop,compHeight-offsetBottom];
  }else{
      var size = Math.min(compWidth,compHeight) / 1.2;

      xrange = [0,size].map(function(d){ return ((compWidth-size)/2)+d; });
      yrange = [0,size].map(function(d){ return ((compHeight-size)/2)+d; });
  }
  return { x: xrange, y: yrange };
}

function adaptLayout(){
  var initialize = false;
  if(typeof options.dynamicNodes == "undefined"){
    initialize = true;
    options.dynamicNodes = true;
  }

  var anyFixed = false,
      nodes = backupNodes ? backupNodes : Graph.nodes;

  if(options.dynamicNodes){
    for(var i=0; i<nodes.length; i++){
      if(nodes[i].hasOwnProperty("fx") || nodes[i].hasOwnProperty("fy")){
        anyFixed = true;
        break;
      }
   }
  }else{
    anyFixed = true;
  }

  if(anyFixed){
    if(initialize){
      var xdim, ydim,
          centerDim = function(dim){
            if(dim[0]==dim[1]){
              dim[0] = dim[0] - 1;
              dim[1] = dim[1] + 1;
            }
            return dim;
          }

      if(options.hasOwnProperty("limits") && options.limits.length==4){
        xdim = [options.limits[0],options.limits[2]];
        ydim = [options.limits[1],options.limits[3]];
      }else{
        if(backupNodes){
          xdim = centerDim(d3.extent(d3.merge(nodes.map(function(d){ return d.fx }))));
          ydim = centerDim(d3.extent(d3.merge(nodes.map(function(d){ return d.fy }))));
        }else{
          xdim = centerDim(d3.extent(nodes,function(d){ return d.fx }));
          ydim = centerDim(d3.extent(nodes,function(d){ return d.fy }));
        }
        var dx = xdim[1] - xdim[0],
            dy = ydim[1] - ydim[0];
        xdim[0] = xdim[0] - dx*0.04;
        xdim[1] = xdim[1] + dx*0.04;
        ydim[0] = ydim[0] - dy*0.04;
        ydim[1] = ydim[1] + dy*0.04;
      }

      scaleCoorX = d3.scaleLinear().domain(xdim);
      scaleCoorY = d3.scaleLinear().domain(ydim);
    }else{
      if(backupNodes){
        backupNodes.forEach(function(d){
          if(d.hasOwnProperty("fx")){
            d.fx = d.fx.map(function(e){ return(scaleCoorX.invert(e)); });
          }
          if(d.hasOwnProperty("fy")){
            d.fy = d.fy.map(function(e){ return(scaleCoorY.invert(e)); });
          }
        });
      }else{
        Graph.nodes.forEach(function(d){
          if(typeof d.fx == 'number'){
            d.fx = scaleCoorX.invert(d.fx);
          }
          if(typeof d.fy == 'number'){
            d.fy = scaleCoorY.invert(d.fy);
          }
        });
      }
    }

    var range = getLayoutRange(),
        dx = range.x[1]-range.x[0],
        dy = range.y[1]-range.y[0];

    range.x = range.x.map(function(d){ return d-(computeWidth()/2); });
    range.y = range.y.map(function(d){ return d-(computeHeight()/2); });

    range.y.reverse();

    scaleCoorX.range(range.x);
    scaleCoorY.range(range.y);

    options.dynamicNodes = false;
    if(backupNodes){
      backupNodes.forEach(function(d){
        if(d.hasOwnProperty("fx")){
          d.fx = d.fx.map(function(e){ return(scaleCoorX(e)); });
        }else{
          options.dynamicNodes = true;
        }
        if(d.hasOwnProperty("fy")){
          d.fy = d.fy.map(function(e){ return(scaleCoorY(e)); });
        }else{
          options.dynamicNodes = true;
        }
      });
    }else{
      Graph.nodes.forEach(function(d){
        if(typeof d.fx == 'number'){
          d.fx = scaleCoorX(d.fx);
        }else{
          options.dynamicNodes = true;
        }
        if(typeof d.fy == 'number'){
          d.fy = scaleCoorY(d.fy);
        }else{
          options.dynamicNodes = true;
        }
      });
    }
  }else{
    var compWidth = computeWidth(),
        compHeight = computeHeight();

    if(initialize){
      var size = Math.min(compWidth,compHeight);

      scaleCoorX = d3.scaleLinear()
        .domain([0,2*compWidth/size])

      scaleCoorY = d3.scaleLinear()
        .domain([0,-2*compHeight/size])
    }

    scaleCoorX.range([0,compWidth]);
    scaleCoorY.range([0,compHeight]);
  }
}

function embedImages(callback){

  var docSize = viewport(),
      loading = body.append("div")
      .attr("class","loading")
      .style("width",docSize.width+"px")
      .style("height",docSize.height+"px");

  loading.append("p")
    .text(texts.loading)

  if(options.imageItem){
    if(options.imageItems && !images64){

      images64 = {};

      var imgLinks = d3.set(d3.merge(options.imageItems.map(function(d){ return Graph.nodes.map(function(dd){ return dd[d]; }); }))).values();

      var loadImage = function(i){
        var imgSrc = imgLinks[i++];
        var img = images[imgSrc];
        var canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        try{
            images64[imgSrc] = canvas.toDataURL();
        }catch(e){
            console.log(e);
        }finally{
            if(i<imgLinks.length){
              loadImage(i);
            }else{
              callback();
              loading.remove();
            }
        }
      }

      loadImage(0);
      return 0;
    }
  }
  callback();
  loading.remove();
}

function svg2png(callback){

  var svg = d3.select(".panel > .plot > svg");

  var canvas = document.createElement("canvas");
  canvas.width = svg.attr("width");
  canvas.height = svg.attr("height");
  var ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  svg.selectAll(".buttons, .zoombutton, .scale").style("display","none");
  if(options.main){
    svg.append("text")
      .attr("class","main")
      .attr({"x":+svg.attr("width")/2, "y":30})
      .style("text-anchor","middle")
      .style("font-size",d3.select("div.main").style("font-size"))
      .text(options.main);
  }
  if(options.note){
    svg.append("text")
      .attr("class","note")
      .attr({"x":10, "y":+svg.attr("height")-10})
      .style("font-size",d3.select("div.note").style("font-size"))
      .text(options.note);
  }
  var svgString = new XMLSerializer().serializeToString(svg.node());
  var svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
  var DOMURL = self.URL || self.webkitURL || self;
  var img = new Image();
  var url = DOMURL.createObjectURL(svgBlob);
  img.onload = function() {
    ctx.drawImage(img, 0, 0);
    canvas.toBlob(callback);
  };
  img.src = url;

  svg.select("svg>text.main").remove()
  svg.select("svg>text.note").remove()
  svg.selectAll(".buttons, .zoombutton, .scale").style("display",null);
}

function svg2pdf(){
    displayWindow("The network is not loaded yet!");
}

function movePan(dir){
  switch(dir){
    case "ArrowUp":
      transform.y = transform.y - 10;
      break;
    case "ArrowDown":
      transform.y = transform.y + 10;
      break;
    case "ArrowLeft":
      transform.x = transform.x - 10;
      break;
    case "ArrowRight":
      transform.x = transform.x + 10;
      break;
  }
  Sliders.zoom.update(options.zoomScale).brushedValue(false);
}

function resetPan(){
  var w = computeWidth(),
      h = computeHeight(),
      infopanel = body.select(".infopanel");
  if(!infopanel.empty()){
    w = w-infopanel.node().offsetWidth;
  }
  transform.x = w/2;
  transform.y = h/2;
  Sliders.zoom.update(options.zoomScale).brushedValue(false);
}

function resetZoom(){
  transform.k = options.zoomScale = options.zoom;
  transform.x = width/2;
  transform.y = height/2;
  Sliders.zoom.update(options.zoomScale).brushedValue(false);
}

function computeWidth(){
  var w = docSize.width - 20;
  if(options.showSidebar){
    w = w - sidebarOffset;
  }
  return w;
}

function computeHeight(){
  var h = docSize.height - 2;
  if(options.main){
    h = h-parseInt(body.select("div.panel").style("top"));
  }
  if(options.showTables){
    h = h - 165;
  }else if(options.showButtons2){
    h = h - (35 + 12*options.cex);
  }  
  return h;
}

window.onresize = function(){
  width = computeWidth();
  height = computeHeight();

  plot.style("width",width+"px");
  plot.style("height",height+"px");
  plot.call(drawSVG);
}

} // network function end

if(typeof multiGraph == 'undefined'){
  window.onload = function(){
    network(JSON.parse(d3.select("#data").text()));
  };
}
