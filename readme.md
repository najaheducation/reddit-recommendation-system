# Reddit SRS - Dev Setup

This gets Kafka, Zookeeper, and Postgres running on your machine.

## 1. Start Everything
Run these commands in the project root folder.

```bash
# Nuke old containers and start fresh
docker compose down -v
docker compose up -d

# Check all 3 containers are running
docker ps
```
You should see containers for `kafka`, `zookeeper`, and `postgres`.

## 2. Create the Kafka Topic
Our app needs a topic called `reddit_posts`.

```bash
# Create the topic
docker exec bigdatareddit-kafkaproducer-1 kafkaproducer-topics --bootstrap-server localhost:9092 --create --topic reddit_posts --partitions 3 --replication-factor 1

# Verify it's there
docker exec bigdatareddit-kafkaproducer-1 kafkaproducer-topics --bootstrap-server localhost:9092 --list
# Should print: reddit_posts
```

## 3. Quick Test (Optional)
Make sure data can flow.

**Terminal 1 - Listen for messages:**
```bash
docker exec -it bigdatareddit-kafkaproducer-1 kafkaproducer-console-consumer --bootstrap-server localhost:9092 --topic reddit_posts --from-beginning
```

**Terminal 2 - Send a test message:**
```bash
docker exec -it bigdatareddit-kafkaproducer-1 kafkaproducer-console-consumer --bootstrap-server localhost:9092 --topic reddit_posts
```
Type `{"test": "hello"}` and press Enter. It should appear in Terminal 1.

## 4. Shut Down
When you're done:
```bash
docker compose down -v
```

## Connection Info
- **Kafka:** `localhost:9092`
- **Postgres DB:** `redditsrs`
- **Postgres Host:** `localhost:5432`
- **Postgres User/Pass:** `postgres` / `postgres`

## Need the docker-compose.yml?
It's in the project root. If it's missing, get it from the team lead. The config forces Kafka 7.4.0 to use Zookeeper mode so it actually works.