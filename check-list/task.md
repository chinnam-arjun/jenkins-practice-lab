Yes. I’d structure this as a **progressive Jenkins lab**, where every phase produces a working pipeline and introduces only the concepts needed for the next level.

The end goal is not “learn Jenkins syntax.” It is:

> **Git push → CI → tests → build → artifact → container → security checks → deployment → approval → production → rollback → monitoring**

---

# Jenkins CI/CD Practice Roadmap

## 0. Target architecture

By the end, you should be comfortable with something like:

```text
                         GitHub
                           │
                           │ webhook
                           ▼
                    ┌─────────────┐
                    │   Jenkins   │
                    │ Controller  │
                    └──────┬──────┘
                           │
              ┌────────────┼─────────────┐
              │            │             │
              ▼            ▼             ▼
         Linux Agent   Windows Agent   Docker Agent
              │            │             │
              └────────────┼─────────────┘
                           │
                    Build / Test / Scan
                           │
                           ▼
                     Docker Image
                           │
                           ▼
                    Container Registry
                           │
                    ┌──────┴──────┐
                    ▼             ▼
                Staging       Production
                    │             │
                    └──────┬──────┘
                           ▼
                     Monitoring
                           │
                           ▼
                       Rollback
```

You **should not build this entire thing initially**.

We'll progressively reach it.

---

# Phase 0 — Prerequisites

Before Jenkins, establish your lab environment.

## A. Linux fundamentals

You should know:

```bash
pwd
ls
cd
mkdir
cp
mv
rm
cat
less
grep
find
awk
sed
curl
wget
chmod
chown
ps
top
kill
df
du
free
systemctl
journalctl
ssh
scp
```

Also understand:

```text
process
PID
service
daemon
environment variable
PATH
permissions
user/group
SSH
ports
logs
filesystem
```

### Production usage

These become important when:

* Jenkins agent is offline
* deployment script hangs
* disk becomes full
* service fails
* Docker daemon isn't running
* permissions break deployment

---

# Phase 1 — Git fundamentals

Before Jenkins, become comfortable with Git.

### Topics

```text
repository
commit
branch
merge
rebase
remote
origin
pull
push
tag
.gitignore
GitHub
SSH authentication
webhooks
```

Practice:

```bash
git init
git clone
git status
git add
git commit
git push
git pull
git branch
git checkout
git switch
git merge
git tag
```

### Production usage

Jenkins normally doesn't magically know when your code changes.

Typical flow:

```text
Developer
   │
   ▼
git push
   │
   ▼
GitHub webhook
   │
   ▼
Jenkins
```

---

# Phase 2 — Jenkins installation & architecture

Now install Jenkins.

## Recommended lab

Since you're working with Linux/Windows/WSL:

```text
Windows 11
   │
   ├── WSL2 Ubuntu
   │       │
   │       └── Jenkins Controller
   │
   ├── Docker Desktop
   │
   └── Windows Jenkins Agent
```

Later:

```text
AWS EC2
   │
   └── Linux Jenkins Agent
```

---

# Phase 3 — Jenkins fundamentals

## Learn Jenkins architecture

Understand:

```text
Controller
Agent
Executor
Node
Workspace
Job
Build
Pipeline
Stage
Step
Artifact
Credential
Plugin
```

Very important distinction:

```text
Jenkins Controller
       │
       │ assigns work
       ▼
Jenkins Agent
       │
       ▼
Workspace
       │
       ▼
Commands execute here
```

Don't treat Jenkins as simply "a server that runs scripts."

---

# Phase 4 — First freestyle job

Don't start with Jenkinsfile.

First understand Jenkins manually.

Create:

```text
Job 1
```

Execute:

```bash
echo "Hello Jenkins"
```

Then:

```bash
echo "Current directory:"
pwd

echo "Current user:"
whoami

echo "Environment:"
env
```

Then configure:

```text
Build periodically
Build after GitHub push
Parameters
Workspace
Console output
```

### Topics

* Job configuration
* Build history
* Console output
* Workspace
* Environment variables
* Parameters
* Build triggers

### Production usage

Freestyle jobs still exist in older Jenkins environments, but modern teams generally prefer **Pipeline as Code**.

---

# Phase 5 — Your first Jenkinsfile

Now move to Pipeline.

Create:

```text
Jenkinsfile
```

Start extremely simple:

```groovy
pipeline {
    agent any

    stages {

        stage('Hello') {
            steps {
                echo 'Hello Jenkins'
            }
        }

        stage('System Info') {
            steps {
                sh '''
                    whoami
                    pwd
                    uname -a
                '''
            }
        }
    }
}
```

Understand every keyword:

```text
pipeline
agent
stages
stage
steps
sh
echo
```

---

# Phase 6 — Basic CI pipeline

Now use an actual application.

I recommend starting with a **Node.js/React or Python application**, because you're already familiar with web development.

Example:

```text
GitHub
   │
   ▼
Checkout
   │
   ▼
Install dependencies
   │
   ▼
Lint
   │
   ▼
Unit tests
   │
   ▼
Build
   │
   ▼
Archive artifact
```

Jenkinsfile:

```groovy
pipeline {

    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Archive') {
            steps {
                archiveArtifacts artifacts: 'dist/**',
                fingerprint: true
            }
        }
    }
}
```

### Topics to learn

```text
checkout
npm ci
environment
archiveArtifacts
fingerprint
post
failure
success
always
```

---

# Phase 7 — Environment variables & parameters

Now make the pipeline configurable.

```groovy
pipeline {

    agent any

    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['dev', 'staging', 'production'],
            description: 'Deployment environment'
        )
    }

    environment {
        APP_NAME = 'my-app'
    }

    stages {

        stage('Information') {
            steps {
                echo "Application: ${APP_NAME}"
                echo "Environment: ${params.ENVIRONMENT}"
            }
        }
    }
}
```

Learn:

```text
env.X
params.X
environment {}
parameters {}
```

### Production usage

Same pipeline can behave differently:

```text
DEV
STAGING
PRODUCTION
```

without maintaining three completely different pipelines.

---

# Phase 8 — Credentials

This is one of the most important Jenkins topics.

Never do this:

```groovy
environment {
    AWS_SECRET = 'abc123'
}
```

Instead:

```text
Jenkins
  │
  ▼
Credentials
  │
  ├── GitHub SSH key
  ├── Docker registry credentials
  ├── AWS credentials
  ├── SSH key
  └── API tokens
```

Example:

```groovy
withCredentials([
    usernamePassword(
        credentialsId: 'dockerhub',
        usernameVariable: 'DOCKER_USER',
        passwordVariable: 'DOCKER_PASS'
    )
]) {

    sh '''
        echo "$DOCKER_PASS" | docker login \
        -u "$DOCKER_USER" \
        --password-stdin
    '''
}
```

### Topics

```text
Credentials Store
Secret Text
Username/Password
SSH Username with Private Key
AWS credentials
Secret masking
credentialId
withCredentials
```

### Production usage

This is fundamental to:

* cloud deployments
* Docker registries
* Git repositories
* Kubernetes
* SSH deployments
* databases
* APIs

---

# Phase 9 — Linux + Windows Jenkins Agents

Now build your multi-agent environment.

## Linux agent

```text
Jenkins Controller
        │
        │ SSH
        ▼
Ubuntu Agent
```

Label:

```text
linux
```

Pipeline:

```groovy
pipeline {

    agent {
        label 'linux'
    }

    stages {

        stage('Linux Build') {
            steps {
                sh 'uname -a'
            }
        }
    }
}
```

---

## Windows agent

```text
Jenkins Controller
        │
        │ agent connection
        ▼
Windows Agent
```

Label:

```text
windows
```

Pipeline:

```groovy
pipeline {

    agent {
        label 'windows'
    }

    stages {

        stage('Windows Build') {
            steps {
                bat 'echo %USERNAME%'
            }
        }
    }
}
```

### Learn

```text
node
agent
label
executor
workspace
SSH agents
Windows agents
Linux agents
```

### Real production usage

Different workloads need different environments:

```text
Linux → Node/Python/Java/Docker
Windows → .NET/Windows applications
macOS → iOS builds
GPU agent → ML workloads
Docker agent → isolated builds
```

---

# Phase 10 — Parallel pipelines

Now start thinking like a CI/CD engineer.

Instead of:

```text
Lint
 ↓
Unit Test
 ↓
Security Scan
 ↓
Build
```

you can do:

```text
          ┌── Lint ────────┐
          │                │
Checkout ─┼── Unit Tests ──┼── Build
          │                │
          └── Security ────┘
```

Example:

```groovy
stage('Quality Checks') {

    parallel {

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'npm test'
            }
        }

        stage('Security') {
            steps {
                sh 'npm audit'
            }
        }
    }
}
```

### Topics

```text
parallel
failFast
pipeline optimization
executor utilization
```

### Production usage

Reduces CI time.

Example:

```text
Sequential: 12 minutes

Parallel:
  lint       2m
  tests      5m
  security   3m

≈ 5–6 minutes
```

---

# Phase 11 — Docker CI/CD

Now bring Docker into Jenkins.

Your architecture becomes:

```text
GitHub
   ↓
Jenkins
   ↓
Docker Build
   ↓
Docker Image
   ↓
Registry
```

Jenkins:

```groovy
stage('Docker Build') {
    steps {
        sh '''
            docker build \
                -t myapp:${BUILD_NUMBER} .
        '''
    }
}
```

Then:

```groovy
stage('Docker Test') {
    steps {
        sh '''
            docker run --rm \
                myapp:${BUILD_NUMBER}
        '''
    }
}
```

Then push:

```groovy
stage('Push Image') {
    steps {
        sh '''
            docker push myapp:${BUILD_NUMBER}
        '''
    }
}
```

### Learn

```text
Dockerfile
image
container
tag
registry
Docker Hub
ECR
container networking
volumes
Docker daemon
Docker socket
build context
multi-stage builds
```

---

# Phase 12 — Docker-in-Docker vs Docker socket

This is an important production concept.

Understand these architectures:

### Option A

```text
Jenkins Agent
      │
      ▼
Docker daemon
```

### Option B

```text
Jenkins
   │
   ▼
Docker container
   │
   ▼
Docker daemon
```

Understand:

```text
Docker-in-Docker
Docker-outside-of-Docker
Docker socket
/var/run/docker.sock
```

And the security implications.

Don't blindly mount:

```bash
/var/run/docker.sock
```

into every container.

---

# Phase 13 — Dockerized Jenkins agents

Now instead of maintaining every tool on the agent:

```text
Agent
 ├── Java
 ├── Node
 ├── Python
 ├── Maven
 ├── Docker
 └── other tools
```

use ephemeral environments.

Conceptually:

```text
Jenkins
   │
   ├── Node container
   ├── Python container
   └── Java container
```

Example:

```groovy
pipeline {

    agent {
        docker {
            image 'node:22'
        }
    }

    stages {

        stage('Build') {
            steps {
                sh '''
                    node --version
                    npm --version
                    npm ci
                    npm run build
                '''
            }
        }
    }
}
```

### Production usage

This provides:

```text
consistent build environment
reproducibility
less agent configuration
isolation
ephemeral infrastructure
```

---

# Phase 14 — Artifact management

Separate:

```text
Source Code
       ↓
Build
       ↓
Artifact
       ↓
Deployment
```

For example:

```text
app.zip
backend.jar
frontend.tar.gz
Docker image
```

Learn:

```text
archiveArtifacts
artifact repository
Nexus
Artifactory
AWS S3
Docker registry
ECR
```

Important principle:

> **Build once, deploy the same artifact everywhere.**

Avoid:

```text
Build DEV
Build STAGING
Build PROD
```

Prefer:

```text
Build
  ↓
Artifact v1.8.3
  ↓
DEV
  ↓
STAGING
  ↓
PRODUCTION
```

---

# Phase 15 — CI/CD with AWS

This is where your Jenkins practice becomes highly relevant to your DevOps portfolio.

Architecture:

```text
GitHub
   │
   ▼
Jenkins
   │
   ├── Test
   ├── Build
   ├── Docker
   └── Security
         │
         ▼
       AWS ECR
         │
         ▼
      AWS ECS/EC2
```

Start with EC2 because you already understand it.

Pipeline:

```text
Git push
   ↓
Jenkins
   ↓
Docker build
   ↓
ECR
   ↓
EC2
   ↓
docker pull
   ↓
docker run
```

---

# Phase 16 — SSH deployment

Learn how Jenkins deploys to a remote Linux server.

```text
Jenkins
   │
   │ SSH
   ▼
EC2
   │
   ├── docker pull
   ├── stop old container
   └── start new container
```

Example concept:

```groovy
sshagent(['ec2-ssh']) {

    sh '''
        ssh ubuntu@$SERVER << EOF

        docker pull $IMAGE

        docker stop myapp || true
        docker rm myapp || true

        docker run -d \
          --name myapp \
          -p 80:3000 \
          $IMAGE

        EOF
    '''
}
```

### Learn

```text
SSH
known_hosts
SSH agent
deployment scripts
remote commands
idempotency
health checks
```

---

# Phase 17 — Staging → Production

Now introduce environments properly.

```text
                ┌── DEV
                │
Git → CI → Build ┼── STAGING
                │
                └── PROD
```

Pipeline:

```groovy
stage('Deploy Staging') {
    steps {
        sh './deploy.sh staging'
    }
}

stage('Approval') {
    steps {
        input message: 'Deploy to production?'
    }
}

stage('Deploy Production') {
    steps {
        sh './deploy.sh production'
    }
}
```

### Production concept

Not every successful build should automatically reach production.

You may have:

```text
automated CI
      ↓
automated staging
      ↓
automated tests
      ↓
human approval
      ↓
production
```

---

# Phase 18 — Health checks & deployment validation

Never assume:

```text
docker run
```

means:

```text
application is healthy
```

Add:

```bash
curl http://localhost:3000/health
```

Pipeline:

```groovy
stage('Health Check') {
    steps {
        sh '''
            for i in {1..10}; do

                if curl -f http://localhost:3000/health; then
                    exit 0
                fi

                sleep 5
            done

            exit 1
        '''
    }
}
```

### Learn

```text
health endpoint
readiness
liveness
retry
timeout
deployment validation
```

---

# Phase 19 — Rollback

This is where pipelines start becoming production-grade.

Suppose:

```text
Production
    │
    └── v1.4.0 ❌
```

Rollback:

```text
v1.4.0
   ↓
v1.3.9
```

Your pipeline should know:

```text
current version
previous version
artifact/image tag
deployment state
```

Example:

```text
myapp:1.3.9
myapp:1.4.0
```

Never rely only on:

```text
latest
```

Prefer immutable versions.

---

# Phase 20 — Blue/Green deployment

Architecture:

```text
              Load Balancer
                   │
          ┌────────┴────────┐
          ▼                 ▼
       Blue v1            Green v2
       ACTIVE              NEW
```

Test Green:

```text
Green
 ↓
Health check
 ↓
Smoke tests
 ↓
Switch traffic
```

Rollback:

```text
Green ❌
 ↓
Traffic → Blue
```

### Production usage

Used when downtime must be minimized and rollback needs to be fast.

---

# Phase 21 — Canary deployment

Now:

```text
Production traffic
        │
        ├── 95% → v1
        │
        └── 5%  → v2
```

Then:

```text
5%
 ↓
20%
 ↓
50%
 ↓
100%
```

Only increase traffic after validation.

Learn:

```text
canary
traffic shifting
metrics
automated rollback
progressive delivery
```

This usually involves infrastructure/platform tooling beyond Jenkins itself.

---

# Phase 22 — Jenkins + Kubernetes

Now move beyond EC2.

Architecture:

```text
Jenkins
   │
   ▼
Kubernetes
   │
   ├── Pod
   │    └── Application
   │
   ├── Service
   │
   └── Ingress
```

Learn:

```text
Pod
Deployment
Service
ConfigMap
Secret
Namespace
Ingress
Helm
kubectl
rolling update
rollback
```

Jenkins becomes the orchestrator of delivery rather than the application host.

---

# Phase 23 — Jenkins Kubernetes agents

Now make Jenkins itself dynamically provision agents.

Instead of:

```text
Jenkins
 └── permanent agent
```

you get:

```text
Jenkins Controller
       │
       ├── temporary pod
       ├── temporary pod
       └── temporary pod
```

Pipeline runs:

```text
Create agent
   ↓
Build
   ↓
Test
   ↓
Destroy agent
```

### Production benefit

Massively improves scalability and isolation.

---

# Phase 24 — Security pipeline

Now introduce DevSecOps.

Your pipeline becomes:

```text
Checkout
   ↓
SAST
   ↓
Dependency Scan
   ↓
Secret Scan
   ↓
Build
   ↓
Container Scan
   ↓
Deploy
```

Tools you can practice:

```text
SonarQube
Trivy
OWASP Dependency-Check
Gitleaks
npm audit
Snyk
```

Example:

```groovy
stage('Container Scan') {
    steps {
        sh '''
            trivy image \
              --severity HIGH,CRITICAL \
              myapp:${BUILD_NUMBER}
        '''
    }
}
```

---

# Phase 25 — Quality gates

Instead of simply:

```text
SonarQube scan
   ↓
continue
```

you implement:

```text
SonarQube
    ↓
Quality Gate
    │
    ├── PASS → Continue
    │
    └── FAIL → Stop
```

Learn:

```text
quality gates
code coverage
technical debt
vulnerabilities
code smells
static analysis
```

---

# Phase 26 — Notifications

Production pipeline should communicate.

```text
Build failed
     ↓
Slack / Teams / Email
```

Notifications for:

```text
build success
build failure
deployment
rollback
security failure
production deployment
```

Also learn why blindly notifying every event creates **alert fatigue**.

---

# Phase 27 — Observability

Your pipeline should eventually interact with:

```text
Jenkins
   │
   ├── Logs
   ├── Metrics
   └── Deployment status
             │
             ▼
        Monitoring
```

Learn:

```text
Prometheus
Grafana
CloudWatch
ELK/OpenSearch
application logs
deployment metrics
```

For AWS:

```text
Jenkins
  ↓
AWS
  ↓
CloudWatch
```

---

# Phase 28 — Pipeline reliability

Now deliberately break your pipeline.

Practice failures such as:

```text
Docker unavailable
disk full
network timeout
GitHub unavailable
bad credentials
wrong AWS credentials
failed unit test
failed Docker build
broken deployment
health check failure
SSH failure
agent disconnected
```

Then learn:

```groovy
retry(3) {
    sh './deploy.sh'
}
```

and:

```groovy
timeout(time: 10, unit: 'MINUTES') {
    sh './deploy.sh'
}
```

and:

```groovy
post {
    always {
        archiveArtifacts ...
    }

    failure {
        echo 'Pipeline failed'
    }
}
```

This is **far more valuable than memorizing Jenkins syntax**.

---

# Phase 29 — Shared Libraries

Once you have multiple Jenkinsfiles, you'll notice duplication.

Example:

```text
Project A
deploy.sh
security.sh

Project B
deploy.sh
security.sh

Project C
deploy.sh
security.sh
```

Instead:

```text
Jenkins Shared Library
        │
        ├── build()
        ├── test()
        ├── securityScan()
        ├── dockerBuild()
        └── deploy()
```

Pipeline:

```groovy
@Library('company-pipeline') _

standardPipeline {
    application = 'myapp'
}
```

### Production usage

Large organizations often have many repositories.

Shared libraries enforce:

```text
standardization
security
reusability
governance
```

---

# Phase 30 — Production-grade Jenkins architecture

Finally learn Jenkins itself as production infrastructure.

Architecture:

```text
                  Users
                    │
                    ▼
             Load Balancer
                    │
                    ▼
             Jenkins Controller
                    │
       ┌────────────┼─────────────┐
       │            │             │
       ▼            ▼             ▼
   Linux Agent  Docker Agent  Windows Agent
       │
       ▼
 Kubernetes / AWS
       │
       ├── Dev
       ├── Staging
       └── Production
```

Learn:

```text
Jenkins HA considerations
controller backup
Jenkins home
plugin management
RBAC
Matrix permissions
SSO
audit logging
credential management
agent isolation
controller security
JCasC
Configuration as Code
Job DSL
shared libraries
backup/restore
plugin compatibility
scaling
```

---

# The complete progression

I'd use this exact sequence:

| Phase | Level         | Main Focus               |
| ----- | ------------- | ------------------------ |
| 0     | Prerequisite  | Linux + Git              |
| 1     | Beginner      | Jenkins installation     |
| 2     | Beginner      | Jenkins architecture     |
| 3     | Beginner      | Freestyle jobs           |
| 4     | Beginner      | First Jenkinsfile        |
| 5     | Beginner      | Basic CI                 |
| 6     | Beginner+     | Environment variables    |
| 7     | Beginner+     | Credentials              |
| 8     | Intermediate  | Linux agents             |
| 9     | Intermediate  | Windows agents           |
| 10    | Intermediate  | Parallel pipelines       |
| 11    | Intermediate  | Docker CI                |
| 12    | Intermediate  | Docker agents            |
| 13    | Intermediate  | Artifacts                |
| 14    | Intermediate  | AWS deployment           |
| 15    | Intermediate+ | SSH deployment           |
| 16    | Intermediate+ | Staging/production       |
| 17    | Advanced      | Health checks            |
| 18    | Advanced      | Rollbacks                |
| 19    | Advanced      | Blue/Green               |
| 20    | Advanced      | Canary                   |
| 21    | Advanced      | Kubernetes               |
| 22    | Advanced      | Dynamic K8s agents       |
| 23    | Advanced      | DevSecOps                |
| 24    | Advanced      | Quality gates            |
| 25    | Advanced      | Notifications            |
| 26    | Advanced      | Observability            |
| 27    | Advanced      | Failure engineering      |
| 28    | Advanced      | Shared Libraries         |
| 29    | Production    | Jenkins security         |
| 30    | Production    | JCasC + scalable Jenkins |

---

# What I recommend you actually build

Don't make 30 unrelated toy projects.

Make **one application evolve through 30 CI/CD versions**.

For example:

```text
devops-jenkins-lab/
│
├── app/
├── tests/
├── Dockerfile
├── Jenkinsfile
├── docker-compose.yml
├── deploy/
│   ├── dev.sh
│   ├── staging.sh
│   └── production.sh
├── k8s/
├── helm/
├── scripts/
├── security/
└── README.md
```

Then:

### Version 1

```text
Git → Jenkins → echo
```

### Version 2

```text
Git → Jenkins → Build → Test
```

### Version 3

```text
Git → Jenkins → Build → Test → Artifact
```

### Version 4

```text
Git → Jenkins → Docker Build
```

### Version 5

```text
Git → Jenkins → Docker → Registry
```

### Version 6

```text
Git → Jenkins → Docker → ECR → EC2
```

### Version 7

```text
Git → Jenkins → CI → Staging → Approval → Production
```

### Version 8

```text
             ┌→ Test
Git → Jenkins ├→ Security
             └→ Build
                 ↓
              Docker
                 ↓
                ECR
                 ↓
              Staging
                 ↓
            Health Check
                 ↓
              Approval
                 ↓
               Prod
```

### Version 9

Add:

```text
Rollback
```

### Version 10

Add:

```text
Blue/Green
```

### Version 11

Add:

```text
Kubernetes
```

### Version 12

Add:

```text
Dynamic Jenkins agents
```

### Version 13

Add:

```text
SAST
SCA
Container scanning
Secret scanning
```

### Version 14

Add:

```text
Prometheus
Grafana
CloudWatch
```

### Version 15

Add:

```text
Jenkins Shared Library
JCasC
RBAC
```

At that point you have something much closer to a **real DevOps portfolio project** rather than a collection of Jenkins tutorials.

---

# Your Jenkins lab infrastructure

For your particular learning path, I'd eventually aim for:

```text
                 GitHub
                    │
                 Webhook
                    │
                    ▼
          ┌──────────────────┐
          │ Jenkins Controller│
          │      Linux       │
          └────────┬─────────┘
                   │
       ┌───────────┼────────────┐
       │           │            │
       ▼           ▼            ▼
   Linux Agent  Windows     Docker Agent
       │         Agent           │
       │                         │
       └────────────┬────────────┘
                    ▼
               AWS Services
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
         ECR       EC2       EKS
          │         │         │
          └─────────┼─────────┘
                    ▼
              Application
                    │
                    ▼
          Monitoring / Alerts
```

And locally:

```text
Windows 11
│
├── WSL2 Ubuntu
│    ├── Jenkins
│    ├── Git
│    ├── AWS CLI
│    └── Terraform
│
├── Docker Desktop
│
└── Windows Jenkins Agent
```

Later move the controller/agents to AWS so you learn the difference between a **lab topology** and a **cloud-hosted Jenkins topology**.

---

# One important rule for this roadmap

At every phase, don't just learn:

> **"What syntax does Jenkins use?"**

Learn these four things:

```text
1. What problem does this feature solve?
2. How does Jenkins actually execute it?
3. Where would a production team use it?
4. What happens when it fails?
```

For example, when learning `agent`:

```text
Syntax:
agent { label 'linux' }

Problem:
Where should this workload execute?

Production:
Different build environments

Failure:
Agent unavailable / disconnected

Advanced:
Dynamic Kubernetes agents
```

That mindset will make the Jenkins knowledge much more useful in interviews and real DevOps work.

If you follow this roadmap sequentially, **Phases 0–13 are the core Jenkins/CI foundation, 14–20 are practical DevOps CI/CD, and 21–30 are the advanced production track.**
