# create json for multigraph
multigraphJSON <- function(multi,dir){
json <- character(0)
for(item in names(multi)){
  graph <- multi[[item]]
  gClass <- class(graph)
  jsongraph <- "{}"
  if(gClass == "netCoin"){
    jsongraph <- imgWrapper(graph,dir)
  }else if(gClass == "timeCoin"){
    jsongraph <- timelineJSON(graph)
  }else if(gClass == "barCoin"){
    jsongraph <- barplotJSON(graph)
  }else if(gClass == "character" && file.exists(paste0(graph,'/index.html'))){
    gClass <- 'iFrame'
    graphName <- sub("^.*/","",graph)
    dir.create(paste0(dir,'/data'), showWarnings = FALSE)
    file.copy(graph, paste0(dir,'/data'), recursive = TRUE)
    jsongraph <- toJSON(paste0('data/',graphName))
  }else{
    warning(paste0('Not supported object "',item,'".'))
    next
  }
  json <- c(json,paste0('"',item,'":["',gClass,'",',jsongraph,']'))
}
json <- paste0("{",paste0(json,collapse=","),"}")
return(json)
}

multiGraph <- function(multi,dir){
  language <- unique(sapply(multi,getLanguageScript))
  if(length(language)!=1)
    language <- "en.js"
  createHTML(dir, c("reset.css","styles.css"), c("d3.min.js","jspdf.min.js","functions.js",language,"colorScales.js","multigraph.js","network.js","barplot.js","timeline.js"), function(){ return(multigraphJSON(multi,dir)) })
}

polyGraph <- function(multi,dir){
  createHTML(dir, NULL, c("d3.min.js","polygraph.js"), toJSON(names(multi)))
  multiGraph(multi,paste0(dir,"/multiGraph"))
}

#create html wrapper for multigraph
multigraphCreate <- function(...,  parallel = FALSE, dir = "MultiGraph", show = TRUE){
multi <- list(...)
if(is.null(names(multi)) || !all(!duplicated(names(multi)))){
  warning("Graph names will be generated automatically.")
  names(multi) <- paste0("graph",seq_along(multi))
}
if(parallel){
  polyGraph(multi,dir)
}else{
  multiGraph(multi,dir)
}
if(identical(show,TRUE))
  browseURL(normalizePath(paste(dir, "index.html", sep = "/")))
}
