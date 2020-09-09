
# netCoin <img src="man/figures/hexa_netCoin.png" align="right" alt="" width="150" />

<!-- badges: start -->

[![Lifecycle:
maturing](https://img.shields.io/badge/lifecycle-maturing-blue.svg)](https://www.tidyverse.org/lifecycle/#maturing)
[![CRAN
Status](https://www.r-pkg.org/badges/version/pkgdown)](https://cran.r-project.org/package=pkgdown)
[![R build
status](https://github.com/r-lib/pkgdown/workflows/R-CMD-check/badge.svg)](https://github.com/r-lib/pkgdown/actions)
[![Codecov test
coverage](https://codecov.io/gh/r-lib/pkgdown/branch/master/graph/badge.svg)](https://codecov.io/gh/r-lib/pkgdown?branch=master)
<!-- badges: end -->

This package integrates traditional statistical techniques with
automatic learning and social network analysis tools for the purpose of
obtaining visual and interactive displays of data.

# Installation

To install the last version of the package:

``` r
# Install development version
devtools::install_github("Modesto-Escobar/netCoin-1.0")
```

The stable version is available in CRAN:

``` r
# Install CRAN version
install.packages("netCoin")
```

# Usage

The most simple way to run the coincidence analysis from a data frame is
to use the `surCoin()` function:

``` r
# A data frame with two variables Gender and Opinion
my_data <- data.frame(Gender = c(rep("Man", 3), rep("Woman", 3)),
                      Opinion = c("Yes","Yes","No","No","No","Yes")
                     )

plot(surCoin(my_data)) # plot network object
```

<iframe width="850" height="850" src="https://sociocav.usal.es/me/CIS/" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen>

</iframe>

# Citation and documentation

To cite this package `citation("netCoin")`:

Modesto Escobar, David Barrios, Carlos Prieto and Luis Martinez-Uribe.
(2019). *netCoin: Interactive Analytic Networks*. R package version
1.0.0.

Full documentation can be found in [the
link](https://cran.r-project.org/web/packages/netCoin/netCoin.pdf) and a
cheatsheet can be downloaded from [here]().
