variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "image_tag" {
  type = string
  description = "Image tag to deploy (example: build-42)"
}

variable "repo_name" {
  type    = string
  default = "node-app"
}

# VPC related
variable "vpc_cidr" { 
  type = string
  default = "10.0.0.0/16"
}

variable "public_subnets" { 
  type = list(string)
  default = ["10.0.1.0/24","10.0.2.0/24"] 
}