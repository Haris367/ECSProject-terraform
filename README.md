# ECS Project with Terraform

A small Node.js website packaged as a Docker image and deployed to Amazon ECS on Fargate. Terraform describes the AWS infrastructure, and GitHub Actions builds and publishes the image before planning and applying infrastructure changes.

The app is intentionally a simple demo: the home page is static HTML served by Express, with a JSON health endpoint at `/health`. There is no frontend build step, database, or application API beyond health status.

## Project scope

- **Application:** Express serves a responsive landing page at `/` and service status at `/health` on port `3000`.
- **Container:** `docker/Dockerfile` installs production dependencies and runs the Node.js app.
- **Infrastructure:** Terraform creates a VPC with public subnets and internet access, an ECR repository, and an ECS Fargate cluster, task, and service. The service runs one task with 256 CPU units and 512 MiB memory.
- **Logs:** ECS sends container logs to a CloudWatch log group with 14-day retention.
- **Automation:** `.github/workflows/deployment.yml` builds and pushes an image on pushes to `main` (or a manual workflow run), runs Terraform plan, then runs apply in the GitHub `Stage` environment. Configure environment protection rules in GitHub if reviewer approval is required.

## Repository layout

```text
.
├── app/
│   ├── index.js                 # Express website and health endpoint
│   ├── package.json
│   └── package-lock.json
├── docker/
│   └── Dockerfile               # Container image definition
├── terraform/
│   ├── backend.tf               # S3 remote state configuration
│   ├── main.tf                  # VPC, ECR, and ECS module wiring
│   ├── provider.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── modules/
│       ├── vpc/                 # VPC, public subnets, routes
│       ├── ecr/                 # Container image repository
│       └── ecs/                 # Fargate cluster, service, task, IAM, logs
└── .github/workflows/
    └── deployment.yml           # Build, push, plan, and apply workflow
```

## Run locally

Requirements: Node.js and npm. Docker is optional for running the app directly.

```sh
cd app
npm ci
node index.js
```

Open `http://localhost:3000` for the landing page and `http://localhost:3000/health` for JSON status. Set `PORT` to change the listening port. `IMAGE_TAG` controls the image label shown on the page and returned by the health endpoint; it defaults to `local`.

To build and run the container from the repository root:

```sh
docker build -f docker/Dockerfile -t northstar-ecs-demo .
docker run --rm -p 3000:3000 northstar-ecs-demo
```

## AWS deployment

### Prerequisites

- An AWS account and credentials authorized to manage the resources in the Terraform configuration, ECR images, and ECS deployments.
- Terraform CLI compatible with the AWS provider constraint in `terraform/provider.tf` (`~> 6.0`).
- An S3 bucket named `haris-terraform-states` in `us-east-1` for the configured remote state backend. The bucket must exist before `terraform init`.
- A GitHub repository configured with the Actions secrets `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and `AWS_ACCOUNT_ID`.
- An ECR repository whose name matches the workflow's computed name: the lowercase GitHub repository owner followed by `-node-app`. The Terraform `repo_name` default is `haris367-node-app`; change it if it does not match your owner, or update the workflow so both use the same repository name.

The workflow uses access keys to configure AWS credentials. Its permissions also include `id-token: write`, but the current credentials step is configured with access key secrets rather than role assumption through OIDC.

### Manual Terraform workflow

Build and push an image to the ECR repository first, then initialize and deploy Terraform:

```sh
cd terraform
terraform init
terraform plan -var="image_tag=build-1"
terraform apply -var="image_tag=build-1"
```

Terraform requires `image_tag`; it selects the image used by the ECS task definition. AWS credentials and the configured backend bucket must be available to the Terraform process. Review the plan before applying it.

### GitHub Actions workflow

On a push to `main` or a manual run, the workflow:

1. Authenticates to AWS and logs in to ECR.
2. Builds the Docker image and pushes the run-number tag and `latest` tag.
3. Initializes Terraform and creates a plan for that run-number image tag.
4. Runs `terraform apply` from a second job using the `Stage` GitHub environment.

The second job applies automatically unless the `Stage` environment is configured with required reviewers or other protection rules. The plan and apply jobs each initialize Terraform independently; the workflow does not pass a saved plan file between them.

## Terraform resources

| Area | Resources and defaults |
| --- | --- |
| Networking | VPC `10.0.0.0/16`, two public subnets, internet gateway, public routes |
| Image registry | Mutable ECR repository; default name `haris367-node-app` |
| Compute | ECS cluster `node-app-cluster`, Fargate service with one task, 256 CPU units, 512 MiB |
| Network access | Public IP assigned to the task; security group allows inbound TCP port 3000 from `0.0.0.0/0` |
| Logs and IAM | CloudWatch log group with 14-day retention; ECS task execution role |
| State | S3 backend configured in `terraform/backend.tf` for `node-app/terraform.tfstate` in `us-east-1` |

The service has no load balancer or autoscaling configuration. Once a task is running, its public IP can be used with port `3000` to reach the page. Task public IPs can change when tasks are replaced.

## Outputs and logs

Terraform outputs the ECR repository URL and ECS cluster ID. The ECS service name is `node-app-cluster-service`; task logs are written under `/ecs/node-app-cluster`.

```sh
aws logs tail /ecs/node-app-cluster --follow --region us-east-1
```

## Configuration notes

- The Terraform backend bucket is hard-coded in `terraform/backend.tf`; create it or edit the backend block before initialization.
- `aws_region` defaults to `us-east-1`. The ECS module currently has its own `aws_region` default, so if deploying elsewhere, pass the same region to the module in `terraform/main.tf` as well as configuring the provider and backend appropriately.
- Terraform's default ECR name and the workflow's owner-derived ECR name must agree for image pushes and task definitions to refer to the same repository.
- The task's port is open to the internet. Restrict ingress or add a load balancer and suitable access controls before using this configuration for a public production service.
- The workflow runs Terraform apply with `-auto-approve`; use GitHub environment protection rules and review the plan job output to control deployments.

## License

No license file is currently included in this repository.
