package com.reddit.recommender.scoring

object CommentActivityCalculator {
  def compute(numComments: Int): Double = {
    math.tanh(numComments.toDouble / 50.0)
  }
}
