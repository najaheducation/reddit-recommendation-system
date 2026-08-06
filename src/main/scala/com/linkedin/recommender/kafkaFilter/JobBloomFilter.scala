package com.linkedin.recommender.kafkaFilter

import java.util.concurrent.atomic.AtomicIntegerArray
import scala.util.hashing.MurmurHash3

/**
 * Thread-safe probabilistic Bloom Filter for real-time job deduplication.
 *
 * @param expectedInsertions Expected number of unique job listings (default: 100,000)
 * @param falsePositiveRate Target false positive probability (default: 1% or 0.01)
 */
class JobBloomFilter(expectedInsertions: Int = 100000, falsePositiveRate: Double = 0.01) extends Serializable {

  // Optimal bit array size: m = - (n * ln(p)) / (ln(2)^2)
  private val numBits: Int = math.max(64, (-expectedInsertions * math.log(falsePositiveRate) / (math.log(2) * math.log(2))).toInt)

  // Optimal number of hash functions: k = (m / n) * ln(2)
  private val numHashFunctions: Int = math.max(1, ((numBits.toDouble / expectedInsertions) * math.log(2)).round.toInt)

  // Internal bit storage using AtomicIntegerArray for thread safety
  private val arraySize = (numBits + 31) / 32
  private val bitArray = new AtomicIntegerArray(arraySize)

  private val elementCount = new java.util.concurrent.atomic.AtomicLong(0)

  /**
   * Adds a Job ID or Job URL to the Bloom Filter.
   */
  def add(item: String): Unit = {
    if (item != null && item.nonEmpty) {
      val hashes = getHashes(item)
      hashes.foreach(setBit)
      elementCount.incrementAndGet()
    }
  }

  /**
   * Checks if a Job ID or Job URL might exist in the Bloom Filter.
   * @return false if the job is DEFINITELY NEW (not seen before)
   *         true if the job MIGHT BE A DUPLICATE
   */
  def mightContain(item: String): Boolean = {
    if (item == null || item.isEmpty) return false
    val hashes = getHashes(item)
    hashes.forall(getBit)
  }

  def size(): Long = elementCount.get()
  def bitSize(): Int = numBits
  def hashFunctionsCount(): Int = numHashFunctions

  private def setBit(index: Int): Unit = {
    val arrayIndex = index / 32
    val bitMask = 1 << (index % 32)
    var updated = false
    while (!updated) {
      val current = bitArray.get(arrayIndex)
      val next = current | bitMask
      updated = bitArray.compareAndSet(arrayIndex, current, next)
    }
  }

  private def getBit(index: Int): Boolean = {
    val arrayIndex = index / 32
    val bitMask = 1 << (index % 32)
    (bitArray.get(arrayIndex) & bitMask) != 0
  }

  private def getHashes(item: String): Array[Int] = {
    val h1 = MurmurHash3.stringHash(item, 0)
    val h2 = MurmurHash3.stringHash(item, h1)
    val result = new Array[Int](numHashFunctions)
    for (i <- 0 until numHashFunctions) {
      val combined = h1 + i * h2
      val positive = combined & Int.MaxValue
      result(i) = positive % numBits
    }
    result
  }
}
