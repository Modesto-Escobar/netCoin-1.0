function fileDownload(blob,name){
  if(window.navigator.msSaveBlob){
    window.navigator.msSaveBlob(blob, name);
  }else{
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }
}

function pdfPolygon(path, x, y, scale, style){
    if(path.indexOf("A")!=-1){
      this.circle(x, y, 4.514*scale[0], style);
    }else{
      var closed = path.indexOf("Z")!=-1,
          points = [];
      path = path.replace(/M|Z/g,"").split(/[Lhv]/); 
      for(var i = 0; i<path.length; i++){
        var p = path[i].split(/[,| ]/).filter(function(d){ return d.length>0; }),
        pLen = p.length;
        if(pLen==1){
          points.push(points[points.length-1].map(function(d,j){ return i%2!=0 ^ j ? d+parseInt(p[0]) : d; }));
        }
        if(pLen==2){
          points.push([+p[0],+p[1]]);
        }
        if(pLen>2){
          for(var j = 0; j<pLen; j=j+2){
            points.push([+p[j],+p[j+1]]);
          }
        }
      }

      var acc = [],
        x1 = points[0][0],
        y1 = points[0][1],
        cx = x1,
        cy = y1;
      for(var i=1; i<points.length; i++) {
          var point = points[i],
            dx = point[0]-cx,
            dy = point[1]-cy;
          acc.push([dx, dy]);
          cx += dx;
          cy += dy;
      }
      this.lines(acc, x+(x1*scale[0]), y+(y1*scale[1]), scale, style, closed);
    }
}

function applyOpacity(rgb,alpha,old){
  if(!old)
    old = {r:255,g:255,b:255};
  var blending = function(newC,old){
    return alpha * newC + (1 - alpha) * old;
  }
  return d3.rgb(blending(rgb.r,old.r),blending(rgb.g,old.g),blending(rgb.b,old.b));
}

function viewport(){
  var e = window,
      a = 'inner';
  if ( !( 'innerWidth' in window ) ){
    a = 'client';
    e = document.documentElement || document.body;
  }
  return { width : e[a+'Width'] , height : e[a+'Height'] }
}

function formatter(d){
  if(typeof d == 'number'){
    var dabs = Math.abs(d);
    if(dabs>0 && dabs<1e-2)
      d = d.toExponential(2);
    else
      d = (d % 1 === 0)?d:d.toFixed(2);
  }
  return d;
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function inIframe(){
  try{
    return window.self !== window.top;
  }catch(e){
    return true;
  }
}

function getKey(event){
  if(typeof event.key != "undefined"){
    // modern browsers
    var key = event.key;

    // alternative names in Internet Explorer
    var alt = {
      "Esc": "Escape",
      "Spacebar": " ",
      "Left": "ArrowLeft",
      "Up": "ArrowUp",
      "Right": "ArrowRight",
      "Down": "ArrowDown",
      "Del": "Delete"
    }
    if(alt.hasOwnProperty(key))
      key = alt[key];

    return key;
  }else{
    // old browsers
    var key = event.which || event.keyCode;

    // equivalence key codes - names
    var keyCodes = {
  '8': "Backspace",
  '9': "Tab",
  '13': "Enter",
  '16': "Shift",
  '17': "Control",
  '18': "Alt",
  '19': "Pause",
  '20': "CapsLock",
  '27': "Escape",
  '32': " ",
  '33': "PageUp",
  '34': "PageDown",
  '35': "End",
  '36': "Home",
  '37': "ArrowLeft",
  '38': "ArrowUp",
  '39': "ArrowRight",
  '40': "ArrowDown",
  '45': "Insert",
  '46': "Delete",
  '48': "0",
  '49': "1",
  '50': "2",
  '51': "3",
  '52': "4",
  '53': "5",
  '54': "6",
  '55': "7",
  '56': "8",
  '57': "9",
  '60': "<",
  '65': "a",
  '66': "b",
  '67': "c",
  '68': "d",
  '69': "e",
  '70': "f",
  '71': "g",
  '72': "h",
  '73': "i",
  '74': "j",
  '75': "k",
  '76': "l",
  '77': "m",
  '78': "n",
  '79': "o",
  '80': "p",
  '81': "q",
  '82': "r",
  '83': "s",
  '84': "t",
  '85': "u",
  '86': "v",
  '87': "w",
  '88': "x",
  '89': "y",
  '90': "z",
  '96': "0",
  '97': "1",
  '98': "2",
  '99': "3",
  '100': "4",
  '101': "5",
  '102': "6",
  '103': "7",
  '104': "8",
  '105': "9",
  '106': "*",
  '107': "+",
  '108': ".",
  '109': "-",
  '110': ".",
  '111': "/",
  '190': "."
    //TODO: complete list
    };

    return keyCodes[String(key)];
  }
}

function downloadExcel(data,name){
  var sheets = ["void"],
      contentTypes = [],
      workbook = [],
      workbookRels = [],
      sheetXML = function(dat){
        var xml = [];
        dat.forEach(function(d){
          xml.push('<row>');
          d.forEach(function(dd){
            if(typeof dd == 'number')
              xml.push('<c t="n"><v>'+dd+'</v></c>');
            else
              xml.push('<c t="inlineStr"><is><t>'+escapeHtml(dd)+'</t></is></c>');
          });
          xml.push('</row>');
        });
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac"><sheetData>'+xml.join('')+'</sheetData></worksheet>';
      }

  for(var d in data)
    sheets.push(d);

  var zip = new JSZip(),
      rels = zip.folder("_rels"),
      xl = zip.folder("xl"),
      xlrels = xl.folder("_rels"),
      xlworksheets = xl.folder("worksheets");

  rels.file(".rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');

  for(var i = 1; i < sheets.length; i++){
    contentTypes.push('<Override PartName="/xl/worksheets/sheet'+i+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>');
    workbook.push('<sheet name="'+sheets[i]+'" sheetId="'+i+'" r:id="rId'+i+'"/>');
    workbookRels.push('<Relationship Id="rId'+i+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+i+'.xml"/>');
    xlworksheets.file("sheet"+i+".xml", sheetXML(data[sheets[i]]));
  }

  zip.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+contentTypes.join('')+'</Types>');

  xl.file("workbook.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><fileVersion appName="xl" lastEdited="5" lowestEdited="5" rupBuild="24816"/><workbookPr showInkAnnotation="0" autoCompressPictures="0"/><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="25600" windowHeight="19020" tabRatio="500"/></bookViews><sheets>'+workbook.join('')+'</sheets></workbook>');

  xlrels.file("workbook.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+workbookRels.join('')+'</Relationships>');

  zip.generateAsync({type:"blob", mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})
  .then(function(content) {
      fileDownload(content, name + '.xlsx');
  });
}

function displayWindow(txt){
  var docSize = viewport(),
      bg = d3.select("body").append("div")
        .style("position","fixed")
        .style("top",0)
        .style("left",0)
        .style("width",docSize.width+"px")
        .style("height",docSize.height+"px")
        .style("background","rgba(0,0,0,0.8)")
        .style("z-index",10);

  var boxStyle = {"background-color":"#fff","margin":"0 auto","margin-top":(docSize.height/5)+"px","padding":"30px","width":(docSize.width/2)+"px"};

  if(txt){
    boxStyle["font-size"] = "16px";
    boxStyle["text-align"] = "center";
  }else{
    boxStyle["height"] = (docSize.height/2)+"px";
    boxStyle["overflow-y"] = "auto";
  }

  var win = bg.append("div")
    .attr("class","window")
    .on("click",function(){ d3.event.stopPropagation(); })

  for(var s in boxStyle)
    win.style(s,boxStyle[s]);

  bg.append("div")
    .attr("class","close-button")
    .style("position","absolute")
    .style("top",(12+docSize.height/5)+"px")
    .style("right",(docSize.width/4)+"px")
    .html("&#x2716;")
    .on("click", function(){ bg.remove() });

  if(txt)
    win.text(txt);
  else
    return win;
}

function brushSlider(){
  var domain,
      current,
      callback,
      baseWidth;

  function exports(sel){
    var cex = parseInt(sel.style("font-size"))/10,
        margin = {top: 21 + 15*cex, right: 17, bottom: 0, left: 17},
        width = baseWidth - margin.left - margin.right,
        height = 21;

    if(!current)
      current = domain.slice();

    var x = d3.scaleLinear()
        .range([0, width])
        .domain(domain)
        .clamp(true);

    sel.style("height", height+margin.top+margin.bottom + "px");
  
    var slider = sel.append("div")
      .attr("class", "slider")
      .style("width", width + "px")
      //.style("height", height + "px")
      .style("position", "relative")
      .style("top", margin.top+"px")
      .style("left", margin.left+"px");
    
    var sliderTray = slider.append("div")
      .attr("class", "slider-tray");
    
    var sliderExtent = slider.append("span")
      .attr("class","slider-extent")

    slider.append("span")
    .attr("class","slider-min")
    .style("left", -5*cex+"px")
    .style("top", -20*cex + "px")
    .text(formatter(domain[0]))

    slider.append("span")
    .attr("class","slider-max")
    .style("left", width-5*cex+"px")
    .style("top", -20*cex + "px")
    .text(formatter(domain[1]))

    var sliderHandle = slider.selectAll(".slider-handle")
    .data(current)
      .enter().append("div")
    .attr("class", "slider-handle")
    .style("position","absolute")
    .style("top", "3px")
    
    sliderHandle.append("div")
    .attr("class", "slider-handle-icon")

    sliderHandle.each(function(d,i){
      d3.select(this).append("span")
      .attr("class","slider-text")
      .style("top", -25*cex + "px")
      .style("left", -4*cex+"px")
      .on("click",function(d){
        var self = d3.select(this);
        if(self.select("input").empty()){
          var value = formatter(d);
          var input = self.append("input")
            .attr("type","text")
            .property("value",value)
            .on("blur",function(){
              self.select("input").remove();
            })
            .node()
          input.onkeydown = function(event){
              var key = getKey(event);
              if(key == 'Enter'){
                var val = parseFloat(this.value);
                if(isNaN(val) || val<domain[0] || val>domain[1])
                  return false;
                current[i] = val;
                callback(updateHandlers());
                return false; 
              }
              if(isNaN(parseInt(key)) && ["Backspace","Tab","End","Home","ArrowLeft","ArrowRight","Delete","."].indexOf(key)==-1)
                return false;
          }
          input.focus();
          input.select();
        }
      })
    })

    sliderHandle.call(d3.drag()
    .on("drag", function(d,i) {
      current[i] = x.invert(d3.mouse(sliderTray.node())[0]);
      callback(updateHandlers());
    }));

    updateHandlers();

    function updateHandlers(){
      sliderHandle.data(current);
      sliderHandle.style("left",function(d){ return x(d) + "px"; });
      sliderHandle.select(".slider-text").text(function(d){ return formatter(d); });
      var extent = d3.extent(current);
      sliderExtent
        .style("width", (x(extent[1])-x(extent[0]))+"px")
        .style("left",x(extent[0])+"px");
      return extent;
    }
  }

  exports.domain = function(x) {
    if (!arguments.length) return domain;
    domain = x;
    return exports;
  };

  exports.current = function(x) {
    if (!arguments.length) return current;
    current = x;
    return exports;
  };

  exports.callback = function(x) {
    if (!arguments.length) return callback;
    callback = x;
    return exports;
  };

  exports.baseWidth = function(x) {
    if (!arguments.length) return baseWidth;
    baseWidth = x;
    return exports;
  };

  return exports;
}

function dataType(data,key,deep){
  var type = [];
  for(var i = 0; i<data.length; i++){
      if(data[i][key] !== null){
        var t = typeof data[i][key];
        if(deep && t=="object"){
          data[i][key].forEach(function(d){
            if(d !== null){
              type.push(typeof d);
            }
          })
        }else{
          type.push(t);
        }
      }
  }
  type = d3.set(type).values();
  if(type.length == 1){
    return type[0];
  }else{
    return 'undefined';    
  }
}

function selectedValues2str(selectedValues,data){
  var query = "(true";
  d3.keys(selectedValues).forEach(function(k){
    query = query + ") && (false";
    if(typeof selectedValues[k][0] == 'number' && selectedValues[k].length == 2){
      query = query + " || ((d['" + k + "'] >= " + selectedValues[k][0] + ") && (d['" + k + "'] <= " + selectedValues[k][1] + "))";
    }else{
      var type = dataType(data,k);
      if(type == 'object'){
        selectedValues[k].forEach(function(p){
          query = query + " || (d['" + k + "'] && d['" + k + "'].indexOf('" + p + "')!=-1)";
        })
      }else{
        selectedValues[k].forEach(function(p){
          query = query + " || (String(d['" + k + "']) == '" + p + "')";
        })
      }
    }
  })
  query = query + ")";
  return query;
}

function getOptions(data,order){
  if(!order)
    order = d3.ascending;
  return d3.keys(data[0]).filter(function(d){ return d.substring(0,1)!="_"; }).sort(order);
}

function displayPicker(attr,callback){
    var win = displayWindow(),
        scaleKeys = d3.keys(colorScales),
        fontsize = parseInt(win.style("font-size"));
    win.append("h2").text(texts.selectacolorscale+"\""+attr+"\"");

    var picker = win.append("ul")
      .attr("class","picker");

    picker.selectAll("li")
      .data(scaleKeys)
    .enter().append("li")
      .property("val",String)
      .on("click",function(){
        callback(this.val);
        d3.select(win.node().parentNode).remove();
      })
      .append("canvas")
        .attr("width",fontsize*6)
        .attr("height",fontsize)
        .text(String)

    picker.selectAll("canvas").each(function(d){
      var ctx = this.getContext("2d");

      // Create gradient
      var grd = ctx.createLinearGradient(0,0,this.width,0);
      grd.addColorStop(0,colorScales[d][0]);
      grd.addColorStop(0.5,colorScales[d][1]);
      grd.addColorStop(1,colorScales[d][2]);

      // Fill with gradient
      ctx.fillStyle = grd;
      ctx.fillRect(0,0,this.width,this.height);
    });
}

function topFilter(){

  var data,
      attr,
      displayGraph,
      selectedValues = {},
      selFilter;

  function exports(topBar){

    topBar.append("h3").text(texts.filter + ":")

    var changeAttrSel = function(val){
      if(d3.select("body>div>div.window").empty()){

        var panel = displayWindow(),
            vp = viewport();

        panel.append("h3").text(val).style("margin-bottom","10px")

        var type = dataType(data.filter(function(d){ return d[val] !== null; }),val);
        if(type == 'number'){
          var extent = d3.extent(data, function(d){ return d[val]; }),
              tempValues;
          panel.append("div").call(brushSlider()
            .domain(extent)
            .current(selectedValues[val])
            .callback(function(s){ tempValues = s; })
            .baseWidth(vp.width/3));
        }else{
          var dat = data.map(function(d){ return d[val]; });
          if(type != 'string')
            dat = dat.reduce(function(a,b) { return b ? a.concat(b) : a; }, []);
          dat = d3.set(dat).values().sort();

          var valSelector = panel.append("select")
            .attr("multiple","multiple")
            .attr("size",dat.length)
            .style("width",vp.width/3+"px");

          valSelector.selectAll("option").data(dat)
            .enter().append("option")
              .property("value",String)
              .property("selected",function(d){ return (selectedValues[val] && selectedValues[val].indexOf(d)!=-1); })
              .text(String);
        }

        panel.append("button")
          .text(texts.apply)
          .style("position","fixed")
          .style("left",((2*vp.width/3)-80)+"px")
          .style("top",(2*vp.height/3)+"px")
          .on("click",function(){
            selectedValues = {};
            add2filter();
            applyfilter();
          })

        panel.append("button")
          .text(texts.add)
          .style("position","fixed")
          .style("left",(2*vp.width/3)+"px")
          .style("top",(2*vp.height/3)+"px")
          .on("click",add2filter)
      }

      function add2filter(){
            selectedValues[val] = [];
            if(typeof tempValues != 'undefined'){
              selectedValues[val] = tempValues;
            }else{
              valSelector.selectAll("option").each(function(){
                if(this.selected)
                  selectedValues[val].push(this.value);
              })
            }
            if(selectedValues[val].length == 0)
              delete selectedValues[val];
            d3.select(panel.node().parentNode).remove();
      }
    }

    selFilter = topBar.append("select")
      .on("change",function(){ changeAttrSel(this.value); })

    var options = getOptions(data);
    options.unshift("-"+texts.none+"-");
    selFilter.selectAll("option")
        .data(options)
      .enter().append("option")
        .property("disabled",function(d,i){ return !i; })
        .property("value",String)
        .text(String)

    topBar.append("button")
      .text(texts.apply)
      .on("click",applyfilter)

    topBar.append("button")
      .text(texts.removefilter)
      .on("click",removeFilter)
  }

  function applyfilter(){
      var query = selectedValues2str(selectedValues,data);
      var names = data.filter(function(d){ return eval(query); }).map(function(d){ return d[attr]; });
      displayGraph(names);
  }

  function removeFilter(){
      selFilter.node().selectedIndex = 0;
      selectedValues = {};
      displayGraph(false);
  }

  exports.removeFilter = function(){
    removeFilter();
  }

  exports.data = function(x) {
    if (!arguments.length) return data;
    data = x;
    return exports;
  };

  exports.attr = function(x) {
    if (!arguments.length) return attr;
    attr = x;
    return exports;
  };

  exports.displayGraph = function(x) {
    if (!arguments.length) return displayGraph;
    displayGraph = x;
    return exports;
  };

  return exports;
}

function sortAsc(a,b){
  if(!isNaN(+a) && !isNaN(+b)){
    a = +a;
    b = +b;
  }
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

function getTranslation(transform) {
  var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  
  g.setAttributeNS(null, "transform", transform);
 
  var matrix = g.transform.baseVal.consolidate().matrix;
  
  return [matrix.e, matrix.f];
}

function CanvasRecorder(canvas, video_bits_per_sec) {
    this.start = startRecording;
    this.stop = stopRecording;
    this.save = download;

    var recordedBlobs = [];
    var supportedType = null;
    var mediaRecorder = null;

    try {
      var stream = canvas.captureStream();
    } catch (e) {
      alert("canvas.captureStream() is not supported by this browser.");
    }
    if (typeof stream == undefined || !stream) {
      this.start = null;
      return;
    }

    function startRecording() {
        if(typeof MediaRecorder == "undefined"){
          alert('MediaRecorder is not supported by this browser.');
          return false;
        }

        var types = [
            "video/webm;codecs=vp9",
            "video/webm;codecs=vp8",
            "video/webm;codecs=daala",
            "video/webm;codecs=h264",
            "video/webm",
            "video/vp8",
            "video/mpeg"
        ];

        for (var i in types) {
            if (MediaRecorder.isTypeSupported(types[i])) {
                supportedType = types[i];
                break;
            }
        }
        if (supportedType == null) {
            alert("No supported type found for MediaRecorder");
            return false;
        }
        var options = { 
            mimeType: supportedType,
            videoBitsPerSecond: video_bits_per_sec || 2500000 // 2.5Mbps
        };

        recordedBlobs = [];
        try {
            mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
            alert('MediaRecorder is not supported by this browser.');
            console.error('Exception while creating MediaRecorder:', e);
            return false;
        }

        mediaRecorder.ondataavailable = handleDataAvailable;
        mediaRecorder.start(100); // collect 100ms of data blobs
        return true;
    }

    function handleDataAvailable(event) {
        if (event.data && event.data.size > 0) {
            recordedBlobs.push(event.data);
        }
    }

    function stopRecording() {
        mediaRecorder.stop();
    }

    function download(file_name) {
        var name = file_name || 'recording.webm';
        var blob = new Blob(recordedBlobs, { type: supportedType });
        fileDownload(blob,name);
    }
}

// polyfill for toBlob canvas method
if (!HTMLCanvasElement.prototype.toBlob) {
   Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
     value: function (callback, type, quality) {
       var canvas = this;
       setTimeout(function() {
         var binStr = atob( canvas.toDataURL(type, quality).split(',')[1] ),
         len = binStr.length,
         arr = new Uint8Array(len);

         for (var i = 0; i < len; i++ ) {
            arr[i] = binStr.charCodeAt(i);
         }

         callback( new Blob( [arr], {type: type || 'image/png'} ) );
       });
     }
  });
}

// images, icons and paths
var b64Icons = {
  info: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjE0IiB3aWR0aD0iMTQiIHZlcnNpb249IjEuMSI+CjxwYXRoIGZpbGw9IiNjY2MiIGQ9Im03IDBhNyA3IDAgMCAwIC03IDcgNyA3IDAgMCAwIDcgNyA3IDcgMCAwIDAgNyAtNyA3IDcgMCAwIDAgLTcgLTd6bTAgMi41OTk2YTEuNCAxLjQgMCAwIDEgMS40MDA0IDEuNDAwNCAxLjQgMS40IDAgMCAxIC0xLjQwMDQgMS40MDA0IDEuNCAxLjQgMCAwIDEgLTEuNDAwNCAtMS40MDA0IDEuNCAxLjQgMCAwIDEgMS40MDA0IC0xLjQwMDR6bS0yIDMuNDAwNGgzdjMuNTk3N2gxdjEuNDAyM2gtMS0yLTF2LTEuNDAyM2gxdi0yLjU5NzdoLTF2LTF6Ii8+Cjwvc3ZnPg==",

  xlsx: "data:image/svg+xml;base64,PHN2ZyB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgaGVpZ2h0PSIxNCIgd2lkdGg9IjE0IiB2ZXJzaW9uPSIxLjEiIHhtbG5zOmNjPSJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyMiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgdmlld0JveD0iMCAwIDE0IDE0Ij4KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAtMTAzOC40KSI+CjxnPgo8cmVjdCBoZWlnaHQ9IjEwLjQ3MiIgc3Ryb2tlPSIjMjA3MjQ1IiBzdHJva2Utd2lkdGg9Ii41MDIwMSIgZmlsbD0iI2ZmZiIgc3R5bGU9ImNvbG9yLXJlbmRlcmluZzphdXRvO2NvbG9yOiMwMDAwMDA7aXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsO3NoYXBlLXJlbmRlcmluZzphdXRvO3NvbGlkLWNvbG9yOiMwMDAwMDA7aW1hZ2UtcmVuZGVyaW5nOmF1dG8iIHJ5PSIuNTM2OTYiIHdpZHRoPSI3Ljg2NDYiIHk9IjEwNDAiIHg9IjUuODc4OCIvPgo8ZyBmaWxsPSIjMjA3MjQ1Ij4KPHJlY3Qgc3R5bGU9ImNvbG9yLXJlbmRlcmluZzphdXRvO2NvbG9yOiMwMDAwMDA7aXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsO3NoYXBlLXJlbmRlcmluZzphdXRvO3NvbGlkLWNvbG9yOiMwMDAwMDA7aW1hZ2UtcmVuZGVyaW5nOmF1dG8iIHJ5PSIwIiBoZWlnaHQ9IjEuMDYwNyIgd2lkdGg9IjIuMjA5NyIgeT0iMTA0MS4yIiB4PSIxMC4xNjUiLz4KPHJlY3Qgc3R5bGU9ImNvbG9yLXJlbmRlcmluZzphdXRvO2NvbG9yOiMwMDAwMDA7aXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsO3NoYXBlLXJlbmRlcmluZzphdXRvO3NvbGlkLWNvbG9yOiMwMDAwMDA7aW1hZ2UtcmVuZGVyaW5nOmF1dG8iIHJ5PSIwIiBoZWlnaHQ9IjEuMDYwNyIgd2lkdGg9IjIuMjA5NyIgeT0iMTA0Mi45IiB4PSIxMC4xNjUiLz4KPHJlY3Qgc3R5bGU9ImNvbG9yLXJlbmRlcmluZzphdXRvO2NvbG9yOiMwMDAwMDA7aXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsO3NoYXBlLXJlbmRlcmluZzphdXRvO3NvbGlkLWNvbG9yOiMwMDAwMDA7aW1hZ2UtcmVuZGVyaW5nOmF1dG8iIHJ5PSIwIiBoZWlnaHQ9IjEuMDYwNyIgd2lkdGg9IjIuMjA5NyIgeT0iMTA0NC43IiB4PSIxMC4xNjUiLz4KPHJlY3Qgc3R5bGU9ImNvbG9yLXJlbmRlcmluZzphdXRvO2NvbG9yOiMwMDAwMDA7aXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsO3NoYXBlLXJlbmRlcmluZzphdXRvO3NvbGlkLWNvbG9yOiMwMDAwMDA7aW1hZ2UtcmVuZGVyaW5nOmF1dG8iIHJ5PSIwIiBoZWlnaHQ9IjEuMDYwNyIgd2lkdGg9IjIuMjA5NyIgeT0iMTA0Ni40IiB4PSIxMC4xNjUiLz4KPHJlY3Qgc3R5bGU9ImNvbG9yLXJlbmRlcmluZzphdXRvO2NvbG9yOiMwMDAwMDA7aXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsO3NoYXBlLXJlbmRlcmluZzphdXRvO3NvbGlkLWNvbG9yOiMwMDAwMDA7aW1hZ2UtcmVuZGVyaW5nOmF1dG8iIHJ5PSIwIiBoZWlnaHQ9IjEuMDYwNyIgd2lkdGg9IjIuMjA5NyIgeT0iMTA0OC4yIiB4PSIxMC4xNjUiLz4KPHJlY3Qgc3R5bGU9ImNvbG9yLXJlbmRlcmluZzphdXRvO2NvbG9yOiMwMDAwMDA7aXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsO3NoYXBlLXJlbmRlcmluZzphdXRvO3NvbGlkLWNvbG9yOiMwMDAwMDA7aW1hZ2UtcmVuZGVyaW5nOmF1dG8iIHJ5PSIwIiBoZWlnaHQ9IjEuMDYwNyIgd2lkdGg9IjIuMjA5NyIgeT0iMTA0MS4yIiB4PSI3LjI0NzgiLz4KPHJlY3Qgc3R5bGU9ImNvbG9yLXJlbmRlcmluZzphdXRvO2NvbG9yOiMwMDAwMDA7aXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsO3NoYXBlLXJlbmRlcmluZzphdXRvO3NvbGlkLWNvbG9yOiMwMDAwMDA7aW1hZ2UtcmVuZGVyaW5nOmF1dG8iIHJ5PSIwIiBoZWlnaHQ9IjEuMDYwNyIgd2lkdGg9IjIuMjA5NyIgeT0iMTA0Mi45IiB4PSI3LjI0NzgiLz4KPHJlY3Qgc3R5bGU9ImNvbG9yLXJlbmRlcmluZzphdXRvO2NvbG9yOiMwMDAwMDA7aXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsO3NoYXBlLXJlbmRlcmluZzphdXRvO3NvbGlkLWNvbG9yOiMwMDAwMDA7aW1hZ2UtcmVuZGVyaW5nOmF1dG8iIHJ5PSIwIiBoZWlnaHQ9IjEuMDYwNyIgd2lkdGg9IjIuMjA5NyIgeT0iMTA0NC43IiB4PSI3LjI0NzgiLz4KPHJlY3Qgc3R5bGU9ImNvbG9yLXJlbmRlcmluZzphdXRvO2NvbG9yOiMwMDAwMDA7aXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsO3NoYXBlLXJlbmRlcmluZzphdXRvO3NvbGlkLWNvbG9yOiMwMDAwMDA7aW1hZ2UtcmVuZGVyaW5nOmF1dG8iIHJ5PSIwIiBoZWlnaHQ9IjEuMDYwNyIgd2lkdGg9IjIuMjA5NyIgeT0iMTA0Ni40IiB4PSI3LjI0NzgiLz4KPHJlY3Qgc3R5bGU9ImNvbG9yLXJlbmRlcmluZzphdXRvO2NvbG9yOiMwMDAwMDA7aXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsO3NoYXBlLXJlbmRlcmluZzphdXRvO3NvbGlkLWNvbG9yOiMwMDAwMDA7aW1hZ2UtcmVuZGVyaW5nOmF1dG8iIHJ5PSIwIiBoZWlnaHQ9IjEuMDYwNyIgd2lkdGg9IjIuMjA5NyIgeT0iMTA0OC4yIiB4PSI3LjI0NzgiLz4KPHBhdGggc3R5bGU9ImNvbG9yLXJlbmRlcmluZzphdXRvO2NvbG9yOiMwMDAwMDA7aXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsO3NoYXBlLXJlbmRlcmluZzphdXRvO3NvbGlkLWNvbG9yOiMwMDAwMDA7aW1hZ2UtcmVuZGVyaW5nOmF1dG8iIGQ9Im0wIDEwMzkuNyA4LjIzMDEtMS4zN3YxNGwtOC4yMzAxLTEuNHoiLz4KPC9nPgo8L2c+CjxnIGZpbGw9IiNmZmYiIHRyYW5zZm9ybT0ibWF0cml4KDEgMCAwIDEuMzI1OCAuMDYyNSAtMzM5LjcyKSI+CjxwYXRoIGQ9Im00LjQwNiAxMDQ0LjZsMS4zNzUzIDIuMDU2OC0xLjA3MjUtMC4wNjEtMC44OTAzLTEuMzU2LTAuODQ1NjYgMS4yNTc4LTAuOTQxNTYtMC4wNTMgMS4yMTg3LTEuODU0NC0xLjE3My0xLjgwMDggMC45NDE0MS0wLjAzNSAwLjgwMDE0IDEuMjAxMSAwLjgzMDQzLTEuMjYyNiAxLjA3NzUtMC4wNDFzLTEuMzIwNSAxLjk0ODItMS4zMjA1IDEuOTQ4MiIgZmlsbD0iI2ZmZiIvPgo8L2c+CjwvZz4KPC9zdmc+Cg==",

  svg: "data:image/svg+xml;base64,PHN2ZyB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgaGVpZ2h0PSIxNCIgd2lkdGg9IjE0IiB2ZXJzaW9uPSIxLjEiIHhtbG5zOmNjPSJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyMiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgdmlld0JveD0iMCAwIDE0IDE0Ij4KPHJlY3Qgc3R5bGU9ImNvbG9yLXJlbmRlcmluZzphdXRvO2NvbG9yOiMwMDAwMDA7aXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsO3NoYXBlLXJlbmRlcmluZzphdXRvO3NvbGlkLWNvbG9yOiMwMDAwMDA7aW1hZ2UtcmVuZGVyaW5nOmF1dG8iIHJ5PSIyLjYzNDciIGhlaWdodD0iMTMuNTE3IiB3aWR0aD0iMTMuNTE3IiBzdHJva2U9IiNkZWE4NTMiIHk9Ii4yNDEzOCIgeD0iLjI0MTM4IiBzdHJva2Utd2lkdGg9Ii40ODI3NiIgZmlsbD0iI2ZjZjNkYiIvPgo8ZyB0cmFuc2Zvcm09Im1hdHJpeCguNzY1NzQgLjY0MzE1IC0uNjQzMTUgLjc2NTc0IDMuNjI1OSAuMDEwNCkiPgo8cGF0aCBvcGFjaXR5PSIuOTkiIHN0eWxlPSJjb2xvci1yZW5kZXJpbmc6YXV0bztjb2xvcjojMDAwMDAwO2lzb2xhdGlvbjphdXRvO21peC1ibGVuZC1tb2RlOm5vcm1hbDtzaGFwZS1yZW5kZXJpbmc6YXV0bztzb2xpZC1jb2xvcjojMDAwMDAwO2ltYWdlLXJlbmRlcmluZzphdXRvIiBkPSJtMi4yMjQ4IDYuMDQwMmMwLTIuNjUzOCAyLjE1MTMtNC44MDUxIDQuODA1MS00LjgwNTEgMi42NTM4IDNlLTcgNC44MDUxIDIuMTUxMyA0LjgwNTEgNC44MDUxIiBzdHJva2U9IiNhMDYyMDAiIHN0cm9rZS13aWR0aD0iLjciIGZpbGw9IiNmZmQ1NmYiLz4KPHBhdGggb3BhY2l0eT0iLjk4IiBkPSJtMS4zMDUzIDEuMjM1MWgxMS40NDkiIHN0cm9rZT0iI2EwNjIwMCIgc3Ryb2tlLXdpZHRoPSIuNyIgZmlsbD0ibm9uZSIvPgo8cmVjdCBzdHlsZT0iY29sb3ItcmVuZGVyaW5nOmF1dG87Y29sb3I6IzAwMDAwMDtpc29sYXRpb246YXV0bzttaXgtYmxlbmQtbW9kZTpub3JtYWw7c2hhcGUtcmVuZGVyaW5nOmF1dG87c29saWQtY29sb3I6IzAwMDAwMDtpbWFnZS1yZW5kZXJpbmc6YXV0byIgdHJhbnNmb3JtPSJyb3RhdGUoLTQ1KSIgaGVpZ2h0PSIxLjU5MTgiIHdpZHRoPSIxLjU5MTgiIHN0cm9rZT0iIzY5NGMwZiIgeT0iNS4wNDgzIiB4PSIzLjMwMTYiIHN0cm9rZS13aWR0aD0iLjUiIGZpbGw9Im5vbmUiLz4KPC9nPgo8L3N2Zz4K",

  pdf: "data:image/svg+xml;base64,PHN2ZyB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgaGVpZ2h0PSIxNCIgd2lkdGg9IjE0IiB2ZXJzaW9uPSIxLjEiIHhtbG5zOmNjPSJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyMiIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgMTQgMTQiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyI+CjxkZWZzPgo8Y2xpcFBhdGggaWQ9ImNsaXBQYXRoNDE4OSIgY2xpcFBhdGhVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8cGF0aCBzdHlsZT0iY29sb3ItcmVuZGVyaW5nOmF1dG87Y29sb3I6IzAwMDAwMDtpc29sYXRpb246YXV0bzttaXgtYmxlbmQtbW9kZTpub3JtYWw7c2hhcGUtcmVuZGVyaW5nOmF1dG87c29saWQtY29sb3I6IzAwMDAwMDtpbWFnZS1yZW5kZXJpbmc6YXV0byIgZD0ibTkuMDM4NiAwLjAwMDNoLTYuMjMyNWMtMC4zMzQ4IDAtMC42MDU4IDAuMjY4OS0wLjYwNTggMC42MDM4djEyLjc5MmMwIDAuMzM0OCAwLjI3MTAxIDAuNjAzOCAwLjYwNTg0IDAuNjAzOGg4LjM4NzdjMC4zMzQ4MyAwIDAuNjA1ODQtMC4yNjkgMC42MDU4NC0wLjYwMzh2LTEwLjYzNWMtMC45MjEtMC45MTk4LTEuODQxOS0xLjg0MDQtMi43NjE3LTIuNzYwOXoiIGZpbGw9IiNkMzFlMWUiLz4KPC9jbGlwUGF0aD4KPGxpbmVhckdyYWRpZW50IGlkPSJsaW5lYXJHcmFkaWVudDQxNjkiIHkyPSItLjM1NTkzIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDI9IjUuNTExNSIgeTE9IjE0Ljc3MSIgeDE9IjkuMDgxNyI+CjxzdG9wIHN0b3AtY29sb3I9IiM5NzE2MTYiIG9mZnNldD0iMCIvPgo8c3RvcCBzdG9wLWNvbG9yPSIjZDUxYjFiIiBvZmZzZXQ9Ii40NDkxNCIvPgo8c3RvcCBzdG9wLWNvbG9yPSIjZTg1YzVjIiBvZmZzZXQ9IjEiLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8cGF0aCBzdHlsZT0iY29sb3ItcmVuZGVyaW5nOmF1dG87Y29sb3I6IzAwMDAwMDtpc29sYXRpb246YXV0bzttaXgtYmxlbmQtbW9kZTpub3JtYWw7c2hhcGUtcmVuZGVyaW5nOmF1dG87c29saWQtY29sb3I6IzAwMDAwMDtpbWFnZS1yZW5kZXJpbmc6YXV0byIgZD0ibTkuMDM4NiAwLjAwMDI5OThoLTYuMjMyNWMtMC4zMzQ4IDAtMC42MDU4IDAuMjY4OS0wLjYwNTggMC42MDM4djEyLjc5MmMwIDAuMzM0OCAwLjI3MTAxIDAuNjAzOCAwLjYwNTg0IDAuNjAzOGg4LjM4NzdjMC4zMzQ4MyAwIDAuNjA1ODQtMC4yNjkgMC42MDU4NC0wLjYwMzh2LTEwLjYzNWMtMC45MjEtMC45MTk5LTEuODQxNi0xLjg0MDUtMi43NjE0LTIuNzYxeiIgZmlsbD0idXJsKCNsaW5lYXJHcmFkaWVudDQxNjkpIi8+CjxwYXRoIHN0eWxlPSJjb2xvci1yZW5kZXJpbmc6YXV0bztjb2xvcjojMDAwMDAwO2lzb2xhdGlvbjphdXRvO21peC1ibGVuZC1tb2RlOm5vcm1hbDtzaGFwZS1yZW5kZXJpbmc6YXV0bztzb2xpZC1jb2xvcjojMDAwMDAwO2ltYWdlLXJlbmRlcmluZzphdXRvIiBkPSJtMTEuNjM5IDIuOTEzMy0yLjc2MTItMi43NjExdjIuMTU3M2MwIDAuMzM0OSAwLjI3MTAxIDAuNjAzOCAwLjYwNTg0IDAuNjAzOGgyLjE1NTJ6IiBmaWxsPSIjOWUxNjE2Ii8+CjxwYXRoIGZpbGw9IiNmZmYiIGQ9Im0xLjk1OTMgMTMuNTc5YzAuNzg1NC0wLjM2OSAxLjc1NTQtMS41IDIuOTUyNS0zLjQ0NSAwLjE3NTgtMC4yODUzIDEuMTUyMS0wLjYyNDEgMi45NTM2LTEuMDI0OGwxLjA3NjEtMC4yMzkzIDAuNTc2NyAwLjQyNWMxLjgyNzggMS4zNDcxIDMuOTYzOCAxLjY1MzEgNC4zOTE4IDAuNjI4NCAwLjEyNS0wLjI5OTQgMC4xMjMtMC4zNTU3LTAuMDI2LTAuNjU0Ny0wLjIxMi0wLjQyNy0wLjQ5Ni0wLjYyMDMtMS4xNTYtMC43ODk3LTAuNjI4LTAuMTYwNy0yLjE3Mi0wLjE4MjUtMy4wMzI4LTAuMDQyOGwtMC41ODA5IDAuMDkzOC0wLjM1NTItMC4zNDQyYy0wLjM5LTAuMzc4MS0xLjEzNzQtMS4zNTIyLTEuNTk0OC0yLjA3OWwtMC4yOTI5LTAuNDY1NCAwLjI2NC0wLjk0MDNjMC4zMzE0LTEuMTggMC41MTM2LTIuNDQzNiAwLjQzMTQtMi45OTA0LTAuMTU4NC0xLjA1MjgtMC43OTY3LTEuNjYyNC0xLjUxNTEtMS40NDcyLTAuNDIwOCAwLjEyNjA1LTAuNTgzNSAwLjM0NzIyLTAuNzE4MyAwLjk3NjItMC4xMzU3IDAuNjMyNSAwLjAwNzEgMS42MDc4IDAuNDEyMSAyLjgxODVsMC4zMTcgMC45NDc0LTAuMzI3NCAwLjkxMDJjLTAuNDIxNyAxLjE3MjctMS4xNTEgMi44NzQ4LTEuNTA0NiAzLjUxMTctMC4yNzE3IDAuNDg5My0wLjMwMTYgMC41MTEyLTEuNTEyNSAxLjEwNjYtMS4zNjk0IDAuNjczNDktMi4yNzI0IDEuMzQxNC0yLjU1MDQgMS44ODY0LTAuMjUyMTIgMC40OTQyLTAuMjI3NjkgMC42OTU3NCAwLjEyNzM3IDEuMDUwOCAwLjI3MDEzIDAuMjcwMTMgMC4zNjU1MiAwLjMwODI0IDAuNzcxNTkgMC4zMDgyNCAwLjI4OTU2IDAgMC42MjQ0OS0wLjA3NTU3IDAuODkzLTAuMjAxNTR6bS0xLjQ2MDItMC4zMjdjLTAuNTAzOTMtMC41NTY4MyAwLjMxMzM3LTEuNDIxOCAyLjI3MzMtMi40MDU4IDAuNDYwMjMtMC4yMzEwNiAwLjg1OTA2LTAuNDIwMTMgMC44ODYyNi0wLjQyMDEzIDAuMDg3MjQyIDAtMS4wMDcgMS41NzA2LTEuNDE2MSAyLjAzMjctMC40NDc3OCAwLjUwNTc0LTEuMTA4OCAwLjk1OS0xLjM5ODUgMC45NTktMC4xMDcxNiAwLTAuMjYyMzYtMC4wNzQ1OS0wLjM0NDktMC4xNjU3OXptMTAuODctMy4yOTY4Yy0wLjUzMi0wLjE4ODQtMS4zMzgtMC42Mjk5LTEuNzY4NS0wLjk2OTdsLTAuMjIyMy0wLjE3NTMgMC40NDg5LTAuMDc2NGMwLjI0NzAyLTAuMDQxOTM5IDAuOTE4MjctMC4wNzQ2ODcgMS40OTE3LTAuMDcyNTYxIDAuODA4NTIgMC4wMDI2MyAxLjEwODQgMC4wMzg5MjMgMS4zMzU5IDAuMTYwMyAwLjQ5ODk1IDAuMjY2MjggMC41MTQzMyAwLjk0MjI1IDAuMDI3MTcgMS4xOTQyLTAuMzUzODMgMC4xODI5OC0wLjY2NDg2IDAuMTY4NjMtMS4zMTI1LTAuMDYwNTE1em0tNS43NTgzLTEuMTY4MWMwLjE5NTctMC4zODkyIDAuNTIzNC0xLjE0ODcgMC43MjgzLTEuNjg3OCAwLjIwNDgtMC41MzkxIDAuMzg0Ni0wLjk5MjUgMC4zOTk0LTEuMDA3NnMwLjEyMDkgMC4xMjc3IDAuMjM1NyAwLjMxNzNjMC4zMTIxIDAuNTE1NCAwLjk3MzEgMS4zODQ4IDEuMzY4NSAxLjhsMC4zNSAwLjM2NzUtMC45MzA2IDAuMjEyNWMtMC41MTE5IDAuMTE2OS0xLjI4NTMgMC4zMjM1LTEuNzE4OSAwLjQ1OTFsLTAuNzg4MiAwLjI0NjZ6bTAuMzc1OC00Ljk2ODFjLTAuMzIwOS0wLjk5NjMtMC40MzQ0LTEuOTc4NS0wLjI5ODctMi41ODQ5IDAuMTE2My0wLjUxOTU0IDAuMjczMi0wLjY5MDUzIDAuNjMzOC0wLjY5MDUzIDAuNTE4OTkgMCAwLjYxODA0IDEuMTMyNyAwLjIzNjY2IDIuNzA3LTAuMTI1MSAwLjUxNjQtMC4yNTk2IDAuOTk2NC0wLjI5ODkgMS4wNjY2LTAuMDQ4IDAuMDg1Ni0wLjEzNzctMC4wNzgyLTAuMjcyOS0wLjQ5ODF6IiBjbGlwLXBhdGg9InVybCgjY2xpcFBhdGg0MTg5KSIvPgo8L3N2Zz4K",

  png: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjE0IiB3aWR0aD0iMTQiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDE0IDE0Ij4KIDxyZWN0IGhlaWdodD0iMTQiIHdpZHRoPSIxNCIgeT0iMCIgeD0iMCIgZmlsbD0iI2ZmZiIvPgogPHBhdGggZmlsbD0iIzAwN2JmZiIgZD0ibTAgMHYxNGgxNHYtMTR6bTEgMWgxMnY4LjMyMjNsLTMuMjc3My0zLjI3NzQtMS44ODExIDEuNzEzMiAxLjcyNjMgMi41NTE5LTUuNjUzOC02LjUzODUtMi45MTQxIDMuNjE3MnoiLz4KPC9zdmc+",

  newtab: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjE0IiB3aWR0aD0iMTQiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDE0IDE0Ij4KPHBhdGggZD0ibTAgMHYxNGgxNHYtNy41aC0xLjV2NmgtMTF2LTExaDZ2LTEuNXptOSAwdjEuNWgzLjV2My41aDEuNXYtNXoiIGZpbGw9IiMzMjdlZTkiLz4KPHBhdGggZD0ibTEyLjQ2OSAwLjQ2ODc1LTkgOSAxLjA2MjUgMS4wNjI1IDktOS0xLjA2MjUtMS4wNjI1eiIgZmlsbD0iIzMyN2VlOSIvPgo8L3N2Zz4=",
}

function iconButton(){
  var alt,
      src,
      title,
      job,
      width,
      height;

  function exports(sel){
    sel.append("img")
      .attr("class","icon")
      .attr("alt", alt ? alt : null)
      .attr("width", width ? width : 14)
      .attr("height", height ? height : 14)
      .attr("src", src ? src : null)
      .attr("title", title ? title : null)
      .on("click", job ? job : null);
  }

  exports.alt = function(x) {
    if (!arguments.length) return alt;
    alt = x;
    return exports;
  };

  exports.src = function(x) {
    if (!arguments.length) return src;
    src = x;
    return exports;
  };

  exports.title = function(x) {
    if (!arguments.length) return title;
    title = x;
    return exports;
  };

  exports.job = function(x) {
    if (!arguments.length) return job;
    job = x;
    return exports;
  };

  exports.width = function(x) {
    if (!arguments.length) return width;
    width = x;
    return exports;
  };

  exports.height = function(x) {
    if (!arguments.length) return height;
    height = x;
    return exports;
  };

  return exports;
}

var d4paths = {
  prev: "m0 0v8h2v-4-4h-2zm2 4l6 4v-8l-6 4z",
  loop: "m3.1329 0.11716c1.4338-0.3575 2.8643 0.13082 3.821 1.1291 0.016065-0.012301 0.02753-0.019619 0.044241-0.032512 0.19187-0.16783 0.32621-0.30606 0.34546-0.32639-0.018073 0.019362-0.00687 0.00203 0.015492-0.023997 0.015502-0.021231 0.034417-0.038778 0.055946-0.055555 0.0079-0.00693 0.016534-0.01328 0.023703-0.017987 0.019283-0.011702 0.04117-0.020392 0.061919-0.026211 0.00511-0.001976 0.00913-0.002279 0.015163-0.003784 0.018339-0.004223 0.036004-0.006387 0.054644-0.006941 0.0022 0.00015449 0.00452-0.00048293 0.0066-0.0003508 0.090806-0.00008196 0.18058 0.045761 0.23114 0.13028 0.019144 0.030939 0.028822 0.064832 0.034029 0.098891l0.0003034 0.00121c0.00665 0.029486 0.011777 0.062358 0.012262 0.097616l0.025111 1.5426 0.00786 0.4839 0.00609 0.428 0.00204 0.13782c0.00526 0.28514-0.1953 0.40539-0.44493 0.26661l-0.5562-0.3094-0.1576-0.0883-0.3631-0.202-1.1159-0.621-0.0729-0.0396c-0.00854-0.00477-0.01378-0.00977-0.021154-0.01486l-0.047364-0.02846 0.00223-0.00185c-0.030207-0.020909-0.058561-0.045189-0.078568-0.078338-0.00532-0.0088-0.00821-0.019071-0.012329-0.027845-0.035072-0.065482-0.038349-0.1348-0.00875-0.20186 0.020393-0.056041 0.058174-0.10543 0.11323-0.13822 0 0 0.35195-0.064373 0.82303-0.2844-0.6664-0.601-1.5941-0.879-2.5376-0.6437-1.5201 0.379-2.4368 1.9029-2.0578 3.423 0.379 1.5202 1.9038 2.4354 3.424 2.0563 0.61-0.152 1.0836-0.5201 1.4542-0.9666 0 0 0.12103-0.16311 0.36112-0.058319 0.2402 0.1048 0.3184 0.1446 0.6025 0.2669 0.284 0.1224 0.1453 0.2773 0.1453 0.2773-0.5341 0.768-1.3034 1.3799-2.2784 1.623-2.1373 0.5329-4.317-0.7768-4.8499-2.9141-0.53294-2.1373 0.77677-4.317 2.9141-4.85z",
  pause: "m1 0v8h2v-8h-2zm4 0v8h2v-8h-2z",
  play: "M1,0L1,8L7,4Z",
  next: "m0 0v8l6-4-6-4zm6 4v4h2v-8h-2v4z",
  rec: "m8 4a4 4 0 0 1 -4 4 4 4 0 0 1 -4 -4 4 4 0 0 1 4 -4 4 4 0 0 1 4 4z",
  stop: "M0,0L8,0L8,8L0,8Z",
  resetzoom: "m9.1504 0.003906c-0.5261-0.01666-1.0639 0.03781-1.6016 0.17187-3.2061 0.79954-5.1705 4.0693-4.3711 7.2754 0.1447 0.5801 0.3727 1.1176 0.6641 1.6074l-3.5234 3.5234c-0.42548 0.42548-0.42548 1.1097 0 1.5352l0.56445 0.56445c0.42548 0.42548 1.1097 0.42548 1.5352 0l3.5273-3.5273c1.3126 0.77848 2.9169 1.0646 4.5078 0.66797 1.4626-0.36467 2.6168-1.2835 3.418-2.4355 0 0 0.20923-0.23241-0.2168-0.41602-0.426-0.1833-0.544-0.243-0.904-0.4002s-0.543 0.0879-0.543 0.0879c-0.556 0.6698-1.265 1.2212-2.18 1.4488-2.2801 0.569-4.5678-0.8031-5.1364-3.0836-0.5685-2.2802 0.8057-4.5662 3.086-5.1347 1.4153-0.35297 2.807 0.0633 3.8066 0.96484-0.70666 0.33006-1.2344 0.42773-1.2344 0.42773-0.08258 0.04919-0.13933 0.12297-0.16992 0.20703-0.0444 0.1006-0.03894 0.20452 0.01367 0.30274 0.0062 0.01315 0.0097 0.02782 0.01758 0.04102 0.03002 0.04973 0.07383 0.08777 0.11914 0.11914l-0.0039 0.002 0.07031 0.04297c0.01106 0.0076 0.02038 0.01428 0.0332 0.02148l0.10938 0.06055 1.6738 0.93164 0.54297 0.30273 0.23828 0.13281 0.83398 0.46289c0.37446 0.20818 0.67392 0.0293 0.66602-0.39844l-0.002-0.20703-0.0098-0.64258-0.01172-0.72656-0.03711-2.3125c0.001-0.0529-0.006-0.1022-0.016-0.1464l-0.002-0.002c-0.008-0.0511-0.022-0.1021-0.051-0.1485-0.075-0.1268-0.209-0.1954-0.345-0.1953-0.0033-0.000198-0.0066 0.000231-0.0098 0-0.02796 0.00072-0.05453 0.0034-0.08203 0.0098-0.0091 0.0023-0.01574 0.0029-0.02344 0.0059-0.03113 0.0087-0.06483 0.0215-0.09375 0.03906-0.01075 0.0071-0.02328 0.01702-0.03516 0.02734-0.03229 0.02515-0.06072 0.05213-0.08398 0.08398-0.03355 0.039-0.05055 0.0642-0.02344 0.03516-0.02888 0.0305-0.22976 0.23848-0.51758 0.49023-0.02507 0.01933-0.04231 0.03037-0.06641 0.04883-1.076-1.1231-2.553-1.8152-4.1308-1.8652z",
  search: "m3.1978-0.000032c-1.7605 0-3.1978 1.4354-3.1978 3.1936s1.4373 3.1936 3.1978 3.1936c0.59181 0 1.1454-0.1644 1.6218-0.44656 0.0028 0.003 0.0043 0.0064 0.0073 0.0094l1.8824 1.8799c0.22707 0.22676 0.59217 0.22676 0.81923 0l0.30122-0.30083c0.22706-0.22678 0.22706-0.5914 0-0.81816l-1.8803-1.8778c-0.0032-0.0019-0.0071-0.0024-0.01042-0.0042 0.2883-0.47928 0.45652-1.0378 0.45652-1.6353 0-1.7582-1.4373-3.1936-3.1978-3.1936zm0 0.93684c1.2537 0 2.2597 1.0047 2.2597 2.2568s-1.006 2.2578-2.2597 2.2578-2.2597-1.0057-2.2597-2.2578 1.006-2.2568 2.2597-2.2568z",
  burger: "m0 1v1.2h8v-1.2h-8zm0 2.4v1.2h8v-1.2h-8zm0 2.4v1.2h8v-1.2h-8z",
  info: "m4 0a4 4 0 0 0 -4 4 4 4 0 0 0 4 4 4 4 0 0 0 4 -4 4 4 0 0 0 -4 -4zm0 1.4855a0.8 0.8 0 0 1 0.8002 0.8002 0.8 0.8 0 0 1 -0.8002 0.8002 0.8 0.8 0 0 1 -0.8002 -0.8002 0.8 0.8 0 0 1 0.8002 -0.8002zm-1.1429 1.9431h1.7143v2.0558h0.57143v0.80131h-0.57143-1.1429-0.57143v-0.80131h0.57143v-1.4844h-0.57143v-0.57143z"
}

function getSVG(d,w,h){
  var d = "",
      w = 8,
      h = 8;

  function exports(sel){
    var svg = sel.append("svg")
      .attr("xmlns","http://www.w3.org/2000/svg")
      .attr("width",w)
      .attr("height",h)
      .attr("viewBox","0 0 8 8")
      .append("path")
        .attr("d",d)
  }

  exports.d = function(x) {
    if (!arguments.length) return d;
    d = x;
    return exports;
  };

  exports.width = function(x) {
    if (!arguments.length) return w;
    w = x;
    return exports;
  };

  exports.height = function(x) {
    if (!arguments.length) return h;
    h = x;
    return exports;
  };

  return exports;
}
