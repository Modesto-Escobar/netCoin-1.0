\name{saveGexf}
\alias{saveGexf}
\title{Save a netCoin object as a .gexf file to be read in Gephi, Pajek, ...}
\description{
\code{savePajek} produces a .gexf file from a netCoin object. 
}
\value{
The function creates a file with vertices and arcs or edges of a netCoin object. 
}
\usage{
saveGexf(netCoin, file="netCoin.gexf", edgesWeight=NULL)
}
\arguments{
\item{netCoin}{a netCoin object.}
\item{file}{The name of the file. If not extension, .gexf is used as default.}
\item{edgesWeight}{Name of the edges attribute to be considered as edges weight.}
}
\author{
Modesto Escobar, Department of Sociology and Communication, University of Salamanca. See \url{https://sociocav.usal.es/blog/modesto-escobar/}
}
\examples{
\dontrun{
# A character column (with separator)
frame <- data.frame(A = c("Man; Women", "Women; Women",
                        "Man; Man", "Undet.; Women; Man"))
data <- dichotomize(frame, "A", add=FALSE, sep = "; ")
graph <- allNet(data, maxL=.5) # graph from an incidence matrix

saveGexf(graph,"graph",edgesWeight="Haberman") # save graph.net file
}
}

