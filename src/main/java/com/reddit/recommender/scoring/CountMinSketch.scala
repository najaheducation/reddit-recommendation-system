package com.reddit.recommender.scoring

final class CountMinSketch(
                            val depth: Int = 5,
                            val width: Int = 10000
                          ) extends Serializable {

  private val table: Array[Array[Long]] = Array.fill(depth, width)(0L)
  private val seeds: Array[Int] = Array.tabulate(depth)(_ + 1)

  private def hash(value: String, i: Int): Int = {
    if (value == null || value.isEmpty) return 0

    val h = value.hashCode ^ seeds(i)
    math.abs(h) % width
  }

  def add(item: String, count: Long = 1L): Unit = {
    if (item == null || item.isEmpty) return

    for (i <- 0 until depth) {
      val idx = hash(item, i)
      table(i)(idx) += count
    }
  }

  def estimate(item: String): Long = {
    if (item == null || item.isEmpty) return 0L

    var min = Long.MaxValue
    for (i <- 0 until depth) {
      val idx = hash(item, i)
      min = math.min(min, table(i)(idx))
    }
    min
  }
}
