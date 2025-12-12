package com.reddit.recommender.scoring

object CommentActivityCalculator {
  def compute(numComments: Int): Double = {
    if (numComments <= 0) 0.0
    else math.tanh(numComments.toDouble / 50.0)
  }
}
