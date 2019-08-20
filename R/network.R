#create json
networkJSON<-function(net){

  links <- net$links
  tree <- net$tree
  nodes <- net$nodes
  options <- net$options

  #get link intensity
  count <- 3
  while(count <= ncol(links) && is.null(options$linkIntensity)){
      if(is.numeric(links[,count]))
        options$linkIntensity <- colnames(links)[count]
      count <- count + 1
  }

  name <- nodes[[options$nodeName]] <- as.character(nodes[[options$nodeName]])

  if(length(links)){

    sourcenames <- as.character(links$Source)
    targetnames <- as.character(links$Target)

    nlinks <- nrow(links)
    source <- numeric(nlinks)
    target <- numeric(nlinks)
    for(i in seq_len(nlinks)){
      source[i] <- which(sourcenames[i]==name)-1
      target[i] <- which(targetnames[i]==name)-1
    }

    links$Source <- source
    links$Target <- target
  }
  if(length(tree)){
      sourcenames <- as.character(tree$Source)
      targetnames <- as.character(tree$Target)

      if(all(!duplicated(targetnames))){
        nlinks <- nrow(net$tree)
        source <- numeric(nlinks)
        target <- numeric(nlinks)
        for(i in seq_len(nlinks)){
          source[i] <- which(sourcenames[i]==name)-1
          target[i] <- which(targetnames[i]==name)-1
        }

        tree$Source <- source
        tree$Target <- target

        tree <- as.list(tree)
        names(tree) <- NULL
      }else{
        tree <- NULL
        warning("tree: there must be only one parent per node")
      }
  }

  nodenames <- colnames(nodes)
  nodes <- as.list(nodes)
  names(nodes) <- NULL
  json <- list(nodes = nodes, nodenames = array(nodenames))
  if(length(links)){
    linknames <- colnames(links)
    links <- as.list(links)
    names(links) <- NULL
    json$links <- links
    json$linknames <- linknames
  }
  if(length(tree))
    json$tree <- tree
  json$options <- options
  
  return(toJSON(json))
}

#start a network graph
netStart <- function(nodes,links,name="name",main=NULL,note=NULL,help=NULL,language=NULL){

links <- data.frame(Source = links[,1],Target = links[,2])
nodes <- data.frame(nodes)
names(nodes) <- name
options <- list(nodeName=name)
if(!is.null(main))
  options$main <- main
if(!is.null(note))
  options$note <- note
if(!is.null(help))
  options$help <- help
if(!is.null(language))
  options$language <- language[1]

structure(list(links = links, nodes = nodes, options = options, call = match.call()), class = "netCoin")
}

# add link attributes
netAddLinkAttr <- function(net,values,source="Source",target="Target",width=NULL,weight=NULL,color=NULL,text=NULL){
if(nrow(net$links)>0){
  net$links <- merge(net$links,values,by.x=c("Source","Target"),by.y=c(source,target),all.x=TRUE,sort=FALSE)
  if(!is.null(width))
    net$options[["linkWidth"]] <- width
  if(!is.null(weight))
    net$options[["linkWeight"]] <- weight
  if(!is.null(color))
    net$options[["linkColor"]] <- color
  if(!is.null(text))
    net$options[["linkText"]] <- text
}else{
  warning("there are no links")
}
return(net)
} 

# add node attributes
netAddNodeAttr <- function(net,values,name="name",label=NULL,group=NULL,size=NULL,color=NULL,shape=NULL,text=NULL){
net$nodes <- merge(net$nodes,values,by.x=net$options$nodeName,by.y=name,all.x=TRUE,sort=FALSE)
if(!is.null(label))
  net$options[["nodeLabel"]] <- label
if(!is.null(group))
  net$options[["nodeGroup"]] <- group
if(!is.null(size))
  net$options[["nodeSize"]] <- size
if(!is.null(color))
  net$options[["nodeColor"]] <- color
if(!is.null(shape))
  net$options[["nodeShape"]] <- shape
if(!is.null(text))
  net$options[["nodeText"]] <- text
return(net)
}

# add layout
netAddLayout <- function(net,layout){
  if(nrow(layout)==nrow(net$nodes)){
    net$options[["stopped"]] <- TRUE
    net$nodes[["fx"]] <- layout[,1]
    net$nodes[["fy"]] <- layout[,2]
  }else
    warning("layout: must have a coordinate per node")
  return(net)
}

getRawName <- function(filepath){
  filename <- strsplit(basename(filepath), split="\\.")[[1]]
  ext <- filename[length(filename)]
  filename <- paste0(filename[-length(filename)],collapse=".")
  return(paste(paste0(as.character(charToRaw(filename)),collapse=""),ext,sep="."))
}

#copy images to net graph
imgWrapper <- function(net,dir){
  imgDir <- paste(dir,"images",sep="/")
  if("imageItems" %in% names(net$options)){
    dir.create(imgDir, showWarnings = FALSE)
    if(is.null(net$options[["imageNames"]])){
      net$options[["imageNames"]] <- net$options[["imageItems"]]
      net$options[["imageItems"]] <- paste0(net$options[["imageItems"]],"_url")
      for(i in seq_along(net$options[["imageItems"]])){
        net$nodes[[net$options[["imageItems"]][i]]] <- net$nodes[[net$options[["imageNames"]][i]]]
        net$nodes[[net$options[["imageNames"]][i]]] <- sub("\\.[a-zA-Z0-9]+$","",basename(net$nodes[[net$options[["imageNames"]][i]]]))
      }
    }
    for(img in net$options[["imageItems"]]){
      net$nodes[[img]] <- vapply(net$nodes[[img]],function(filepath){
        rawname <- getRawName(filepath)
        file.copy(filepath, paste(imgDir,rawname,sep="/"))
        paste("images",rawname,sep="/")
      },character(1))
    }
  }
  if(!is.null(net$options[["background"]])){
    if(file.exists(net$options[["background"]])){
      filepath <- net$options[["background"]]
      rawname <- getRawName(filepath)
      dir.create(imgDir, showWarnings = FALSE)
      file.copy(filepath, paste(imgDir,rawname,sep="/"))
      net$options[["background"]] <- paste0('url("',paste("images",rawname,sep="/"),'")')
    }else{
      warning("background: No such file or directory")
      net$options[["background"]] <- NULL
    }
  }
  return(networkJSON(net))
}

#create html wrapper for network graph
netCreate <- function(net, dir = "netCoin"){
  #get language
  language <- getLanguageScript(net)

  createHTML(dir, c("reset.css","styles.css"), c("d3.min.js","jspdf.min.js","jszip.min.js","functions.js",language,"colorScales.js","network.js"),function(){    return(imgWrapper(net,dir))
  })
  net$dir <- dir
  invisible(net)
}

#meta function
netAll <- function(nodes,links,name="name",source="Source",target="Target",layout=NULL,language=NULL){
  net <- netStart(nodes[,name],links[,c(source,target)],name,language=language)
  net <- netAddLinkAttr(net,links,source=source,target=target)
  net <- netAddNodeAttr(net,nodes,name=name)
  if(!is.null(layout))
    net <- netAddLayout(net,layout)
  return(net)
}

#meta function for igraph objects
fromIgraph <- function(G, layout=NULL, language = c("en","es","ca"), dir=NULL, ...){
  if (class(G)=="igraph"){
    #options    
    defaults<-list(defaultColor="#1f77b4",controls=c(1,2,3),mode=c("network","heatmap"),
                   showLabels=TRUE,show=TRUE)
    defaultsNames<-setdiff(names(defaults),names(list(...)))
    oldArgs<-arguments<-c(list(...), defaults[defaultsNames])
    
    if(is.null(arguments$main)) arguments<-c(main=G$name, arguments)
    
    if("label" %in% names(arguments)) names(arguments)<-sub("^label$","nodeLabel",names(arguments))
    if("size" %in% names(arguments)) names(arguments)<-sub("^size$","nodeSize",names(arguments))
    if("color" %in% names(arguments)) names(arguments)<-sub("^color$","nodeColor",names(arguments))
    if("shape" %in% names(arguments)) names(arguments)<-sub("^shape$","nodeShape",names(arguments))
    if("group" %in% names(arguments)) names(arguments)<-sub("^group$","nodeGroup",names(arguments))
    if("text" %in% names(arguments)) names(arguments)<-sub("^text$","nodeText",names(arguments))
    if("lwidth" %in% names(arguments)) names(arguments)<-sub("^lwidth$","linkWidth",names(arguments))
    if("lweight" %in% names(arguments)) names(arguments)<-sub("^lweight$","linkWeight",names(arguments))
    if("lcolor" %in% names(arguments)) names(arguments)<-sub("^lcolor$","linkColor",names(arguments))
    if("ltext" %in% names(arguments)) names(arguments)<-sub("^ltext$","linkText",names(arguments))
    
    Arguments<-c(label="nodeLabel",size="nodeSize",color="nodeColor",shape="nodeShape",group="nodeGroup",
                 width="linkWidth",weight="linkWeight",text="linkText",lcolor="linkColor")
    #main    
    nodeNames <- V(G)$name
    if(is.null(nodeNames))
      nodeNames <- as.character(seq_along(V(G)))
    nodes <- data.frame(name=nodeNames)
    links <- get.edgelist(G)
    links <- data.frame(Source=links[,1],Target=links[,2])
    
    #vertex attributes    
    for(i in igraph::list.vertex.attributes(G)){
      nodes[[i]] <- igraph::get.vertex.attribute(G,i)
      if(i %in% names(oldArgs)) 0 # Forget igraph vertex attributes if they are in arguments (...)
      else if(i %in% igraph::vertex_attr_names(G))arguments[[Arguments[i]]]<-i
    }
    #edges attributes
    for(i in igraph::list.edge.attributes(G)){
      links[[i]] <- igraph::get.edge.attribute(G,i)
      if(i %in% names(oldArgs)) 0 # Forget igraph vertex attributes if they are in arguments (...)
      else if(i %in% igraph::edge_attr_names(G))arguments[[Arguments[i]]]<-i
    }
    # layout
    if(is.null(layout) & "x" %in% igraph::list.vertex.attributes(G) & "y" %in% igraph::list.vertex.attributes(G)) 
      layout<-matrix(c(V(G)$x,V(G)$y),ncol=2)
    else if(length(layout)==2 & class(layout)=="character")
      layout<-matrix(c(igraph::vertex_attr(G,layout[1]),igraph::vertex_attr(G,layout[2])),ncol=2)
    
    # net elaborarion    
    net <- netAll(nodes,links,layout=layout,language=language)
    net$options<-c(net$options,arguments)
    if (!is.null(dir)) net <- netCreate(net,dir=dir)
    return(net)
  }
  else warning("is not an igraph object")
}

