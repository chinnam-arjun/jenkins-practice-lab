# Docker-Based MySQL Integration in a Jenkins CI/CD Pipeline

## Overview

This lab demonstrates how to integrate Docker into a Jenkins Declarative Pipeline to run a MySQL database container, verify that the database is operational, execute SQL commands, and automatically remove the container after the pipeline finishes.

The objective is to practice managing a containerized database as part of an automated CI/CD workflow rather than manually starting and managing containers.

**Lab category:** Docker & CI/CD  
**Platform:** Jenkins  
**Container runtime:** Docker  
**Database:** MySQL 8.0  
**Pipeline type:** Declarative Pipeline  
**Agent:** Linux Jenkins agent

## Objectives

- Execute Docker commands from a Jenkins pipeline.
- Verify Docker availability on the Jenkins agent.
- List existing Docker images.
- Start a MySQL container dynamically for each build.
- Configure the MySQL root account using environment variables.
- Publish the container's MySQL port to the host.
- Wait until MySQL is ready to accept connections.
- Execute SQL commands inside a running container.
- Automatically clean up the container, even when a stage fails.

## Prerequisites

Before running this pipeline, ensure the following requirements are satisfied:

1. Jenkins is installed and running.
2. A Linux Jenkins agent is configured with the `linux` label.
3. Docker is installed on the Linux agent.
4. The Jenkins agent can communicate with the Docker daemon.
5. The agent has permission to execute Docker commands.
6. The agent can access the internet or a registry containing the `mysql:8.0` image.

Verify the setup on the Linux agent:

```bash
docker --version
docker images
docker info
```

The `docker info` command is especially useful because it checks whether the Docker CLI can communicate with the Docker daemon.

## Pipeline Architecture

The pipeline follows this execution flow:

```text
Jenkins Build Starts
        |
        v
Select Linux Agent
        |
        v
Check Docker Version
        |
        v
List Available Images
        |
        v
Start MySQL Container
        |
        v
Wait for MySQL Readiness
        |
        v
Execute SHOW DATABASES;
        |
        v
Run Post-Build Cleanup
        |
        v
Remove MySQL Container
        |
        v
Build Completes
```

## Pipeline Stages Explained

### 1. Select the Linux Agent

The pipeline uses:

```groovy
agent {
    label 'linux'
}
```

Jenkins schedules the pipeline on an available node matching the `linux` label.

**Why this matters:** Pipeline commands must execute on a machine where the required tools and runtime are available. Since the pipeline uses the Unix shell (`sh`) and Docker CLI, the selected agent must support them.

### 2. Check Docker Version

The first stage runs:

```bash
docker --version
```

This verifies that the Docker CLI is installed and executable on the agent.

It also helps identify the installed Docker version when troubleshooting compatibility issues.

Note that this command alone does not verify daemon connectivity; `docker info` is a stronger check for that.

### 3. List Available Docker Images

The next stage executes:

```bash
echo "Docker images available..."
docker images
```

This displays images already available in the agent's Docker environment.

The output helps identify whether the MySQL image is already present locally. If it is missing, Docker can pull it from the configured registry when the container is started.

**Key concept:** Docker images are templates used to create containers. An image can be reused to create multiple container instances.

### 4. Start the MySQL Container

The pipeline starts MySQL with the following command:

```bash
docker run -d \
  --name mysql-container-${BUILD_NUMBER} \
  -e MYSQL_ALLOW_EMPTY_PASSWORD=yes \
  -p 3307:3306 \
  mysql:8.0
```

The command runs inside a Jenkins `sh` step.

#### Command breakdown

| Option | Purpose |
|---|---|
| `docker run` | Creates and starts a container from an image. |
| `-d` | Runs the container in detached mode. |
| `--name` | Assigns a name to the container. |
| `${BUILD_NUMBER}` | Uses the Jenkins build number to generate a build-specific container name. |
| `-e` | Sets an environment variable inside the container. |
| `MYSQL_ALLOW_EMPTY_PASSWORD=yes` | Allows MySQL to initialize with an empty root password. |
| `-p 3307:3306` | Maps host port `3307` to container port `3306`. |
| `mysql:8.0` | Specifies the MySQL image and version tag. |

#### Why use a dynamic container name?

The name `mysql-container-${BUILD_NUMBER}` creates a distinct container name for each Jenkins build.

For example:

```text
mysql-container-1
mysql-container-2
mysql-container-3
```

This reduces naming conflicts between builds and makes it easier to identify which container belongs to a particular build.

The build number provides a naming convention, not complete isolation. Builds can still conflict over shared host resources, such as port `3307`.

#### Why map port 3307 to 3306?

MySQL normally listens on port `3306` inside its container.

The mapping:

```bash
-p 3307:3306
```

means:

- Host port: `3307`
- Container port: `3306`

A database client running on the Docker host can connect through the host's port `3307`, while MySQL continues listening on its standard port inside the container.

In this pipeline, subsequent SQL commands use `docker exec`, so the host port mapping is not required for those commands. It is included to practice port publishing and enable host-side connectivity.

**Security note:** An empty root password is appropriate only for an isolated, disposable learning environment. Never use this configuration for production databases. Use a strong secret and restrict network exposure in real deployments.

### 5. Wait Until MySQL Is Ready

Starting a container does not guarantee that the database inside it is ready to accept connections.

MySQL must initialize its data directory and complete its startup process before SQL commands can execute successfully.

The pipeline handles this using:

```bash
echo "Waiting for MySQL to start..."

until docker exec mysql-container-${BUILD_NUMBER} \
  mysqladmin ping -uroot --silent; do
    sleep 2
done

echo "MySQL is ready!"
```

#### How the readiness check works

1. `docker exec` runs a command inside the running MySQL container.
2. `mysqladmin ping` checks whether the MySQL server responds.
3. `-uroot` specifies the root user.
4. `--silent` reduces the command's output.
5. If the check fails, the loop sleeps for two seconds and retries.
6. When the check succeeds, the loop exits and the pipeline proceeds.

This is an example of a **readiness check**.

#### Why is this necessary?

Without a readiness check, the pipeline might attempt to execute SQL immediately after starting the container. If MySQL is still initializing, the command could fail even though the container itself is running.

**Important limitation:** The current loop has no timeout. If MySQL never becomes ready, the stage can continue retrying indefinitely. A future improvement is to add a maximum startup duration and fail the build with a useful error message when that limit is reached.

### 6. Execute SQL Inside the Container

Once MySQL is ready, the pipeline runs:

```bash
docker exec mysql-container-${BUILD_NUMBER} \
  mysql -uroot -e "SHOW DATABASES;"
```

This executes an SQL statement through the MySQL command-line client inside the running container.

#### Command breakdown

| Component | Purpose |
|---|---|
| `docker exec` | Executes a process inside an existing running container. |
| `mysql-container-${BUILD_NUMBER}` | Identifies the container for the current build. |
| `mysql` | Starts the MySQL command-line client. |
| `-uroot` | Connects as the MySQL root user. |
| `-e` | Executes the specified SQL statement and exits. |
| `SHOW DATABASES;` | Lists the databases visible to the connected account. |

The expected output includes MySQL's default system databases, such as `information_schema`, `mysql`, `performance_schema`, and `sys`.

This confirms that the pipeline can execute a SQL query against the running MySQL server.

**What this stage validates:**

- The container is running.
- The MySQL client is available inside the container.
- The server responds to the readiness check.
- The SQL statement executes successfully.

This is a basic database integration check, not a full application integration test. It does not create a custom database, validate application credentials, or test CRUD operations.

### 7. Clean Up the Container

The pipeline uses a Declarative Pipeline `post` block:

```groovy
post {
    always {
        sh 'docker rm -f mysql-container-${BUILD_NUMBER} || true'
    }
}
```

The actual pipeline also prints messages before and after removal.

The `always` condition instructs Jenkins to run the cleanup action after the pipeline's execution, regardless of whether the stages succeeded or failed.

#### Why is cleanup important?

Temporary resources should not accumulate on a Jenkins agent.

Without cleanup, repeated builds could leave stopped or running containers behind, consuming disk space and potentially causing naming or port conflicts.

#### What does `docker rm -f` do?

- `docker rm` removes a container.
- `-f` forcefully stops and removes it if necessary.
- `|| true` prevents a failed removal command from causing the cleanup step itself to fail.

The final part is useful if the container was never created or has already been removed.

**Important distinction:** `docker rm -f` removes the container, not the MySQL image. The image remains available for future builds unless separately removed.

The `post { always { ... } }` block provides basic cleanup protection, although abrupt agent termination or infrastructure failure can prevent cleanup from running. More advanced pipelines can add resource tracking and external cleanup mechanisms.

## Important Jenkins and Docker Concepts Learned

| Concept | Practical application |
|---|---|
| Declarative Pipeline | Defines a structured, stage-based CI/CD workflow. |
| Agent labels | Select the Jenkins node on which commands execute. |
| Shell steps | Execute Linux commands through Jenkins. |
| Docker CLI | Controls images and containers from a pipeline. |
| Container lifecycle | Create, use, and remove a temporary database container. |
| Environment variables | Configure MySQL initialization and reference the Jenkins build number. |
| Port publishing | Expose a container port through a host port. |
| Readiness checks | Wait for a service to become operational before testing it. |
| `docker exec` | Run database commands inside an existing container. |
| SQL automation | Execute a database query without manual interaction. |
| `post { always }` | Run cleanup after the pipeline stages finish. |
| Idempotent cleanup | Make container removal tolerant of a missing container. |

## Expected Results

When the pipeline executes successfully, the Jenkins console output should show:

1. The Docker CLI version.
2. A list of available Docker images.
3. Successful creation of the MySQL container.
4. Repeated readiness checks until MySQL responds.
5. A successful `SHOW DATABASES;` query.
6. The cleanup messages and container removal.

The exact Docker version, image list, startup duration, and database output depend on the agent and its environment.

## Limitations and Future Improvements

This is a foundational Docker-in-CI/CD exercise. The following improvements would make it more robust and closer to production practices.

- [ ] Add a timeout to the MySQL readiness loop.
- [ ] Configure a strong root password using Jenkins Credentials.
- [ ] Restrict the published port to the intended host interface when host access is needed.
- [ ] Add a dedicated application database and test user.
- [ ] Execute database initialization scripts.
- [ ] Validate CRUD operations instead of only listing databases.
- [ ] Capture container logs if startup fails.
- [ ] Use Docker health checks for service health monitoring.
- [ ] Consider a unique or dynamically allocated host port to avoid conflicts between concurrent builds.
- [ ] Add failure diagnostics while preserving reliable cleanup.

## Final Outcome

This exercise demonstrates a practical CI/CD workflow in which Jenkins uses Docker to provision a temporary MySQL environment, checks database readiness, executes an SQL command, and cleans up the container automatically.

It establishes the foundation for more advanced pipeline tasks involving database-backed application builds, integration testing, Docker Compose, multi-container environments, credentials management, and production-grade failure handling.

**Related file:** `Jenkinsfile` — maintained separately from this documentation.
