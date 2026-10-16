# Setting Up an EC2 Instance as a Jenkins Docker Agent

## 1. Overview

This guide covers how I connected an existing Ubuntu EC2 instance to my Jenkins controller running on Windows. The goal was to use the EC2 instance as a remote build agent, run Docker commands through Jenkins, and access AWS services such as EC2, ECS, and ECR without storing permanent AWS access keys.

### My setup

| Component | Configuration |
|---|---|
| Jenkins Controller | Windows laptop |
| Jenkins Agent | Existing Ubuntu EC2 instance |
| Connection method | SSH |
| Linux user | `jenkins` |
| Agent workspace | `/home/jenkins/agent` |
| Container runtime | Docker |
| AWS authentication | EC2 IAM role |
| AWS services | EC2, ECS, ECR |
| Jenkins node label | `ec2-docker` |

### How everything connects

```text
Windows Laptop
└── Jenkins Controller
    ├── Jenkins Credentials
    │   └── SSH private key
    │
    └── SSH connection (port 22)
        └── Ubuntu EC2 Instance
            ├── Jenkins Agent
            ├── Java
            ├── Docker Engine
            ├── AWS CLI
            └── EC2 IAM Role
                ├── EC2
                ├── ECS
                └── ECR
```

There are two separate authentication flows:

- **Jenkins to EC2:** Jenkins uses an SSH private key to connect to the remote machine.
- **EC2 to AWS:** The instance uses its attached IAM role to obtain temporary AWS credentials.

Keeping these separate makes the setup easier to manage and avoids hardcoding AWS access keys in pipeline scripts.

## 2. Prerequisites

Before starting, make sure you have:

- A working Jenkins controller installed on Windows.
- An existing Ubuntu EC2 instance with Docker installed.
- SSH access to the EC2 instance.
- Administrator access to Jenkins.
- Permission to manage EC2 security groups and IAM roles.
- Network connectivity from your Windows laptop to the EC2 instance on port `22`.

Throughout this guide, replace placeholders such as `YOUR_EC2_PUBLIC_IP` and `YOUR_AWS_REGION` with your actual values.

Do not commit private keys, credentials, or sensitive infrastructure details to GitHub.

## 3. Configure SSH access to EC2

### Step 1: Check the EC2 security group

Open the EC2 instance in the AWS Console and navigate to its attached security group.

Make sure the inbound rules allow SSH access:

| Setting | Value |
|---|---|
| Protocol | TCP |
| Port | `22` |
| Source | Your Windows laptop's public IP, using `/32` |

Avoid opening SSH to `0.0.0.0/0`. If you use a private IP instead of a public IP, your Windows laptop must have a secure network path to the VPC.

### Step 2: Connect to Ubuntu

Open PowerShell on Windows and connect using your existing EC2 SSH key.

```powershell
ssh -i "$HOME\.ssh\YOUR_EXISTING_KEY.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

Once connected, check whether Java, Docker, and SSH are installed and running.

```bash
java -version
docker --version

sudo systemctl status ssh --no-pager
sudo systemctl status docker --no-pager
```

Install any missing software before proceeding. The Java runtime must be compatible with your Jenkins controller and agent versions.

For example, on an Ubuntu version that provides OpenJDK 21:

```bash
sudo apt update

sudo apt install -y \
    openssh-server \
    openjdk-21-jre-headless \
    curl \
    unzip

sudo systemctl enable --now ssh
```

If Java 21 is unavailable or incompatible with your Jenkins version, install a supported Java runtime instead.

### Step 3: Create a dedicated Jenkins user

Rather than running Jenkins builds through the default `ubuntu` account, create a separate Linux user for the agent.

```bash
sudo adduser --disabled-password --gecos "" jenkins

sudo mkdir -p /home/jenkins/agent

sudo chown -R jenkins:jenkins /home/jenkins/agent
```

This account will run Jenkins jobs and store their workspace files.

### Step 4: Give the Jenkins user Docker access

Add the new user to the Docker group:

```bash
sudo usermod -aG docker jenkins

sudo systemctl enable --now docker
```

Check that Docker is running:

```bash
sudo systemctl status docker --no-pager
```

Then test Docker access as the Jenkins user:

```bash
sudo -iu jenkins

docker ps

exit
```

If you receive a permission error, check Docker's service status, socket permissions, and the user's group membership. Reconnect the user session after changing group membership.

**Security note:** Access to the Docker socket is effectively root-level access to the EC2 host. Only run trusted jobs on this agent.

## 4. Generate a dedicated SSH key for Jenkins

Jenkins needs its own SSH key to connect to the EC2 agent. This is separate from the key you already use to access EC2 as `ubuntu`.

### Step 1: Generate the key pair

Run the following command in Windows PowerShell:

```powershell
ssh-keygen -t ed25519 -f "$HOME\.ssh\jenkins_ec2_agent" -C "jenkins-ec2-agent"
```

This creates two files:

| File | Purpose |
|---|---|
| `jenkins_ec2_agent` | Private key — keep it secret |
| `jenkins_ec2_agent.pub` | Public key — install it on EC2 |

For a lab, you can use a key without a passphrase. If you use a passphrase, configure the credential accordingly in Jenkins.

### Step 2: Copy the public key

Display the public key:

```powershell
Get-Content "$HOME\.ssh\jenkins_ec2_agent.pub"
```

Copy the entire line beginning with `ssh-ed25519`.

You will install this public key on EC2. The private key will remain on your Windows machine and be stored in Jenkins Credentials.

### Step 3: Install the public key on EC2

Connect to EC2 using your existing `ubuntu` account:

```powershell
ssh -i "$HOME\.ssh\YOUR_EXISTING_KEY.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

Create the SSH directory for the Jenkins user:

```bash
sudo install -d \
    -m 700 \
    -o jenkins \
    -g jenkins \
    /home/jenkins/.ssh
```

Open the authorized keys file:

```bash
sudo nano /home/jenkins/.ssh/authorized_keys
```

Paste the public key you copied from Windows, save the file, and set the correct permissions:

```bash
sudo chown jenkins:jenkins /home/jenkins/.ssh/authorized_keys

sudo chmod 600 /home/jenkins/.ssh/authorized_keys
```

### Step 4: Test the new SSH key

Exit the current EC2 session and run this from PowerShell:

```powershell
ssh -i "$HOME\.ssh\jenkins_ec2_agent" jenkins@YOUR_EC2_PUBLIC_IP
```

If the connection succeeds, the dedicated SSH key is working.

Never copy the private key to EC2 or commit it to your repository.

## 5. Add the SSH key to Jenkins Credentials

Jenkins needs access to the private key so it can connect to the remote agent.

Open Jenkins in your browser and navigate to:

**Manage Jenkins → Credentials → System → Global credentials → Add Credentials**

The exact menu names may vary slightly by version.

Configure the credential as follows:

| Field | Value |
|---|---|
| Kind | SSH Username with private key |
| ID | `ec2-jenkins-agent-key` |
| Username | `jenkins` |
| Private Key | Enter directly |
| Passphrase | Leave empty if the key has no passphrase |

To display the private key in PowerShell:

```powershell
Get-Content "$HOME\.ssh\jenkins_ec2_agent"
```

Copy the complete private key, including its `BEGIN` and `END` lines, into the Jenkins credential form. Do not use the `.pub` file in this field.

Save the credential. Jenkins will use it when establishing the SSH connection.

## 6. Install the SSH Build Agents plugin

Jenkins needs the SSH Build Agents plugin to launch a remote agent over SSH.

1. Open **Manage Jenkins → Plugins**.
2. Go to Available plugins.
3. Search for **SSH Build Agents**.
4. Install it if it is not already installed.
5. Complete any required restart or reload.

Once installed, Jenkins can connect to the Ubuntu instance and start the agent process remotely.

## 7. Register EC2 as a Jenkins node

Now that SSH authentication is ready, configure the EC2 instance in Jenkins.

Navigate to:

**Manage Jenkins → Nodes → New Node**

Create a permanent agent and use these settings:

| Setting | Value |
|---|---|
| Node name | `ec2-docker-agent` |
| Node type | Permanent Agent |
| Number of executors | `1` |
| Remote root directory | `/home/jenkins/agent` |
| Labels | `ec2-docker` |
| Usage | Only build jobs with matching labels |
| Launch method | Launch agents via SSH |
| Host | `YOUR_EC2_PUBLIC_IP` |
| Credentials | `jenkins (ec2-jenkins-agent-key)` |
| Port | `22` |
| Host key verification | Verified host-key strategy |

### Host key verification

There are two different SSH key concepts to understand:

- The **client private key** authenticates Jenkins as the `jenkins` Linux user.
- The **server host key** allows Jenkins to verify that it is connecting to the expected EC2 machine.

You can inspect the EC2 server's ED25519 host-key fingerprint by running:

```bash
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Verify the fingerprint through a trusted channel before accepting it. Follow the format required by your installed SSH Build Agents plugin when configuring host-key verification.

Avoid disabling host-key verification in production.

### Verify the connection

Save the node configuration and open:

**Manage Jenkins → Nodes → ec2-docker-agent**

The node should eventually show as **Online**.

If it remains offline, inspect the node log for SSH authentication errors, host-key issues, Java problems, or workspace permission errors.

## 8. Configure the EC2 IAM role for AWS access

The Jenkins agent now has SSH access and Docker support. The next step is to let it interact with AWS services.

Instead of storing long-lived AWS access keys on the instance, attach an IAM role to EC2. AWS provides temporary credentials through the instance metadata service.

### Step 1: Create an IAM role

Open the AWS Console and navigate to:

**IAM → Roles → Create role**

Choose these settings:

| Setting | Value |
|---|---|
| Trusted entity type | AWS service |
| Use case | EC2 |
| Role name | `JenkinsEC2AgentRole` |

Create the role with the EC2 service trust relationship.

The trust policy allows EC2 to assume the role. The permissions attached to the role determine what the agent can do in AWS.

### Step 2: Assign EC2, ECS, and ECR permissions

For a lab, the following AWS-managed policies provide broad access for demonstrations:

- `AmazonEC2FullAccess`
- `AmazonECS_FullAccess`
- `AmazonEC2ContainerRegistryFullAccess`

Attach only the policies needed for your lab.

**Important:** These are broad permissions, not a recommended production configuration. A pipeline running on this agent may be able to modify or delete AWS resources within the role's permissions.

For production, create least-privilege policies that permit only the required actions on the required resources.

The services serve different purposes:

| Service | Typical use |
|---|---|
| EC2 | Inspect or manage instances and related resources |
| ECS | Inspect clusters, services, tasks, and deployments |
| ECR | Authenticate Docker and push or pull container images |

ECR permissions do not automatically grant permission to deploy an ECS service. ECS deployment operations may also require specific ECS actions and `iam:PassRole` permissions for the relevant task or execution roles.

### Step 3: Attach the role to the existing instance

Navigate to:

**EC2 → Instances → Select your instance → Actions → Security → Modify IAM role**

Select `JenkinsEC2AgentRole` and update the configuration.

AWS associates the role with the instance through an instance profile. Once attached, the AWS CLI on the instance can obtain temporary credentials automatically.

You do not need to create permanent AWS access keys for this setup.

## 9. Install and configure AWS CLI v2

The AWS CLI allows Jenkins jobs to run AWS commands from the EC2 agent.

For an x86-64 Ubuntu instance, install it using:

```bash
cd /tmp

curl -fsSL \
    "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" \
    -o awscliv2.zip

unzip -q awscliv2.zip

sudo ./aws/install

aws --version
```

If your EC2 instance uses ARM64, download the corresponding ARM64 installer instead.

### Verify IAM role authentication

Switch to the Jenkins user:

```bash
sudo -iu jenkins
```

Run:

```bash
aws sts get-caller-identity
```

The output should identify the assumed IAM role. For example, the ARN should resemble:

```text
arn:aws:sts::ACCOUNT_ID:assumed-role/JenkinsEC2AgentRole/SESSION_NAME
```

Exit the Jenkins user session when finished:

```bash
exit
```

If the command fails, check the following:

- The correct IAM role is attached to the EC2 instance.
- AWS CLI is installed and available in the Jenkins user's `PATH`.
- No environment variables or named AWS profiles are overriding role-based credentials.
- Instance metadata is accessible.
- The role's trust relationship and permissions are configured correctly.

## 10. Test the complete setup through Jenkins

With the node configured and the IAM role attached, run a test build to verify that Jenkins can execute commands on EC2.

Keep the pipeline code in a separate `Jenkinsfile` in this project folder. The test should cover three things:

1. **Agent connectivity:** Confirm the job runs on the EC2 instance, under the `jenkins` user, and that Java is available.
2. **Docker access:** Check the Docker version, list containers, and run the `hello-world` container.
3. **AWS authentication:** Check the AWS CLI version and run `aws sts get-caller-identity`.

Use the node label `ec2-docker` so the job runs on the intended EC2 agent.

After starting the build, inspect Console Output. The test is successful when:

- The job runs on the EC2 instance rather than the Windows controller.
- `whoami` prints `jenkins`.
- Docker commands run successfully.
- The `hello-world` container completes.
- AWS STS identifies the attached IAM role.

If the build stays queued, check whether the node is online and whether the job's label matches the node label.

## 11. Verify EC2, ECS, and ECR permissions

Once the role is working, test the permissions required by your project. Run these read-only commands from the EC2 agent, replacing `YOUR_AWS_REGION` with the intended AWS region.

**EC2**

```bash
aws ec2 describe-instances \
    --region YOUR_AWS_REGION \
    --max-results 5
```

**ECS**

```bash
aws ecs list-clusters \
    --region YOUR_AWS_REGION
```

**ECR**

```bash
aws ecr describe-repositories \
    --region YOUR_AWS_REGION \
    --max-results 5
```

If a command returns `AccessDenied`, review the IAM permissions, resource policies, and region.

A successful read-only command confirms that the relevant read operation works. It does not prove that every write or deployment operation is permitted.

## 12. Authenticate Docker to ECR

Having AWS CLI authentication does not automatically log Docker in to Amazon ECR.

Before pushing an image, authenticate Docker to the correct registry:

```bash
export AWS_REGION="YOUR_AWS_REGION"
export AWS_ACCOUNT_ID="YOUR_AWS_ACCOUNT_ID"
export ECR_REPOSITORY="YOUR_ECR_REPOSITORY"

aws ecr get-login-password \
    --region "$AWS_REGION" \
    | docker login \
        --username AWS \
        --password-stdin \
        "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
```

Build the image:

```bash
docker build -t "$ECR_REPOSITORY:latest" .
```

Tag it for ECR:

```bash
docker tag "$ECR_REPOSITORY:latest" \
    "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest"
```

Push it:

```bash
docker push \
    "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest"
```

The ECR repository must already exist unless the role has permission to create it. The role must also have the required ECR upload permissions. Cross-account access may require an appropriate repository policy.

Avoid printing registry passwords or other secrets in Jenkins build logs.

## 13. Keep the Jenkins node reachable after a restart

If the EC2 instance uses an automatically assigned public IPv4 address, that address normally changes after a stop/start operation. A regular reboot generally preserves it.

If Jenkins cannot reach the instance after it restarts, check the current IP address and update the node configuration if necessary.

There are three common options:

**Option 1: Use an Elastic IP**

Allocate an Elastic IP, associate it with the EC2 instance, and update the Jenkins node's Host field. This gives you a stable public IPv4 address while it remains associated with the instance. Check AWS pricing before using one.

**Option 2: Use private networking**

If your Windows controller can securely reach the VPC through a VPN or another private network connection, configure the node to use the EC2 private IP. This avoids exposing the agent through a public SSH endpoint.

**Option 3: Update the IP manually**

For a lab, you can keep using the automatically assigned public IP and update the Jenkins node configuration after each stop/start when the address changes.

After the instance starts, check the required services:

```bash
sudo systemctl status ssh --no-pager
sudo systemctl status docker --no-pager
```

Once networking is available, Jenkins should reconnect to the node. If it does not, inspect the connection log.

## 14. Monitor disk usage on the EC2 agent

Docker images, container layers, build caches, and Jenkins workspaces can gradually consume the instance's disk space.

Check disk usage before deleting anything:

```bash
df -h
df -hT /
df -i
lsblk

docker system df

sudo du -xhd1 / 2>/dev/null | sort -h

sudo du -sh /home/jenkins/agent /var/lib/docker 2>/dev/null
```

These commands help identify whether the problem comes from Docker storage, Jenkins workspaces, or another directory.

### Basic cleanup

You can remove cached package files and unused packages:

```bash
sudo apt clean
sudo apt autoremove
```

To remove unused Docker build cache:

```bash
docker builder prune
```

Review the prompt before confirming cleanup.

Avoid running `docker system prune -a` or `docker volume prune` without checking what will be removed. These commands can delete images, caches, or volumes you still need.

### Increase the EBS volume size

If the root volume is too small for your builds:

1. Consider creating an EBS snapshot before making changes.
2. Open **EC2 → Volumes** in the AWS Console.
3. Select the root volume and choose **Actions → Modify volume**.
4. Increase the volume size and wait for the modification to progress.
5. Check the partition and filesystem layout inside Ubuntu.
6. Extend the partition and filesystem using commands appropriate for the actual layout.

Do not run resize commands blindly. Check `lsblk` and `df -hT /` first.

## 15. Troubleshooting

| Problem | What to check |
|---|---|
| Jenkins node is offline | IP address, port 22, security group, SSH key, Java, host-key verification |
| SSH permission denied | Username, `authorized_keys`, file permissions, Jenkins credential |
| Docker permission denied | Docker service, group membership, socket permissions, agent reconnection |
| AWS CLI not found | Installation and Jenkins user's `PATH` |
| AWS identity check fails | IAM role, instance metadata, environment variables, AWS configuration |
| AWS returns `AccessDenied` | IAM policies, resource policies, region, required actions |
| ECR push fails | Registry URI, Docker login, repository existence, ECR permissions |
| ECS deployment fails | ECS permissions, cluster, service, task definition, required `iam:PassRole` |
| EC2 disk is full | Disk usage, Docker storage, Jenkins workspaces, EBS size |
| Node does not reconnect | Current IP address, SSH service, network reachability, Jenkins node logs |

## 16. Security checklist

Before using this setup for more than a basic lab, review these points:

- [ ] SSH access is restricted to trusted sources.
- [ ] Jenkins connects using a dedicated Linux user.
- [ ] The SSH private key is stored in Jenkins Credentials.
- [ ] SSH host-key verification is enabled and verified.
- [ ] The intended IAM role is attached to the EC2 instance.
- [ ] AWS permissions are restricted to the actions and resources required.
- [ ] Permanent AWS access keys are not hardcoded in pipeline scripts.
- [ ] Only trusted jobs run on the Docker-enabled agent.
- [ ] Docker and Jenkins workspace storage are monitored.
- [ ] Stable networking is configured if required.
- [ ] Broad IAM permissions are removed when no longer needed.

## 17. Final workflow

The complete setup follows this sequence:

1. Prepare the Ubuntu EC2 instance with Java, SSH, and Docker.
2. Create a dedicated `jenkins` Linux user and workspace.
3. Generate a separate SSH key pair on Windows.
4. Add the public key to the EC2 user's `authorized_keys`.
5. Store the private key in Jenkins Credentials.
6. Install the SSH Build Agents plugin.
7. Register EC2 as a permanent Jenkins node.
8. Create an IAM role and attach it to the instance.
9. Install AWS CLI v2 and verify the role identity.
10. Run a Jenkins pipeline to test connectivity, Docker, and AWS authentication.
11. Verify the required EC2, ECS, and ECR permissions.
12. Configure ECR authentication when image publishing is required.
13. Check networking, disk usage, and security before expanding the setup.

**The key takeaway:** SSH credentials let Jenkins connect to the EC2 agent. The EC2 IAM role lets processes running on that agent access AWS services. These are separate responsibilities, and both must be configured correctly for the complete workflow to work.

