package com.reddit.recommender.scoring

final class CountMinSketch(
       val depth: Int = 5,
       val width: Int = 10000
        ) extends Serializable {

  private val table: Array[Array[Long]] = Array.fill(depth, width)(0L)
  private val seeds: Array[Int] = Array.tabulate(depth)(_ + 1)

  private def hash(value: String, i: Int): Int = {
    val h = value.hashCode ^ seeds(i)
    math.abs(h) % width
  }

  def add(item: String, count: Long = 1L): Unit = {
    var i = 0
    while (i < depth) {
      val idx = hash(item, i)
      table(i)(idx) += count
      i += 1
    }
  }

  def estimate(item: String): Long = {
    var i = 0
    var min = Long.MaxValue
    while (i < depth) {
      val idx = hash(item, i)
      val v = table(i)(idx)
      if (v < min) min = v
      i += 1
    }
    if (min == Long.MaxValue) 0L else min
  }
}
