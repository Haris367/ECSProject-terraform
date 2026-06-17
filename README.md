# ECS Project - Terraform

A production-ready Infrastructure-as-Code (IaC) project that automates the deployment of a Node.js Express application to AWS ECS (Elastic Container Service) using Terraform and GitHub Actions.

## Project Overview

This repository contains:
- **Node.js Express Application**: A simple REST API running on port 3000
- **Docker**: Multi-stage containerized build using Alpine Linux
- **Terraform**: AWS infrastructure provisioning (VPC, ECR, ECS Fargate)
- **GitHub Actions**: Automated CI/CD pipeline for build, test, and deploy

## Tech Stack

| Component | Version |
|-----------|---------|
| Node.js | 18+ (Alpine) |
| Express | 4.18.2 |
| Docker | Multi-stage build |
| Terraform | >= 1.5.7 |
| AWS Provider | v6.0 |
| AWS Services | ECS Fargate, ECR, VPC, CloudWatch, IAM |

## Project Structure

```
.
├── app/                           # Node.js application
│   ├── index.js                  # Express server entry point
│   ├── package.json              # Dependencies
│   └── package-lock.json
├── docker/                        # Container configuration
│   └── Dockerfile                # Multi-stage Alpine build
├── terraform/                     # Infrastructure as Code
│   ├── main.tf                   # Module orchestration
│   ├── provider.tf               # AWS provider configuration
│   ├── backend.tf                # S3 state backend
│   ├── variables.tf              # Input variables
│   ├── outputs.tf                # Output values
│   └── modules/
│       ├── vpc/                  # VPC networking
│       ├── ecr/                  # Elastic Container Registry
│       └── ecs/                  # ECS cluster and service
├── .github/
│   └── workflows/
│       └── deployment.yml        # CI/CD pipeline
└── README.md                      # This file
```

## Prerequisites

### Local Development
- **Node.js** >= 18
- **Docker** (for building and testing images locally)
- **Terraform** >= 1.5.7
- **AWS CLI** (optional, for manual testing)

### AWS Setup
1. **AWS Account** with appropriate permissions
2. **S3 Bucket**: Create a bucket to store Terraform state (e.g., `your-terraform-states`)
   - Enable versioning and encryption for security
3. **IAM Credentials**: AWS access key ID and secret access key
4. **GitHub Secrets**: Add the following to your GitHub repository:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION` (e.g., `us-east-1`)
   - `AWS_ACCOUNT_ID`

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/ECSProject-terraform.git
cd ECSProject-terraform
```

### 2. Install Dependencies
```bash
cd app
npm ci  # Install exact versions from package-lock.json
cd ..
```

### 3. Test Application Locally
```bash
cd app
node index.js
# App will run on http://localhost:3000
# Output: "NodeJS App deployed on ECS"
```

### 4. Build and Test Docker Image
```bash
# Build Docker image locally
docker build -f docker/Dockerfile -t node-app:latest .

# Run container
docker run -p 3000:3000 node-app:latest

# Test in another terminal
curl http://localhost:3000
```

## Deploying to AWS

### Step 1: Configure AWS Credentials
```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID="123456789012"
```

### Step 2: Update Terraform Configuration
Edit `terraform/backend.tf` and update the S3 bucket name to your bucket:
```hcl
terraform {
  backend "s3" {
    bucket         = "your-terraform-states"  # Change this to your bucket
    key            = "ecs-project/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

### Step 3: Initialize Terraform
```bash
cd terraform
terraform init
```

### Step 4: Plan and Deploy
```bash
# Generate deployment plan
terraform plan -var="image_tag=manual-deploy-1"

# Apply the plan
terraform apply -var="image_tag=manual-deploy-1"
```

Terraform will provision:
- VPC with public subnets across multiple availability zones
- ECR repository for Docker images
- ECS Fargate cluster
- ECS task definition and service
- CloudWatch log group
- Security group allowing traffic on port 3000

## CI/CD Pipeline

The GitHub Actions workflow is triggered automatically on push to the `main` branch.

### Pipeline Flow

```
┌─────────────────────────────────────────────┐
│ 1. Push to main branch                      │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ 2. build-and-plan Job                       │
│ - Checkout code                             │
│ - Configure AWS credentials                 │
│ - Build Docker image                        │
│ - Push to ECR (latest + versioned tag)      │
│ - Run terraform plan                        │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ 3. Manual Approval Required                 │
│ (Review terraform plan in GitHub UI)        │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ 4. terraform-apply Job                      │
│ - Run terraform apply                       │
│ - Update ECS service with new image         │
│ - Deployment complete                       │
└─────────────────────────────────────────────┘
```

### Manual Workflow Trigger
Go to **Actions** → **Deployment Workflow** → **Run workflow** to manually trigger the pipeline.

## AWS Infrastructure Created

| Resource | Details |
|----------|---------|
| **VPC** | 10.0.0.0/16 with 2 public subnets |
| **ECR Repository** | Docker image registry |
| **ECS Cluster** | Fargate launch type |
| **ECS Service** | 1 desired task with auto-assign public IP |
| **Task Definition** | 256 CPU units, 512 MB memory |
| **CloudWatch Logs** | 14-day retention log group |
| **Security Group** | Allows inbound traffic on port 3000 |
| **IAM Roles** | ECS task execution role with necessary permissions |

## Monitoring and Logs

View ECS logs in CloudWatch:
```bash
aws logs tail /ecs/node-app-cluster --follow
```

Check ECS service status:
```bash
aws ecs describe-services \
  --cluster node-app-cluster \
  --services node-app-service
```

## Production Considerations

- **Security Group**: Currently allows public access on port 3000. Restrict to specific IPs/security groups in production.
- **Task Count**: Increase `desired_count` in ECS service for high availability and load balancing.
- **Load Balancer**: Consider adding an Application Load Balancer (ALB) for production workloads.
- **Auto Scaling**: Enable auto-scaling policies based on CPU/memory metrics.
- **Logging**: Extend CloudWatch retention policy and consider using centralized logging solutions.
- **Secrets Management**: Use AWS Secrets Manager for sensitive data instead of environment variables.

## Troubleshooting

### Terraform Init Fails
- Ensure S3 bucket exists and you have permissions
- Verify AWS credentials are correctly set

### Docker Build Fails
- Check Node.js version compatibility
- Verify Docker daemon is running

### GitHub Actions Fails
- Verify all GitHub secrets are correctly set
- Check AWS IAM permissions for the credentials used

### ECS Service Won't Start
- Check CloudWatch logs for errors
- Verify security group allows inbound traffic
- Ensure task CPU/memory allocation is sufficient

## Contributing

1. Create a new branch for your changes
2. Test locally before pushing
3. Push to trigger GitHub Actions pipeline
4. Review terraform plan output
5. Approve deployment when ready

## License

MIT

## Support

For issues or questions, please open a GitHub issue.
