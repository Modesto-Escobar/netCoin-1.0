function gallery(Graph){

  var docSize = viewport(),
      width = docSize.width,
      height = docSize.height,
      options = Graph.options,
      nodes = Graph.nodes,
      filter = false,
      zoomRange = [0.1, 10],
      gridHeight = 60,
      currentGridHeight = 60;

  var body = d3.select("body");

  // top bar
  var topBar = body.append("div")
        .attr("class","topbar gallery-topbar")

  if(options.main){
    topBar.append("h3").text(options.main)
    if(typeof multiGraph != 'undefined'){
      topBar.append("span").text("/");
    }
  }

  // multigraph
  if(typeof multiGraph != 'undefined'){
      topBar.append("h3").text(texts.graph + ":")
      multiGraph.graphSelect(topBar);
  }

  topBar.append("span").style("padding","0 10px");

  // node multi search
  topBar.call(displayMultiSearch()
        .data(nodes)
        .column(options.nodeLabel)
        .update(displayNodes)
        .filterData(filterNodes));

  topBar.append("span").style("padding","0 10px");

  // node order
  topOrder(topBar,nodes,displayNodes);

  topBar.append("span").style("padding","0 10px");

  // node filter in topBar
  var topFilterInst = topFilter()
    .data(nodes)
    .attr(options.nodeName)
    .displayGraph(function(f){
      if(filter && f){
        f = f.filter(function(d){
          return filter.indexOf(d)!=-1;
        })
      }
      filter = f;
      displayNodes();
    });
  topBar.call(topFilterInst);

  var content = body.append("div")
        .attr("class","content");

  var gallery = content.append("div")
        .attr("class","grid-gallery");

  gallery.call(d3.zoom()
      .scaleExtent(zoomRange)
      .on("zoom", zoomed));

  displayNodes();

  var panel = content.append("div")
        .attr("class","gallery-panel");

  var panelContent = panel.append("div")
        .attr("class","panel-content")
        .style("height","100%");

  if(options.note){
    var note = body.append("div")
      .attr("class","gallery-note")
      .html(options.note)
  }

  content.style("height",(height - topBar.node().offsetHeight - 20 - (options.note ? note.node().offsetHeight : 0))+"px")

  function zoomed() {
    currentGridHeight = gridHeight*d3.event.transform.k;
    displayNodes();
  }

  function displayNodes(){
    gallery.selectAll("div").remove();

    var data = nodes.filter(filterNodes);

    if(options.order){
      data.sort(function(a,b){
        var aa = a[options.order],
            bb = b[options.order];
        if((typeof aa == "number" && typeof bb == "number") ^ options.rev){
          var aux = bb;
          bb = aa;
          aa = aux;
        }
        return aa < bb ? -1 : aa > bb ? 1 : aa >= bb ? 0 : NaN;
      })
    }

    data.forEach(function(n){
      var wrapper = gallery.append("div")
        .classed("selected",n.selected)
      if(options.imageItems){
        wrapper.append("img")
          .style("height",currentGridHeight+"px")
          .on("load", function(){
            var imgheight = this.height;
            var imgwidth = this.width;

            wrapper.style("width",(currentGridHeight*(imgwidth/imgheight))+"px")
          })
          .attr("src", n[options.imageItems]);
      }else{
        wrapper.style("width",currentGridHeight+"px")
          .append("div")
            .style("height",currentGridHeight+"px")
            .style("width","100%")
      }
      wrapper.append("span")
        .text(n[options.nodeLabel])
      if(options.nodeInfo && n[options.nodeInfo]!=""){
        wrapper.style("cursor","pointer")
        .on("click",function(){
          panelContent.html(n[options.nodeInfo]);
        })
      }
    })
  }

function filterNodes(n){
      return !filter || filter.indexOf(n[options.nodeName])!=-1 ? true : false;
}

function topOrder(topBar,data,displayGraph){

  topBar.append("h3").text(texts.Order + ":")

  var selOrder = topBar.append("div")
      .attr("class","select-wrapper")
    .append("select")
    .on("change",function(){
      options.order = this.value;
      if(options.order=="-default-")
        options.order = false;
      displayGraph();
    })

  var opt = getOptions(data);
  opt.unshift("-default-");
  selOrder.selectAll("option")
        .data(opt)
      .enter().append("option")
        .property("selected",function(d){
          return d==options.order;
        })
        .property("value",function(d){ return d; })
        .text(function(d){ return d; })

  topBar.append("h3")
    .text(texts.Reverse)
  topBar.append("button")
    .attr("class","switch-button")
    .classed("active",options.rev)
    .on("click",function(){
      options.rev = !options.rev;
      d3.select(this).classed("active",options.rev);
      displayGraph();
    })

  topBar.append("span").style("padding","0 10px")
}
} // gallery function end

if(typeof multiGraph == 'undefined'){
  window.onload = function(){
    gallery(JSON.parse(d3.select("#data").text()));
  };
}
