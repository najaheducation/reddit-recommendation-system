package com.reddit.recommender.analytics.cms

import scala.util.hashing.MurmurHash3

final class CountMinSketch(
                            epsilon: Double,
                            delta: Double,
                            seed: Int = 42
                          ) extends Serializable {

  private val width  = math.ceil(math.E / epsilon).toInt
  private val depth  = math.ceil(math.log(1.0 / delta)).toInt

  private val table =
    Array.fill(depth, width)(0L)

  private val seeds =
    Array.tabulate(depth)(i => seed + i * 31)

  def add(item: String, count: Long = 1L): Unit =
    for (i <- 0 until depth) {
      table(i)(index(item, seeds(i))) += count
    }

  def estimate(item: String): Long =
    (0 until depth)
      .map(i => table(i)(index(item, seeds(i))))
      .min

  private def index(value: String, seed: Int): Int =
    (MurmurHash3.stringHash(value, seed) & Int.MaxValue) % width

  def memoryBytes: Long =
    depth.toLong * width.toLong * java.lang.Long.BYTES
}
