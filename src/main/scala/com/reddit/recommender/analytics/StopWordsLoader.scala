package com.reddit.recommender.analytics

import java.io.{File, InputStream}
import scala.io.Source
import scala.util.control.NonFatal

object StopWordsLoader {

  def load(pathOrResource: String): Set[String] = {
    if (pathOrResource == null || pathOrResource.trim.isEmpty) return Set.empty

    val file = new File(pathOrResource)
    if (file.exists()) {
      return readSource(Source.fromFile(file, "UTF-8"))
    }

    val is: InputStream =
      Option(Thread.currentThread().getContextClassLoader.getResourceAsStream(pathOrResource))
        .orElse(Option(getClass.getClassLoader.getResourceAsStream(pathOrResource)))
        .orNull

    if (is == null) {
      println(s"[WARN] Stopwords not found as file or resource: $pathOrResource")
      return Set.empty
    }

    val src = Source.fromInputStream(is, "UTF-8")
    try readSource(src)
    finally src.close()
  }

  private def readSource(src: Source): Set[String] = {
    try {
      src.getLines()
        .flatMap(_.split("[,;\\s\\t]+"))
        .map { w =>
          w.replace("\uFEFF", "")  
            .toLowerCase
            .trim
        }
        .filter(w => w.nonEmpty && !w.startsWith("#"))
        .toSet
    } catch {
      case NonFatal(e) =>
        println(s"[WARN] Stopwords load failed: ${e.getMessage}")
        Set.empty
    }
  }
}
