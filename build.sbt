//ThisBuild / scalaVersion := "2.12.18"
//ThisBuild / version      := "1.0-SNAPSHOT"
//ThisBuild / organization := "com.reddit.recommender"
//
//name := "reddit-srs"
//
//libraryDependencies ++= Seq(
//  "org.apache.spark" %% "spark-core"                     % "3.3.0" % "provided",
//  "org.apache.spark" %% "spark-sql"                      % "3.3.0" % "provided",
//  "org.apache.spark" %% "spark-streaming"                % "3.3.0" % "provided",
//  "org.apache.spark" %% "spark-streaming-kafka-0-10"     % "3.3.0",
//
//  "org.apache.kafka" %  "kafka-clients"                  % "3.4.0",
//  "org.postgresql"   %  "postgresql"                     % "42.5.0",
//
//  "org.json"         %  "json"                           % "20240303",
//  "io.circe" %% "circe-core"    % "0.14.8",
//  "io.circe" %% "circe-generic" % "0.14.8",
//  "io.circe" %% "circe-parser"  % "0.14.8",
//
//  "org.typelevel"    %% "cats-core"                      % "2.10.0",
//  "dev.zio" %% "zio" % "2.0.22",
//  "com.softwaremill.sttp.client3" %% "core" % "3.9.7",
//  "com.softwaremill.sttp.client3" %% "circe" % "3.9.7",  // Fixes import sttp.client3.circe._
//  "com.softwaremill.sttp.client3" %% "async-http-client-backend-future" % "3.9.7",  // Fixes Future backend
//
//  // For non-blocking delay in pollUntilComplete
//  "com.typesafe.akka" %% "akka-actor" % "2.6.20"  // Compatible with Scala 2.12
//)