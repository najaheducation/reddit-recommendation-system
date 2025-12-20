package com.reddit.recommender.analytics

import java.io.File
import scala.io.Source
import scala.util.control.NonFatal

object StopWordsLoader {

  def load(pathOrResource: String): Set[String] =
    Option(pathOrResource)
      .map(_.trim)
      .filter(_.nonEmpty)
      .flatMap(loadFromFile)
      .orElse(loadFromResource(pathOrResource))
      .getOrElse {
        println(s"[WARN] Stopwords not found: $pathOrResource")
        Set.empty
      }

  // ---------- helpers ----------

  private def loadFromFile(path: String): Option[Set[String]] = {
    val file = new File(path)
    if (!file.exists()) None
    else Some(read(Source.fromFile(file, "UTF-8")))
  }

  private def loadFromResource(name: String): Option[Set[String]] =
    Option(getClass.getClassLoader.getResourceAsStream(name))
      .map(Source.fromInputStream(_, "UTF-8"))
      .map(read)

  private def read(src: Source): Set[String] =
    try {
      src.getLines()
        .flatMap(_.split("[,;\\s\\t]+"))
        .map(_.trim.toLowerCase)
        .filter(w => w.nonEmpty && !w.startsWith("#"))
        .toSet
    } catch {
      case NonFatal(e) =>
        println(s"[WARN] Stopwords load failed: ${e.getMessage}")
        Set.empty
    } finally {
      src.close()
    }
}
