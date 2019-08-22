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
  createHTML(dir, c("reset.css","styles.css"), c("d3.min.js","jspdf.min.js","jszip.min.js","functions.js",language,"colorScales.js","multigraph.js","network.js","barplot.js","timeline.js"), function(){ return(multigraphJSON(multi,dir)) })
}

polyGraph <- function(multi,dir){
  createHTML(dir, NULL, "polygraph.js", toJSON(names(multi)))
  multiGraph(multi,paste0(dir,"/multiGraph"))
}

frameGraph <- function(multi,dir){
  classes <- unique(vapply(multi,function(x){ class(x)[1] },character(1)))
  if(length(classes)!=1 || classes[1]!="netCoin")
    stop("All graphs must have be 'netCoin' objects")
  name <- unique(vapply(multi,function(x){ return(x$options$nodeName) },character(1)))
  if(length(name)!=1)
    stop("name: all graphs must have the same name")
  nodenames <- colnames(multi[[1]]$nodes)
  linknames <- colnames(multi[[1]]$links)
  for(m in multi){
    if(!identical(nodenames,colnames(m$nodes)))
      stop("nodes: all graphs must have the same node columns")
    if(!identical(linknames,colnames(m$links)))
      stop("links: all graphs must have the same link columns")
  }

  frames <- names(multi)

  links <- lapply(multi,function(x){ return(x$links) })
  for(i in seq_along(frames)){
      links[[i]][["_frame_"]] <- frames[[i]]
  }
  links <- do.call(rbind,links)
  rownames(links) <- NULL

  nodes <- data.frame(name=unique(unlist(lapply(multi,function(x){ return(x$nodes[[name]]) }))))
  nodes$name <- as.character(nodes$name)
  names(nodes) <- name
  for(n in nodenames){
    if(n!=name){
      nodes[[n]] <- sapply(nodes[[name]],function(x){
        values <- sapply(frames,function(f){
          return(multi[[f]]$nodes[x,n])
        })
        aux <- unique(values[!is.na(values)])
        if(length(aux)==1)
          return(aux)
        if(length(aux)<1)
          return(NA)
        values <- as.character(values)
        values[is.na(values)] <- ""
        return(paste0(values,collapse="|"))
      })
    }
  }

  options <- multi[[1]]$options
  getAll <- function(opt,item){
      items <- vapply(multi,function(x){
        if(!is.null(x$options[[item]]))
          return(x$options[[item]])
        else
          return("")
      },character(1))
      if(length(unique(items))!=1)
        opt[[item]] <- items
      return(opt)
  }
  options <- getAll(options,"main")
  options <- getAll(options,"note")
  options$frames <- frames
  net <- structure(list(links=links,nodes=nodes,options=options),class="netCoin")
  netCoin(net,dir=dir)
}

#create html wrapper for multigraph
multigraphCreate <- function(...,  mode = c("default","parallel","frame"), dir = "MultiGraph", show = TRUE){
multi <- list(...)
if(is.null(names(multi)) || !all(!duplicated(names(multi)))){
  warning("Graph names will be generated automatically")
  names(multi) <- paste0("graph",seq_along(multi))
}
mode <- substr(mode[1],1,1)
if(mode=="p"){
  polyGraph(multi,dir)
}else if(mode=="f"){
  frameGraph(multi,dir)
}else{
  multiGraph(multi,dir)
}
if(identical(show,TRUE))
  browseURL(normalizePath(paste(dir, "index.html", sep = "/")))
}
