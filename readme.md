# LinkedIn Jobs SRS - Dev Setup

This gets Kafka, Zookeeper, and MongoDB/Postgres running on your machine.

## 1. Start Everything
Run these commands in the project root folder.

```bash
# Nuke old containers and start fresh
docker compose down -v
docker compose up -d

# Check containers are running
docker ps
```

## 2. Create the Kafka Topic
Our app needs a topic called `linkedin-jobs`.

```bash
# Create the topic
docker exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic linkedin-jobs --partitions 3 --replication-factor 1

# Verify it's there
docker exec kafka kafka-topics --bootstrap-server localhost:9092 --list
# Should print: linkedin-jobs
```

## 3. Quick Test (Optional)
Make sure data can flow.

**Terminal 1 - Listen for messages:**
```bash
docker exec -it kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic linkedin-jobs --from-beginning
```

**Terminal 2 - Send a test message:**
```bash
docker exec -it kafka kafka-console-producer --bootstrap-server localhost:9092 --topic linkedin-jobs
```
Type `{"test": "hello"}` and press Enter. It should appear in Terminal 1.

## 4. Shut Down
When you're done:
```bash
docker compose down -v
```

## Connection Info
- **Kafka:** `localhost:9092`
- **MongoDB Database:** `linkedin_recommender`