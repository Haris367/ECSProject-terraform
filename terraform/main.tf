# Get account id
data "aws_caller_identity" "current" {}

module "vpc" {
  source       = "./modules/vpc"
  vpc_cidr     = var.vpc_cidr
  public_subnets = var.public_subnets
}

module "ecr" {
  source = "./modules/ecr"
  name   = var.repo_name
}

module "ecs" {
  source         = "./modules/ecs"
  cluster_name   = "node-app-cluster"
  repo_url       = module.ecr.repository_url
  image_tag      = var.image_tag
  vpc_id         = module.vpc.vpc_id
  public_subnets = module.vpc.public_subnets
  aws_account_id = data.aws_caller_identity.current.account_id
}